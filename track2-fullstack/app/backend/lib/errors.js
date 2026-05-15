class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class UnprocessableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnprocessableError';
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

module.exports = {
  NotFoundError,
  ValidationError,
  UnprocessableError,
  ConflictError,
};
