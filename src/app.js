const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { loadSpec } = require('./docs');
const { categoriesRouter } = require('./routes/categories');
const { productsRouter } = require('./routes/products');
const { movementsRouter } = require('./routes/movements');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./errors');

// Los repositorios se inyectan para poder testear la API sin base de datos.
function createApp({ repos, rateLimitMax = 300 }) {
  const app = express();

  // Swagger UI usa scripts inline, por eso se relaja la CSP solo en /docs.
  const spec = loadSpec();
  app.get('/docs/openapi.json', (_req, res) => res.json(spec));
  app.use(
    '/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(spec),
  );

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => res.redirect('/docs'));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: rateLimitMax,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  api.use('/categories', categoriesRouter(repos));
  api.use('/products/:id/movements', movementsRouter(repos));
  api.use('/products', productsRouter(repos));
  app.use('/api/v1', api);

  app.use((_req, _res, next) => next(notFound('Ruta no encontrada')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
