const express = require('express');
const { validate } = require('../middleware/validate');
const { idParams, categoryInput } = require('../schemas');
const { notFound, conflict } = require('../errors');

function categoriesRouter({ categories }) {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    res.json(await categories.list());
  });

  router.get('/:id', validate(idParams, 'params'), async (req, res) => {
    const category = await categories.findById(req.valid.params.id);
    if (!category) throw notFound('Categoría no encontrada');
    res.json(category);
  });

  router.post('/', validate(categoryInput), async (req, res) => {
    const category = await categories.create(req.valid.body);
    res.status(201).location(`/api/v1/categories/${category.id}`).json(category);
  });

  router.put('/:id', validate(idParams, 'params'), validate(categoryInput), async (req, res) => {
    const category = await categories.update(req.valid.params.id, req.valid.body);
    if (!category) throw notFound('Categoría no encontrada');
    res.json(category);
  });

  router.delete('/:id', validate(idParams, 'params'), async (req, res) => {
    const category = await categories.findById(req.valid.params.id);
    if (!category) throw notFound('Categoría no encontrada');
    if (category.productCount > 0) {
      throw conflict('No se puede eliminar una categoría que tiene productos');
    }
    await categories.remove(category.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { categoriesRouter };
