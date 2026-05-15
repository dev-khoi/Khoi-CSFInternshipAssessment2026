const { db } = require('../db');

function listAnimals(limit, offset) {
  return db.prepare('SELECT * FROM animals LIMIT ? OFFSET ?').all(limit, offset);
}

function findAnimalById(id) {
  return db.prepare('SELECT * FROM animals WHERE id = ?').get(id);
}

function findLatestHealthEventByAnimalId(animalId) {
  return db.prepare(`
    SELECT * FROM health_events
    WHERE animal_id = ?
    ORDER BY date DESC
    LIMIT 1
  `).get(animalId);
}

function createAnimal(name, tagNumber, breed, dateOfBirth, paddockId) {
  const result = db.prepare(
    'INSERT INTO animals (name, tag_number, breed, date_of_birth, paddock_id) VALUES (?, ?, ?, ?, ?)'
  ).run(name, tagNumber, breed, dateOfBirth, paddockId);
  return findAnimalById(result.lastInsertRowid);
}

function updateAnimal(id, updates) {
  db.prepare(`
    UPDATE animals
    SET name = ?, tag_number = ?, breed = ?, date_of_birth = ?, paddock_id = ?
    WHERE id = ?
  `).run(updates.name, updates.tag_number, updates.breed, updates.date_of_birth, updates.paddock_id, id);

  return findAnimalById(id);
}

function deleteAnimal(id) {
  db.prepare('DELETE FROM animals WHERE id = ?').run(id);
}

module.exports = {
  listAnimals,
  findAnimalById,
  findLatestHealthEventByAnimalId,
  createAnimal,
  updateAnimal,
  deleteAnimal,
};
