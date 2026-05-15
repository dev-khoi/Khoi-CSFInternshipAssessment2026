const { db } = require('../db');

function listWeightsByAnimalId(animalId) {
  return db.prepare(
    'SELECT * FROM weights WHERE animal_id = ? ORDER BY date DESC, id DESC'
  ).all(animalId);
}

function createWeight(animalId, weightKg, date, notes) {
  const result = db.prepare(
    'INSERT INTO weights (animal_id, weight_kg, date, notes) VALUES (?, ?, ?, ?)'
  ).run(animalId, weightKg, date, notes);

  return db.prepare('SELECT * FROM weights WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = {
  listWeightsByAnimalId,
  createWeight,
};
