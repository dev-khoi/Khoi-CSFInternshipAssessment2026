const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'farmtracker-weight-service-test-'));
process.env.FARMTRACKER_DB_PATH = path.join(tempDir, 'farmtracker.db');

const { db, initDb } = require('../../db');
const animalService = require('../../services/animalService');
const weightService = require('../../services/weightService');
const { NotFoundError, ValidationError, UnprocessableError } = require('../../lib/errors');

let animalId;

before(() => {
  initDb();
  db.exec('DELETE FROM weights; DELETE FROM health_events; DELETE FROM animals; DELETE FROM paddocks;');

  animalId = animalService.createAnimal({
    name: 'Weight Subject',
    tag_number: 'WEIGHT-SVC-001',
  }).id;
});

after(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('weight service rejects non-positive weights', () => {
  assert.throws(() => {
    weightService.createWeight(animalId, {
      weight_kg: 0,
      date: '2024-11-15',
    });
  }, UnprocessableError);
});

test('weight service validates date format', () => {
  assert.throws(() => {
    weightService.createWeight(animalId, {
      weight_kg: 45.5,
      date: '2024-99-99',
    });
  }, ValidationError);
});

test('weight service throws when animal does not exist', () => {
  assert.throws(() => {
    weightService.listWeights(999999);
  }, NotFoundError);
});
