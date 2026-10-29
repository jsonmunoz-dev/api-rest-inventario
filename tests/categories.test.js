const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepos } = require('./fakes');

let app;
let repos;

beforeEach(() => {
  repos = createFakeRepos();
  app = createApp({ repos });
});

describe('/api/v1/categories', () => {
  it('crea una categoría y devuelve Location', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .send({ name: '  Redes ', description: 'Routers' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, name: 'Redes', productCount: 0 });
    expect(res.headers.location).toBe('/api/v1/categories/1');
  });

  it('valida el nombre', async () => {
    const res = await request(app).post('/api/v1/categories').send({ name: 'R' });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('name');
  });

  it('traduce el error de nombre duplicado de PostgreSQL a 409', async () => {
    await request(app).post('/api/v1/categories').send({ name: 'Redes' });
    const res = await request(app).post('/api/v1/categories').send({ name: 'Redes' });
    expect(res.status).toBe(409);
  });

  it('lista, obtiene y actualiza', async () => {
    await repos.categories.create({ name: 'Redes' });
    expect((await request(app).get('/api/v1/categories')).body).toHaveLength(1);
    expect((await request(app).get('/api/v1/categories/1')).body.name).toBe('Redes');
    const put = await request(app).put('/api/v1/categories/1').send({ name: 'Networking' });
    expect(put.body.name).toBe('Networking');
  });

  it('responde 404 y 400 según el ID', async () => {
    expect((await request(app).get('/api/v1/categories/99')).status).toBe(404);
    expect((await request(app).get('/api/v1/categories/abc')).status).toBe(400);
    expect((await request(app).put('/api/v1/categories/99').send({ name: 'Xx' })).status).toBe(404);
  });

  it('no elimina categorías con productos', async () => {
    const c = await repos.categories.create({ name: 'Redes' });
    await repos.products.create({
      sku: 'SW-1',
      name: 'Switch',
      price: 10,
      initialStock: 0,
      minStock: 0,
      categoryId: c.id,
    });
    const res = await request(app).delete(`/api/v1/categories/${c.id}`);
    expect(res.status).toBe(409);
  });

  it('elimina categorías vacías', async () => {
    const c = await repos.categories.create({ name: 'Vacía' });
    expect((await request(app).delete(`/api/v1/categories/${c.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/v1/categories/${c.id}`)).status).toBe(404);
  });
});
