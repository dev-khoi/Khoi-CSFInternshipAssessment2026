const animalRepository = require('../repositories/animalRepository');
const weightRepository = require('../repositories/weightRepository');
const { NotFoundError, ValidationError, UnprocessableError } = require('../lib/errors');
const { isValidIsoDate, toPositiveNumber } = require('../lib/validators');

function listWeights(animalId) {
  const animal = animalRepository.findAnimalById(animalId);
  if (!animal) {
    throw new NotFoundError('Animal not found');
  }

  return weightRepository.listWeightsByAnimalId(animalId);
}

function createWeight(animalId, payload) {
  const animal = animalRepository.findAnimalById(animalId);
  if (!animal) {
    throw new NotFoundError('Animal not found');
  }

  const { weight_kg, date, notes } = payload;
  const parsedWeight = toPositiveNumber(weight_kg);

  if (parsedWeight === null) {
    throw new UnprocessableError('weight_kg must be a positive number');
  }

  if (!date) {
    throw new ValidationError('date is required');
  }

  if (!isValidIsoDate(date)) {
    throw new ValidationError('date must be a valid YYYY-MM-DD string');
  }

  return weightRepository.createWeight(animalId, parsedWeight, date, notes ?? null);
}

module.exports = {
  listWeights,
  createWeight,
};
