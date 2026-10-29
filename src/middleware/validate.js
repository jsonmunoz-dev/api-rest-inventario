const { badRequest } = require('../errors');

// Valida body, query o params con zod. Los datos parseados quedan en req.valid[source].
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(badRequest('Datos inválidos', details));
    }
    req.valid = { ...req.valid, [source]: result.data };
    return next();
  };
}

module.exports = { validate };
