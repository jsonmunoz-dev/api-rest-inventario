const express = require('express');
const { validate } = require('../middleware/validate');
const { idParams, productCreate, productUpdate, productQuery } = require('../schemas');
const { notFound, badRequest } = require('../errors');

function productsRouter({ products, categories }) {
  const router = express.Router();

  async function ensureCategory(categoryId) {
    if (categoryId !== undefined && !(await categories.findById(categoryId))) {
      throw badRequest('La categoría indicada no existe', [
        { field: 'categoryId', message: 'No existe' },
      ]);
    }
  }

  router.get('/', validate(productQuery, 'query'), async (req, res) => {
    const filters = req.valid.query;
    const { items, total } = await products.list(filters);
    res.json({
      items,
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize),
    });
  });

  router.get('/:id', validate(idParams, 'params'), async (req, res) => {
    const product = await products.findById(req.valid.params.id);
    if (!product) throw notFound('Producto no encontrado');
    res.json(product);
  });

  router.post('/', validate(productCreate), async (req, res) => {
    await ensureCategory(req.valid.body.categoryId);
    const product = await products.create(req.valid.body);
    res.status(201).location(`/api/v1/products/${product.id}`).json(product);
  });

  router.patch('/:id', validate(idParams, 'params'), validate(productUpdate), async (req, res) => {
    await ensureCategory(req.valid.body.categoryId);
    const product = await products.update(req.valid.params.id, req.valid.body);
    if (!product) throw notFound('Producto no encontrado');
    res.json(product);
  });

  router.delete('/:id', validate(idParams, 'params'), async (req, res) => {
    const deleted = await products.remove(req.valid.params.id);
    if (!deleted) throw notFound('Producto no encontrado');
    res.status(204).end();
  });

  return router;
}

module.exports = { productsRouter };
