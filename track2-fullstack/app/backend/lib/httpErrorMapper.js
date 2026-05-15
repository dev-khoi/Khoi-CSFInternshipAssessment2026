const {
  NotFoundError,
  ValidationError,
  UnprocessableError,
  ConflictError,
} = require('./errors');

function mapDomainErrorToHttp(error) {
  if (error instanceof NotFoundError) {
    return { status: 404, body: { error: error.message } };
  }

  if (error instanceof ValidationError) {
    return { status: 400, body: { error: error.message } };
  }

  if (error instanceof UnprocessableError) {
    return { status: 422, body: { error: error.message } };
  }

  if (error instanceof ConflictError) {
    return { status: 409, body: { error: error.message } };
  }

  return null;
}

module.exports = {
  mapDomainErrorToHttp,
};
