const { db } = require('../db');

function withTransaction(work) {
  db.exec('BEGIN');

  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    throw error;
  }
}

module.exports = {
  withTransaction,
};
