const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepos } = require('./fakes');

describe('página de inicio', () => {
  const app = createApp({ repos: createFakeRepos() });

  it('sirve la página, el script y los estilos', async () => {
    const html = await request(app).get('/');
    expect(html.status).toBe(200);
    expect(html.headers['content-type']).toMatch(/html/);
    expect(html.text).toContain('Inventario de una tienda');
    expect(html.text).toContain('href="/docs"');

    expect((await request(app).get('/app.js')).headers['content-type']).toMatch(/javascript/);
    expect((await request(app).get('/styles.css')).headers['content-type']).toMatch(/css/);
  });

  it('no usa scripts inline (compatible con la CSP de helmet)', async () => {
    const html = await request(app).get('/');
    expect(html.headers['content-security-policy']).toContain("script-src 'self'");
    expect(html.text).not.toMatch(/<script>(?!<\/script>)/);
  });
});

describe('GET /api/demo/reset', () => {
  const build = (demo) => createApp({ repos: createFakeRepos(), demo });

  it('reinicia los datos con el secreto correcto', async () => {
    const resetDemo = jest.fn().mockResolvedValue();
    const app = build({ enabled: true, cronSecret: 's3cr3t', resetDemo });
    const res = await request(app).get('/api/demo/reset').set('Authorization', 'Bearer s3cr3t');
    expect(res.status).toBe(200);
    expect(resetDemo).toHaveBeenCalledTimes(1);
  });

  it('responde 401 sin el secreto correcto', async () => {
    const resetDemo = jest.fn();
    const app = build({ enabled: true, cronSecret: 's3cr3t', resetDemo });
    expect((await request(app).get('/api/demo/reset')).status).toBe(401);
    expect(
      (await request(app).get('/api/demo/reset').set('Authorization', 'Bearer x')).status,
    ).toBe(401);
    expect(resetDemo).not.toHaveBeenCalled();
  });

  it('no existe si el modo demo está desactivado', async () => {
    const app = build({ enabled: false, cronSecret: 's3cr3t', resetDemo: jest.fn() });
    const res = await request(app).get('/api/demo/reset').set('Authorization', 'Bearer s3cr3t');
    expect(res.status).toBe(404);
  });
});
