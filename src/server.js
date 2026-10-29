const { loadConfig } = require('./config');
const { createPool } = require('./db/pool');
const { createCategoryRepository } = require('./repositories/categoryRepository');
const { createProductRepository } = require('./repositories/productRepository');
const { createMovementRepository } = require('./repositories/movementRepository');
const { createApp } = require('./app');

const config = loadConfig();
const pool = createPool(config.databaseUrl);

const app = createApp({
  repos: {
    categories: createCategoryRepository(pool),
    products: createProductRepository(pool),
    movements: createMovementRepository(pool),
  },
  rateLimitMax: config.rateLimitMax,
});

const server = app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
