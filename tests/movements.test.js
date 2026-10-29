const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepos } = require('./fakes');

let app;
let product;

beforeEach(async () => {
  const repos = createFakeRepos();
  app = createApp({ repos });
  const category = await repos.categories.create({ name: 'Redes' });
  product = await repos.products.create({
    sku: 'RT-1',
    name: 'Router',
    price: 100,
    initialStock: 5,
    minStock: 1,
    categoryId: category.id,
  });
});

const url = () => `/api/v1/products/${product.id}/movements`;

describe('/api/v1/products/:id/movements', () => {
  it('registra entradas y salidas y devuelve el stock resultante', async () => {
    const entrada = await request(app).post(url()).send({ type: 'in', quantity: 10 });
    expect(entrada.status).toBe(201);
    expect(entrada.body.stock).toBe(15);

    const salida = await request(app).post(url()).send({ type: 'out', quantity: 4, note: 'Venta' });
    expect(salida.body.stock).toBe(11);
    expect(salida.body.movement).toMatchObject({ type: 'out', quantity: 4, note: 'Venta' });
  });

  it('impide dejar el stock negativo (409)', async () => {
    const res = await request(app).post(url()).send({ type: 'out', quantity: 6 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Stock insuficiente/);
  });

  it('valida tipo y cantidad', async () => {
    for (const body of [
      { type: 'x', quantity: 1 },
      { type: 'in', quantity: 0 },
      { type: 'in', quantity: 1.5 },
    ]) {
      expect((await request(app).post(url()).send(body)).status).toBe(400);
    }
  });

  it('lista el historial más reciente primero', async () => {
    await request(app).post(url()).send({ type: 'in', quantity: 1 });
    await request(app).post(url()).send({ type: 'out', quantity: 2 });
    const res = await request(app).get(url());
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((m) => m.type)).toEqual(['out', 'in']);
  });

  it('responde 404 si el producto no existe', async () => {
    expect((await request(app).get('/api/v1/products/99/movements')).status).toBe(404);
    const res = await request(app)
      .post('/api/v1/products/99/movements')
      .send({ type: 'in', quantity: 1 });
    expect(res.status).toBe(404);
  });
});
