const express = require('express');
const { notFound, HttpError } = require('../errors');

// Reinicio de los datos de la demo pública. Lo llama Vercel Cron una vez al día
// con el header "Authorization: Bearer <CRON_SECRET>".
function demoRouter({ enabled = false, cronSecret, resetDemo } = {}) {
  const router = express.Router();

  router.get('/reset', async (req, res) => {
    if (!enabled || !cronSecret || !resetDemo) throw notFound('Ruta no encontrada');
    if (req.get('authorization') !== `Bearer ${cronSecret}`) {
      throw new HttpError(401, 'No autorizado');
    }
    await resetDemo();
    res.json({ status: 'ok', resetAt: new Date().toISOString() });
  });

  return router;
}

module.exports = { demoRouter };
