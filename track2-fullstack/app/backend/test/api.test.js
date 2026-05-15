const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farmtracker-test-'));
process.env.FARMTRACKER_DB_PATH = path.join(tempDir, 'farmtracker.db');

const app = require('../server');
const { db } = require('../db');

let server;
let baseUrl;

before(async () => {
  seedTestData();
  server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function seedTestData() {
  db.exec('DELETE FROM health_events; DELETE FROM animals; DELETE FROM paddocks;');

  const northId = db.prepare(
    'INSERT INTO paddocks (name, capacity, animal_count) VALUES (?, ?, 0)'
  ).run('North Paddock', 50).lastInsertRowid;

  const southId = db.prepare(
    'INSERT INTO paddocks (name, capacity, animal_count) VALUES (?, ?, 0)'
  ).run('South Paddock', 30).lastInsertRowid;

  const insertAnimal = db.prepare(
    'INSERT INTO animals (name, tag_number, breed, date_of_birth, paddock_id) VALUES (?, ?, ?, ?, ?)'
  );

  const bellaId = insertAnimal.run('Bella', 'TAG-001', 'Merino', '2021-03-14', northId).lastInsertRowid;
  insertAnimal.run('Daisy', 'TAG-002', 'Dorper', '2020-07-22', southId);
  insertAnimal.run('Molly', 'TAG-003', 'Merino', '2022-01-05', northId);

  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(northId);
  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(southId);
  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(northId);

  db.prepare(
    'INSERT INTO health_events (animal_id, event_type, notes, date, vet_name) VALUES (?, ?, ?, ?, ?)'
  ).run(bellaId, 'vaccination', 'Routine vaccination', '2024-01-15', 'Dr. Walsh');
}

async function get(path) {
  const res = await fetch(baseUrl + path);
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function put(path, body) {
  const res = await fetch(baseUrl + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('GET /api/paddocks returns an array', async () => {
  const { status, body } = await get('/paddocks');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('GET /api/animals returns animals with latest_health_event field', async () => {
  const { status, body } = await get('/animals?page=0&limit=5');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0);
  assert.ok('latest_health_event' in body[0]);
});

test('GET /api/animals uses page * limit offset for pagination', async () => {
  const firstPage = await get('/animals?page=0&limit=2');
  const secondPage = await get('/animals?page=1&limit=2');

  assert.equal(firstPage.status, 200);
  assert.equal(secondPage.status, 200);
  assert.equal(firstPage.body.length, 2);
  assert.equal(secondPage.body.length, 1);

  const firstPageIds = new Set(firstPage.body.map(animal => animal.id));
  const overlappingIds = secondPage.body.filter(animal => firstPageIds.has(animal.id));
  assert.equal(overlappingIds.length, 0);
});

test('GET /api/animals/:id returns a single animal', async () => {
  const { body: animals } = await get('/animals?page=0&limit=1');
  const id = animals[0].id;
  const { status, body } = await get(`/animals/${id}`);
  assert.equal(status, 200);
  assert.equal(body.id, id);
});

test('GET /api/animals/:id returns 404 for unknown id', async () => {
  const { status } = await get('/animals/999999');
  assert.equal(status, 404);
});

test('POST /api/animals/:id/health-events creates an event', async () => {
  const { body: animals } = await get('/animals?page=0&limit=1');
  const id = animals[0].id;
  const { status, body } = await post(`/animals/${id}/health-events`, {
    event_type: 'checkup',
    date: '2025-01-10',
    vet_name: 'Dr. Test',
  });
  assert.equal(status, 201);
  assert.equal(body.event_type, 'checkup');
  assert.equal(body.animal_id, id);
});

test('PUT /api/animals/:id reassigns paddock and keeps counts consistent', async () => {
  const { body: animals } = await get('/animals?page=0&limit=10');
  const bella = animals.find(animal => animal.tag_number === 'TAG-001');
  assert.ok(bella);

  const { body: paddocksBefore } = await get('/paddocks');
  const northBefore = paddocksBefore.find(paddock => paddock.name === 'North Paddock');
  const southBefore = paddocksBefore.find(paddock => paddock.name === 'South Paddock');
  assert.ok(northBefore);
  assert.ok(southBefore);

  const { status, body } = await put(`/animals/${bella.id}`, { paddock_id: southBefore.id });
  assert.equal(status, 200);
  assert.equal(body.paddock_id, southBefore.id);

  const { body: paddocksAfter } = await get('/paddocks');
  const northAfter = paddocksAfter.find(paddock => paddock.id === northBefore.id);
  const southAfter = paddocksAfter.find(paddock => paddock.id === southBefore.id);

  assert.equal(northAfter.animal_count, northBefore.animal_count - 1);
  assert.equal(southAfter.animal_count, southBefore.animal_count + 1);
});

test('PUT /api/animals/:id without paddock change keeps counts unchanged', async () => {
  const { body: animals } = await get('/animals?page=0&limit=10');
  const daisy = animals.find(animal => animal.tag_number === 'TAG-002');
  assert.ok(daisy);

  const { body: paddocksBefore } = await get('/paddocks');
  const beforeCounts = new Map(paddocksBefore.map(paddock => [paddock.id, paddock.animal_count]));

  const { status, body } = await put(`/animals/${daisy.id}`, { breed: 'Dorper Cross' });
  assert.equal(status, 200);
  assert.equal(body.paddock_id, daisy.paddock_id);

  const { body: paddocksAfter } = await get('/paddocks');
  paddocksAfter.forEach(paddock => {
    assert.equal(paddock.animal_count, beforeCounts.get(paddock.id));
  });
});

test('POST /api/animals returns 404 when paddock_id does not exist', async () => {
  const { status, body } = await post('/animals', {
    name: 'Invalid Paddock Animal',
    tag_number: 'TAG-404-PADDOCK',
    paddock_id: 999999,
  });

  assert.equal(status, 404);
  assert.equal(body.error, 'Paddock not found');
});

test('POST/PUT /api/animals rejects assignment into full paddock with 422', async () => {
  const createPaddock = await post('/paddocks', {
    name: 'Full Test Paddock',
    capacity: 1,
  });
  assert.equal(createPaddock.status, 201);

  const fullPaddockId = createPaddock.body.id;

  const fillPaddock = await post('/animals', {
    name: 'Occupant',
    tag_number: 'TAG-FULL-001',
    paddock_id: fullPaddockId,
  });
  assert.equal(fillPaddock.status, 201);

  const createIntoFull = await post('/animals', {
    name: 'Blocked Create',
    tag_number: 'TAG-FULL-002',
    paddock_id: fullPaddockId,
  });
  assert.equal(createIntoFull.status, 422);
  assert.equal(createIntoFull.body.error, 'Paddock is at capacity');

  const movable = await post('/animals', {
    name: 'Movable Animal',
    tag_number: 'TAG-MOVE-001',
  });
  assert.equal(movable.status, 201);

  const moveIntoFull = await put(`/animals/${movable.body.id}`, {
    paddock_id: fullPaddockId,
  });
  assert.equal(moveIntoFull.status, 422);
  assert.equal(moveIntoFull.body.error, 'Paddock is at capacity');
});

test('POST /api/animals returns 201 on successful create', async () => {
  const { status, body } = await post('/animals', {
    name: 'Created Animal',
    tag_number: 'TAG-201-CREATE',
  });

  assert.equal(status, 201);
  assert.equal(body.name, 'Created Animal');
  assert.equal(body.tag_number, 'TAG-201-CREATE');
});

test('POST /api/animals duplicate tag rolls back paddock count update', async () => {
  const createPaddock = await post('/paddocks', {
    name: 'Rollback Test Paddock',
    capacity: 5,
  });
  assert.equal(createPaddock.status, 201);

  const paddockId = createPaddock.body.id;

  const { body: paddocksBefore } = await get('/paddocks');
  const before = paddocksBefore.find(paddock => paddock.id === paddockId);
  assert.ok(before);
  assert.equal(before.animal_count, 0);

  const duplicateInsert = await post('/animals', {
    name: 'Duplicate Tag Animal',
    tag_number: 'TAG-001',
    paddock_id: paddockId,
  });

  assert.equal(duplicateInsert.status, 409);
  assert.equal(duplicateInsert.body.error, 'tag_number must be unique');

  const { body: paddocksAfter } = await get('/paddocks');
  const after = paddocksAfter.find(paddock => paddock.id === paddockId);
  assert.ok(after);
  assert.equal(after.animal_count, 0);
});
