const { HttpError } = require('../errors');

// Traduce errores de restricciones de PostgreSQL a respuestas HTTP claras.
const PG_ERRORS = {
  23505: [409, 'Ya existe un registro con ese valor único'],
  23503: [409, 'El registro está relacionado con otros datos'],
  23514: [409, 'La operación viola una regla de integridad'],
};

function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  if (PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ error: message, details: err.detail });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { errorHandler };
