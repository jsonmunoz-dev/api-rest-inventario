const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepos } = require('./fakes');

let app;
let repos;
let category;

const validProduct = () => ({
  sku: 'nb-001',
  name: 'Notebook',
  price: 549990,
  minStock: 2,
  initialStock: 5,
  categoryId: category.id,
});

beforeEach(async () => {
  repos = createFakeRepos();
  app = createApp({ repos });
  category = await repos.categories.create({ name: 'Computación' });
});

describe('GET /api/v1/products', () => {
  it('aplica valores por defecto y metadatos de paginación', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
    expect(repos.products.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20, sort: 'name', order: 'asc' }),
    );
  });

  it('convierte y pasa los filtros validados al repositorio', async () => {
    await request(app).get(
      '/api/v1/products?q=note&categoryId=1&minPrice=100&maxPrice=900&lowStock=true&sort=price&order=desc&page=2&pageSize=5',
    );
    expect(repos.products.list).toHaveBeenCalledWith({
      q: 'note',
      categoryId: 1,
      minPrice: 100,
      maxPrice: 900,
      lowStock: true,
      sort: 'price',
      order: 'desc',
      page: 2,
      pageSize: 5,
    });
  });

  it.each([
    ['sort=password', 'sort'],
    ['order=up', 'order'],
    ['pageSize=1000', 'pageSize'],
    ['minPrice=10&maxPrice=5', 'minPrice'],
    ['lowStock=quizas', 'lowStock'],
  ])('rechaza parámetros inválidos: %s', async (qs, field) => {
    const res = await request(app).get(`/api/v1/products?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain(field);
  });
});

describe('POST /api/v1/products', () => {
  it('crea el producto normalizando el SKU', async () => {
    const res = await request(app).post('/api/v1/products').send(validProduct());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sku: 'NB-001', stock: 5, lowStock: false });
    expect(res.headers.location).toMatch(/\/api\/v1\/products\/\d+$/);
  });

  it('rechaza una categoría inexistente', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .send({ ...validProduct(), categoryId: 999 });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('categoryId');
  });

  it('rechaza precios negativos o con más de 2 decimales y SKU inválidos', async () => {
    for (const patch of [{ price: -1 }, { price: 10.123 }, { sku: 'con espacios' }]) {
      const res = await request(app)
        .post('/api/v1/products')
        .send({ ...validProduct(), ...patch });
      expect(res.status).toBe(400);
    }
  });
});

describe('/api/v1/products/:id', () => {
  it('obtiene, actualiza parcialmente y elimina', async () => {
    const { body: created } = await request(app).post('/api/v1/products').send(validProduct());

    expect((await request(app).get(`/api/v1/products/${created.id}`)).body.sku).toBe('NB-001');

    const patched = await request(app)
      .patch(`/api/v1/products/${created.id}`)
      .send({ price: 499990 });
    expect(patched.status).toBe(200);
    expect(patched.body.price).toBe(499990);

    expect((await request(app).delete(`/api/v1/products/${created.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/v1/products/${created.id}`)).status).toBe(404);
  });

  it('no permite modificar el stock con PATCH', async () => {
    const { body: created } = await request(app).post('/api/v1/products').send(validProduct());
    const res = await request(app).patch(`/api/v1/products/${created.id}`).send({ stock: 999 });
    // "stock" no es un campo editable: el body queda vacío y se rechaza.
    expect(res.status).toBe(400);
  });

  it('responde 404 para productos inexistentes', async () => {
    expect((await request(app).patch('/api/v1/products/42').send({ name: 'Xx' })).status).toBe(404);
    expect((await request(app).delete('/api/v1/products/42')).status).toBe(404);
  });
});

describe('errores generales', () => {
  it('responde 400 ante JSON inválido y 404 en rutas desconocidas', async () => {
    const bad = await request(app)
      .post('/api/v1/products')
      .set('Content-Type', 'application/json')
      .send('{"sku":');
    expect(bad.status).toBe(400);
    expect((await request(app).get('/api/v1/nada')).status).toBe(404);
  });

  it('expone health check y cabeceras de rate limit', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
    const res = await request(app).get('/api/v1/categories');
    expect(res.headers).toHaveProperty('ratelimit-policy');
  });
});
