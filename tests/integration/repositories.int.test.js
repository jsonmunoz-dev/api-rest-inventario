// Requiere PostgreSQL. En CI se levanta como servicio de GitHub Actions.
const { createPool } = require('../../src/db/pool');
const { migrate } = require('../../src/db/migrate');
const { seed } = require('../../src/db/seed');
const { createCategoryRepository } = require('../../src/repositories/categoryRepository');
const { createProductRepository } = require('../../src/repositories/productRepository');
const { createMovementRepository } = require('../../src/repositories/movementRepository');

const pool = createPool(process.env.DATABASE_URL);
const categories = createCategoryRepository(pool);
const products = createProductRepository(pool);
const movements = createMovementRepository(pool);

const defaults = { page: 1, pageSize: 20, sort: 'name', order: 'asc' };

beforeAll(async () => {
  await pool.query(
    'DROP TABLE IF EXISTS stock_movements, products, categories, schema_migrations CASCADE',
  );
  await migrate(pool);
  await seed(pool);
});

afterAll(() => pool.end());

describe('productRepository.list (PostgreSQL)', () => {
  it('devuelve todos los productos sembrados ordenados por nombre', async () => {
    const { items, total } = await products.list(defaults);
    expect(total).toBe(7);
    const names = items.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    expect(typeof items[0].price).toBe('number');
  });

  it('busca por nombre o SKU sin distinguir mayúsculas', async () => {
    const { items } = await products.list({ ...defaults, q: 'ssd' });
    expect(items.map((p) => p.sku)).toEqual(['SSD-1TB']);
  });

  it('combina filtros de precio, stock bajo y orden descendente', async () => {
    const { items } = await products.list({
      ...defaults,
      lowStock: true,
      sort: 'price',
      order: 'desc',
    });
    expect(items.map((p) => p.sku)).toEqual(['TEC-101', 'USB-64']);
    const range = await products.list({ ...defaults, minPrice: 20000, maxPrice: 70000 });
    expect(range.items.every((p) => p.price >= 20000 && p.price <= 70000)).toBe(true);
  });

  it('pagina correctamente', async () => {
    const page2 = await products.list({ ...defaults, page: 2, pageSize: 3 });
    expect(page2.items).toHaveLength(3);
    expect(page2.total).toBe(7);
  });
});

describe('movementRepository.register (PostgreSQL)', () => {
  it('actualiza el stock y guarda el movimiento', async () => {
    const [p] = (await products.list({ ...defaults, q: 'RT-AX3' })).items;
    const result = await movements.register(p.id, { type: 'in', quantity: 2, note: 'Compra' });
    expect(result.stock).toBe(p.stock + 2);
    expect((await products.findById(p.id)).stock).toBe(p.stock + 2);
    const history = await movements.listByProduct(p.id, { page: 1, pageSize: 10 });
    expect(history.total).toBe(1);
  });

  it('rechaza salidas mayores al stock sin modificar nada', async () => {
    const [p] = (await products.list({ ...defaults, q: 'USB-64' })).items;
    await expect(movements.register(p.id, { type: 'out', quantity: 99 })).rejects.toMatchObject({
      status: 409,
    });
    expect((await products.findById(p.id)).stock).toBe(p.stock);
  });

  it('no permite stock negativo con salidas concurrentes', async () => {
    const [p] = (await products.list({ ...defaults, q: 'NB-001' })).items; // stock 12
    const attempts = Array.from({ length: 10 }, () =>
      movements.register(p.id, { type: 'out', quantity: 3 }),
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    expect(ok).toBe(4); // 4 × 3 = 12
    expect((await products.findById(p.id)).stock).toBe(0);
  });

  it('devuelve null si el producto no existe', async () => {
    expect(await movements.register(999999, { type: 'in', quantity: 1 })).toBeNull();
  });
});

describe('restricciones de la base de datos', () => {
  it('impide eliminar una categoría con productos (FK)', async () => {
    const [cat] = await categories.list();
    await expect(categories.remove(cat.id)).rejects.toMatchObject({ code: '23503' });
  });

  it('impide SKU duplicados', async () => {
    const [cat] = await categories.list();
    await expect(
      products.create({
        sku: 'NB-001',
        name: 'Duplicado',
        price: 1,
        initialStock: 0,
        minStock: 0,
        categoryId: cat.id,
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
