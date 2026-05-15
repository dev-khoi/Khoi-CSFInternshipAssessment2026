const animalRepository = require('../repositories/animalRepository');
const paddockRepository = require('../repositories/paddockRepository');
const { withTransaction } = require('./transaction');
const { NotFoundError, ValidationError, UnprocessableError, ConflictError } = require('../lib/errors');

function ensurePaddockCanAcceptAnimal(paddockId) {
  const paddock = paddockRepository.findPaddockById(paddockId);
  if (!paddock) {
    throw new NotFoundError('Paddock not found');
  }

  if (paddock.animal_count >= paddock.capacity) {
    throw new UnprocessableError('Paddock is at capacity');
  }
}

function listAnimals(page, limit) {
  const offset = page * limit;
  const animals = animalRepository.listAnimals(limit, offset);

  return animals.map(animal => {
    const latestEvent = animalRepository.findLatestHealthEventByAnimalId(animal.id);
    return { ...animal, latest_health_event: latestEvent ?? null };
  });
}

function getAnimalById(id) {
  const animal = animalRepository.findAnimalById(id);
  if (!animal) {
    throw new NotFoundError('Animal not found');
  }

  return animal;
}

function createAnimal(payload) {
  const { name, tag_number, breed, date_of_birth, paddock_id } = payload;
  if (!name || !tag_number) {
    throw new ValidationError('name and tag_number are required');
  }

  return withTransaction(() => {
    if (paddock_id !== null && paddock_id !== undefined) {
      ensurePaddockCanAcceptAnimal(paddock_id);
    }

    try {
      const animal = animalRepository.createAnimal(
        name,
        tag_number,
        breed ?? null,
        date_of_birth ?? null,
        paddock_id ?? null
      );

      if (paddock_id !== null && paddock_id !== undefined) {
        paddockRepository.incrementAnimalCount(paddock_id);
      }

      return animal;
    } catch (error) {
      if (
        error.code === 'SQLITE_CONSTRAINT_UNIQUE'
        || (typeof error.message === 'string' && error.message.includes('UNIQUE constraint failed: animals.tag_number'))
      ) {
        throw new ConflictError('tag_number must be unique');
      }

      throw error;
    }
  });
}

function updateAnimal(id, payload) {
  const animal = getAnimalById(id);

  const updates = {
    name: payload.name ?? animal.name,
    tag_number: payload.tag_number ?? animal.tag_number,
    breed: payload.breed ?? animal.breed,
    date_of_birth: payload.date_of_birth ?? animal.date_of_birth,
    paddock_id: 'paddock_id' in payload ? payload.paddock_id : animal.paddock_id,
  };

  return withTransaction(() => {
    if (updates.paddock_id !== animal.paddock_id) {
      if (updates.paddock_id !== null && updates.paddock_id !== undefined) {
        ensurePaddockCanAcceptAnimal(updates.paddock_id);
      }

      if (animal.paddock_id) {
        paddockRepository.decrementAnimalCount(animal.paddock_id);
      }

      if (updates.paddock_id) {
        paddockRepository.incrementAnimalCount(updates.paddock_id);
      }
    }

    return animalRepository.updateAnimal(id, updates);
  });
}

function deleteAnimal(id) {
  const animal = getAnimalById(id);

  withTransaction(() => {
    if (animal.paddock_id) {
      paddockRepository.decrementAnimalCount(animal.paddock_id);
    }

    animalRepository.deleteAnimal(id);
  });
}

module.exports = {
  listAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  deleteAnimal,
};
