const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farmtracker-animal-service-test-'));
process.env.FARMTRACKER_DB_PATH = path.join(tempDir, 'farmtracker.db');

const { db, initDb } = require('../../db');
const animalService = require('../../services/animalService');
const paddockRepository = require('../../repositories/paddockRepository');
const { ConflictError } = require('../../lib/errors');

let northId;
let southId;

before(() => {
  initDb();
  db.exec('DELETE FROM weights; DELETE FROM health_events; DELETE FROM animals; DELETE FROM paddocks;');

  northId = paddockRepository.createPaddock('North Service Paddock', 2).id;
  southId = paddockRepository.createPaddock('South Service Paddock', 2).id;

  animalService.createAnimal({
    name: 'Bella',
    tag_number: 'SVC-TAG-001',
    paddock_id: northId,
  });
  animalService.createAnimal({
    name: 'Daisy',
    tag_number: 'SVC-TAG-002',
    paddock_id: southId,
  });
});

after(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('animal service keeps paddock counts consistent during reassignment', () => {
  const beforeNorth = paddockRepository.findPaddockById(northId);
  const beforeSouth = paddockRepository.findPaddockById(southId);

  const bella = animalService.listAnimals(0, 10).find(animal => animal.tag_number === 'SVC-TAG-001');
  assert.ok(bella);

  animalService.updateAnimal(bella.id, { paddock_id: southId });

  const afterNorth = paddockRepository.findPaddockById(northId);
  const afterSouth = paddockRepository.findPaddockById(southId);

  assert.equal(afterNorth.animal_count, beforeNorth.animal_count - 1);
  assert.equal(afterSouth.animal_count, beforeSouth.animal_count + 1);
});

test('animal service rolls back count changes when create conflicts', () => {
  const beforeNorth = paddockRepository.findPaddockById(northId);

  assert.throws(() => {
    animalService.createAnimal({
      name: 'Duplicate',
      tag_number: 'SVC-TAG-001',
      paddock_id: northId,
    });
  }, ConflictError);

  const afterNorth = paddockRepository.findPaddockById(northId);
  assert.equal(afterNorth.animal_count, beforeNorth.animal_count);
});
