const { conflict } = require('../src/errors');

// Repositorios en memoria con la misma interfaz que los de PostgreSQL.
function createFakeRepos() {
  const categories = new Map();
  const products = new Map();
  const movements = [];
  let ids = { category: 1, product: 1, movement: 1 };

  const categoryRepo = {
    async list() {
      return [...categories.values()].map((c) => categoryRepo.withCount(c));
    },
    withCount(c) {
      const productCount = [...products.values()].filter((p) => p.category.id === c.id).length;
      return { ...c, productCount };
    },
    async findById(id) {
      const c = categories.get(id);
      return c ? categoryRepo.withCount(c) : null;
    },
    async create({ name, description }) {
      if ([...categories.values()].some((c) => c.name === name)) {
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      }
      const c = {
        id: ids.category++,
        name,
        description: description ?? null,
        createdAt: new Date(),
      };
      categories.set(c.id, c);
      return categoryRepo.withCount(c);
    },
    async update(id, data) {
      if (!categories.has(id)) return null;
      Object.assign(categories.get(id), data);
      return categoryRepo.findById(id);
    },
    async remove(id) {
      return categories.delete(id);
    },
  };

  const productRepo = {
    list: jest.fn(async () => ({ items: [...products.values()], total: products.size })),
    async findById(id) {
      return products.get(id) || null;
    },
    async create(p) {
      const category = categories.get(p.categoryId);
      const product = {
        id: ids.product++,
        sku: p.sku,
        name: p.name,
        description: p.description ?? null,
        price: p.price,
        stock: p.initialStock,
        minStock: p.minStock,
        lowStock: p.initialStock <= p.minStock,
        category: { id: category.id, name: category.name },
      };
      products.set(product.id, product);
      return product;
    },
    async update(id, changes) {
      const p = products.get(id);
      if (!p) return null;
      Object.assign(p, changes);
      return p;
    },
    async remove(id) {
      return products.delete(id);
    },
  };

  const movementRepo = {
    async listByProduct(productId, { page, pageSize }) {
      const items = movements.filter((m) => m.productId === productId).reverse();
      return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length };
    },
    async register(productId, { type, quantity, note }) {
      const p = products.get(productId);
      if (!p) return null;
      const newStock = p.stock + (type === 'in' ? quantity : -quantity);
      if (newStock < 0) throw conflict(`Stock insuficiente: disponible ${p.stock}`);
      p.stock = newStock;
      const movement = { id: ids.movement++, productId, type, quantity, note: note ?? null };
      movements.push(movement);
      return { movement, stock: newStock };
    },
  };

  return { categories: categoryRepo, products: productRepo, movements: movementRepo };
}

module.exports = { createFakeRepos };
