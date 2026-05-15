const express = require('express');
const router = express.Router();
const paddockService = require('../services/paddockService');
const { mapDomainErrorToHttp } = require('../lib/httpErrorMapper');

function handleRouteError(error, res, next) {
  const mapped = mapDomainErrorToHttp(error);
  if (mapped) {
    return res.status(mapped.status).json(mapped.body);
  }

  return next(error);
}

router.get('/', (req, res) => {
  const paddocks = paddockService.listPaddocks();
  res.json(paddocks);
});

router.post('/', (req, res, next) => {
  try {
    const paddock = paddockService.createPaddock(req.body);
    res.status(201).json(paddock);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const paddock = paddockService.getPaddockById(req.params.id);
    res.json(paddock);
  } catch (error) {
    return handleRouteError(error, res, next);
  }
});

module.exports = router;
