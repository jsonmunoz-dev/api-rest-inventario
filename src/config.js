require('dotenv').config();

function loadConfig(env = process.env) {
  if (!env.DATABASE_URL) {
    throw new Error('Falta la variable de entorno DATABASE_URL');
  }
  return {
    port: Number(env.PORT) || 3000,
    databaseUrl: env.DATABASE_URL,
    rateLimitMax: Number(env.RATE_LIMIT_MAX) || 300,
  };
}

module.exports = { loadConfig };
