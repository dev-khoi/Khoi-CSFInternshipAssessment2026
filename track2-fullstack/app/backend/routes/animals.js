const express = require('express');
const router = express.Router();
const animalService = require('../services/animalService');
const healthEventService = require('../services/healthEventService');
const weightService = require('../services/weightService');
const { mapDomainErrorToHttp } = require('../lib/httpErrorMapper');

function handleRouteError(error, res, next) {
  const mapped = mapDomainErrorToHttp(error);
  if (mapped) {
    return res.status(mapped.status).json(mapped.body);
  }

  return next(error);
}

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;

  const result = animalService.listAnimals(page, limit);
  res.json(result);
});

router.post('/', (req, res, next) => {
  try {
    const animal = animalService.createAnimal(req.body);
    res.status(201).json(animal);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const animal = animalService.getAnimalById(req.params.id);
    res.json(animal);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const updated = animalService.updateAnimal(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    animalService.deleteAnimal(req.params.id);
    res.json({ message: 'deleted' });
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.get('/:id/health-events', (req, res, next) => {
  try {
    const events = healthEventService.listHealthEvents(req.params.id);
    res.json(events);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.post('/:id/health-events', (req, res, next) => {
  try {
    const event = healthEventService.createHealthEvent(req.params.id, req.body);
    res.status(201).json(event);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.get('/:id/weights', (req, res, next) => {
  try {
    const weights = weightService.listWeights(req.params.id);
    res.json(weights);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.post('/:id/weights', (req, res, next) => {
  try {
    const weight = weightService.createWeight(req.params.id, req.body);
    res.status(201).json(weight);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

module.exports = router;
