const { buildFilters } = require('../src/repositories/productRepository');

describe('buildFilters (generador de WHERE)', () => {
  it('sin filtros no genera WHERE', () => {
    expect(buildFilters({})).toEqual({ where: '', values: [] });
  });

  it('usa parámetros posicionales en orden y nunca interpola valores', () => {
    const { where, values } = buildFilters({
      q: "x'; DROP TABLE products; --",
      categoryId: 3,
      minPrice: 10,
      maxPrice: 20,
    });
    expect(where).toBe(
      'WHERE (p.name ILIKE $1 OR p.sku ILIKE $1) AND p.category_id = $2 AND p.price >= $3 AND p.price <= $4',
    );
    expect(values).toEqual(["%x'; DROP TABLE products; --%", 3, 10, 20]);
    expect(where).not.toContain('DROP');
  });

  it('filtra por stock bajo o normal sin parámetros', () => {
    expect(buildFilters({ lowStock: true }).where).toBe('WHERE p.stock <= p.min_stock');
    expect(buildFilters({ lowStock: false }).where).toBe('WHERE p.stock > p.min_stock');
  });

  it('acepta minPrice = 0', () => {
    expect(buildFilters({ minPrice: 0 }).values).toEqual([0]);
  });
});
