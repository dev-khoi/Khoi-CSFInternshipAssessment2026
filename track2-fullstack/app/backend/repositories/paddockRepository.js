const { db } = require('../db');

function listPaddocks() {
  return db.prepare('SELECT * FROM paddocks').all();
}

function findPaddockById(id) {
  return db.prepare('SELECT * FROM paddocks WHERE id = ?').get(id);
}

function createPaddock(name, capacity) {
  const result = db.prepare(
    'INSERT INTO paddocks (name, capacity) VALUES (?, ?)'
  ).run(name, capacity);
  return findPaddockById(result.lastInsertRowid);
}

function incrementAnimalCount(id) {
  db.prepare('UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?').run(id);
}

function decrementAnimalCount(id) {
  db.prepare('UPDATE paddocks SET animal_count = animal_count - 1 WHERE id = ?').run(id);
}

module.exports = {
  listPaddocks,
  findPaddockById,
  createPaddock,
  incrementAnimalCount,
  decrementAnimalCount,
};
