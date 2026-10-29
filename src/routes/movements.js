const express = require('express');
const { validate } = require('../middleware/validate');
const { idParams, movementInput, listQuery } = require('../schemas');
const { notFound } = require('../errors');

// Rutas anidadas: /products/:id/movements
function movementsRouter({ products, movements }) {
  const router = express.Router({ mergeParams: true });
  router.use(validate(idParams, 'params'));

  router.get('/', validate(listQuery, 'query'), async (req, res) => {
    const productId = req.valid.params.id;
    if (!(await products.findById(productId))) throw notFound('Producto no encontrado');
    const { page, pageSize } = req.valid.query;
    const { items, total } = await movements.listByProduct(productId, { page, pageSize });
    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  });

  router.post('/', validate(movementInput), async (req, res) => {
    const result = await movements.register(req.valid.params.id, req.valid.body);
    if (!result) throw notFound('Producto no encontrado');
    res.status(201).json(result);
  });

  return router;
}

module.exports = { movementsRouter };
