// Columnas permitidas para ordenar (lista blanca: nunca se interpola input del usuario).
const SORT_COLUMNS = {
  name: 'p.name',
  price: 'p.price',
  stock: 'p.stock',
  createdAt: 'p.created_at',
};

const SELECT = `
  SELECT p.*, c.name AS category_name
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    minStock: row.min_stock,
    lowStock: row.stock <= row.min_stock,
    category: { id: row.category_id, name: row.category_name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Construye el WHERE con parámetros posicionales a partir de los filtros validados.
function buildFilters({ q, categoryId, minPrice, maxPrice, lowStock }) {
  const conditions = [];
  const values = [];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (q) {
    values.push(`%${q}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`);
  }
  if (categoryId) add('p.category_id = ?', categoryId);
  if (minPrice !== undefined) add('p.price >= ?', minPrice);
  if (maxPrice !== undefined) add('p.price <= ?', maxPrice);
  if (lowStock === true) conditions.push('p.stock <= p.min_stock');
  if (lowStock === false) conditions.push('p.stock > p.min_stock');

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values };
}

function createProductRepository(pool) {
  return {
    async list(filters) {
      const { page, pageSize, sort, order } = filters;
      const { where, values } = buildFilters(filters);
      const orderBy = `${SORT_COLUMNS[sort]} ${order === 'desc' ? 'DESC' : 'ASC'}, p.id`;

      const [items, count] = await Promise.all([
        pool.query(
          `${SELECT} ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, pageSize, (page - 1) * pageSize],
        ),
        pool.query(`SELECT COUNT(*)::int AS total FROM products p ${where}`, values),
      ]);
      return { items: items.rows.map(toProduct), total: count.rows[0].total };
    },

    async findById(id) {
      const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
      return toProduct(rows[0]);
    },

    async create(p) {
      const { rows } = await pool.query(
        `INSERT INTO products (sku, name, description, price, stock, min_stock, category_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [p.sku, p.name, p.description ?? null, p.price, p.initialStock, p.minStock, p.categoryId],
      );
      return this.findById(rows[0].id);
    },

    async update(id, changes) {
      const columns = {
        sku: 'sku',
        name: 'name',
        description: 'description',
        price: 'price',
        minStock: 'min_stock',
        categoryId: 'category_id',
      };
      const entries = Object.entries(changes).filter(([key]) => columns[key]);
      const sets = entries.map(([key], i) => `${columns[key]} = $${i + 2}`);
      const { rowCount } = await pool.query(
        `UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`,
        [id, ...entries.map(([, value]) => value)],
      );
      return rowCount ? this.findById(id) : null;
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

module.exports = { createProductRepository, buildFilters };
