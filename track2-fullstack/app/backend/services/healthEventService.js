const animalRepository = require('../repositories/animalRepository');
const healthEventRepository = require('../repositories/healthEventRepository');
const { NotFoundError, ValidationError } = require('../lib/errors');
const { isValidIsoDate } = require('../lib/validators');

function listHealthEvents(animalId) {
  const animal = animalRepository.findAnimalById(animalId);
  if (!animal) {
    throw new NotFoundError('Animal not found');
  }

  return healthEventRepository.listHealthEventsByAnimalId(animalId);
}

function createHealthEvent(animalId, payload) {
  const animal = animalRepository.findAnimalById(animalId);
  if (!animal) {
    throw new NotFoundError('Animal not found');
  }

  const { event_type, notes, date, vet_name } = payload;
  if (!event_type || !date) {
    throw new ValidationError('event_type and date are required');
  }

  if (!isValidIsoDate(date)) {
    throw new ValidationError('date must be a valid YYYY-MM-DD string');
  }

  return healthEventRepository.createHealthEvent(
    animalId,
    event_type,
    notes ?? null,
    date,
    vet_name ?? null
  );
}

module.exports = {
  listHealthEvents,
  createHealthEvent,
};
