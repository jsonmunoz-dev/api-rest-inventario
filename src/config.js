require('dotenv').config();

function loadConfig(env = process.env) {
  if (!env.DATABASE_URL) {
    throw new Error('Falta la variable de entorno DATABASE_URL');
  }
  return {
    port: Number(env.PORT) || 3000,
    databaseUrl: env.DATABASE_URL,
    rateLimitMax: Number(env.RATE_LIMIT_MAX) || 300,
    // Modo demo: habilita el reinicio diario de datos (Vercel Cron).
    demoMode: env.DEMO_MODE === 'true',
    cronSecret: env.CRON_SECRET,
    // Detrás del proxy de Vercel la IP real del cliente viene en X-Forwarded-For.
    trustProxy: Boolean(env.VERCEL),
  };
}

module.exports = { loadConfig };
