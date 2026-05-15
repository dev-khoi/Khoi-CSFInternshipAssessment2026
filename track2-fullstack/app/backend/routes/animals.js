const express = require('express');
const router = express.Router();
const { db } = require('../db');

function getPaddockById(paddockId) {
  return db.prepare('SELECT * FROM paddocks WHERE id = ?').get(paddockId);
}

function isValidIsoDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const offset = page * limit;

  const animals = db.prepare(
    'SELECT * FROM animals LIMIT ? OFFSET ?'
  ).all(limit, offset);

  const result = animals.map(animal => {
    const latestEvent = db.prepare(`
      SELECT * FROM health_events
      WHERE animal_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(animal.id);
    return { ...animal, latest_health_event: latestEvent ?? null };
  });

  res.json(result);
});

router.post('/', (req, res) => {
  const { name, tag_number, breed, date_of_birth, paddock_id } = req.body;

  if (!name || !tag_number) {
    return res.status(400).json({ error: 'name and tag_number are required' });
  }

  let createdAnimalId;

  try {
    db.exec('BEGIN');

    if (paddock_id !== null && paddock_id !== undefined) {
      const paddock = getPaddockById(paddock_id);
      if (!paddock) {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'Paddock not found' });
      }

      if (paddock.animal_count >= paddock.capacity) {
        db.exec('ROLLBACK');
        return res.status(422).json({ error: 'Paddock is at capacity' });
      }
    }

    const result = db.prepare(
      'INSERT INTO animals (name, tag_number, breed, date_of_birth, paddock_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, tag_number, breed ?? null, date_of_birth ?? null, paddock_id ?? null);
    createdAnimalId = result.lastInsertRowid;

    if (paddock_id !== null && paddock_id !== undefined) {
      db.prepare(
        'UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?'
      ).run(paddock_id);
    }

    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {}

    if (
      error.code === 'SQLITE_CONSTRAINT_UNIQUE'
      || (typeof error.message === 'string' && error.message.includes('UNIQUE constraint failed: animals.tag_number'))
    ) {
      return res.status(409).json({ error: 'tag_number must be unique' });
    }

    throw error;
  }

  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(createdAnimalId);
  res.status(201).json(animal);
});

router.get('/:id', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });
  res.json(animal);
});

router.put('/:id', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const updates = {
    name:          req.body.name          ?? animal.name,
    tag_number:    req.body.tag_number    ?? animal.tag_number,
    breed:         req.body.breed         ?? animal.breed,
    date_of_birth: req.body.date_of_birth ?? animal.date_of_birth,
    paddock_id:    'paddock_id' in req.body ? req.body.paddock_id : animal.paddock_id,
  };

  if (updates.paddock_id !== animal.paddock_id) {
    if (updates.paddock_id !== null && updates.paddock_id !== undefined) {
      const paddock = getPaddockById(updates.paddock_id);
      if (!paddock) {
        return res.status(404).json({ error: 'Paddock not found' });
      }

      if (paddock.animal_count >= paddock.capacity) {
        return res.status(422).json({ error: 'Paddock is at capacity' });
      }
    }

    if (animal.paddock_id) {
      db.prepare(
        'UPDATE paddocks SET animal_count = animal_count - 1 WHERE id = ?'
      ).run(animal.paddock_id);
    }

    if (updates.paddock_id) {
      db.prepare(
        'UPDATE paddocks SET animal_count = animal_count + 1 WHERE id = ?'
      ).run(updates.paddock_id);
    }
  }

  db.prepare(`
    UPDATE animals
    SET name = ?, tag_number = ?, breed = ?, date_of_birth = ?, paddock_id = ?
    WHERE id = ?
  `).run(updates.name, updates.tag_number, updates.breed, updates.date_of_birth, updates.paddock_id, req.params.id);

  const updated = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  if (animal.paddock_id) {
    db.prepare(
      'UPDATE paddocks SET animal_count = animal_count - 1 WHERE id = ?'
    ).run(animal.paddock_id);
  }

  db.prepare('DELETE FROM animals WHERE id = ?').run(req.params.id);
  res.json({ message: 'deleted' });
});

router.get('/:id/health-events', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const events = db.prepare(
    'SELECT * FROM health_events WHERE animal_id = ? ORDER BY date DESC'
  ).all(req.params.id);
  res.json(events);
});

router.post('/:id/health-events', (req, res) => {
  const animal = db.prepare('SELECT * FROM animals WHERE id = ?').get(req.params.id);
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const { event_type, notes, date, vet_name } = req.body;
  if (!event_type || !date) {
    return res.status(400).json({ error: 'event_type and date are required' });
  }

  if (!isValidIsoDate(date)) {
    return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
  }

  const result = db.prepare(
    'INSERT INTO health_events (animal_id, event_type, notes, date, vet_name) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, event_type, notes ?? null, date, vet_name ?? null);

  const event = db.prepare('SELECT * FROM health_events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(event);
});

module.exports = router;
