// Punto de entrada que usa Vercel: exporta la app de Express ya configurada.
const { attachDatabasePool } = require('@vercel/functions');
const { loadConfig } = require('./config');
const { createPool } = require('./db/pool');
const { seed } = require('./db/seed');
const { createCategoryRepository } = require('./repositories/categoryRepository');
const { createProductRepository } = require('./repositories/productRepository');
const { createMovementRepository } = require('./repositories/movementRepository');
const { createApp } = require('./app');

const config = loadConfig();
const pool = createPool(config.databaseUrl);
// En Vercel, libera las conexiones inactivas antes de que la función se suspenda.
attachDatabasePool(pool);

// Deja el inventario como recién creado: borra todo y vuelve a cargar los datos de ejemplo.
async function resetDemo() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE stock_movements, products, categories RESTART IDENTITY');
    await seed(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = createApp({
  repos: {
    categories: createCategoryRepository(pool),
    products: createProductRepository(pool),
    movements: createMovementRepository(pool),
  },
  rateLimitMax: config.rateLimitMax,
  trustProxy: config.trustProxy,
  demo: { enabled: config.demoMode, cronSecret: config.cronSecret, resetDemo },
});
