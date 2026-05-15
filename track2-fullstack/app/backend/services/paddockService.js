const paddockRepository = require('../repositories/paddockRepository');
const { NotFoundError, ValidationError } = require('../lib/errors');

function listPaddocks() {
  return paddockRepository.listPaddocks();
}

function createPaddock(payload) {
  const { name, capacity } = payload;
  if (!name || !capacity) {
    throw new ValidationError('name and capacity are required');
  }

  return paddockRepository.createPaddock(name, capacity);
}

function getPaddockById(id) {
  const paddock = paddockRepository.findPaddockById(id);
  if (!paddock) {
    throw new NotFoundError('Paddock not found');
  }

  return paddock;
}

module.exports = {
  listPaddocks,
  createPaddock,
  getPaddockById,
};
