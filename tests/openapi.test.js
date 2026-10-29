const SwaggerParser = require('@apidevtools/swagger-parser');
const request = require('supertest');
const { createApp } = require('../src/app');
const { loadSpec } = require('../src/docs');
const { createFakeRepos } = require('./fakes');

describe('documentación OpenAPI', () => {
  it('la especificación es válida', async () => {
    await expect(SwaggerParser.validate(loadSpec())).resolves.toBeDefined();
  });

  it('documenta todas las rutas implementadas', () => {
    const paths = Object.keys(loadSpec().paths).sort();
    expect(paths).toEqual([
      '/categories',
      '/categories/{id}',
      '/products',
      '/products/{id}',
      '/products/{id}/movements',
    ]);
  });

  it('sirve Swagger UI y el JSON de la especificación', async () => {
    const app = createApp({ repos: createFakeRepos() });
    const ui = await request(app).get('/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    const json = await request(app).get('/docs/openapi.json');
    expect(json.body.info.title).toBe('API REST de Inventario');
  });
});
