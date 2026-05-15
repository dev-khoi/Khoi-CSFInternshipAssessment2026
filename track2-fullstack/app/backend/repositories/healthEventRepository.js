const { db } = require('../db');

function listHealthEventsByAnimalId(animalId) {
  return db.prepare(
    'SELECT * FROM health_events WHERE animal_id = ? ORDER BY date DESC'
  ).all(animalId);
}

function createHealthEvent(animalId, eventType, notes, date, vetName) {
  const result = db.prepare(
    'INSERT INTO health_events (animal_id, event_type, notes, date, vet_name) VALUES (?, ?, ?, ?, ?)'
  ).run(animalId, eventType, notes, date, vetName);

  return db.prepare('SELECT * FROM health_events WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = {
  listHealthEventsByAnimalId,
  createHealthEvent,
};
