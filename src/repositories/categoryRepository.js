function toCategory(row) {
  return row
    ? {
        id: row.id,
        name: row.name,
        description: row.description,
        productCount: row.product_count,
        createdAt: row.created_at,
      }
    : null;
}

const SELECT = `
  SELECT c.*, (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS product_count
  FROM categories c
`;

function createCategoryRepository(pool) {
  return {
    async list() {
      const { rows } = await pool.query(`${SELECT} ORDER BY c.name`);
      return rows.map(toCategory);
    },

    async findById(id) {
      const { rows } = await pool.query(`${SELECT} WHERE c.id = $1`, [id]);
      return toCategory(rows[0]);
    },

    async create({ name, description }) {
      const { rows } = await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
        [name, description ?? null],
      );
      return this.findById(rows[0].id);
    },

    async update(id, { name, description }) {
      const { rowCount } = await pool.query(
        'UPDATE categories SET name = $2, description = $3 WHERE id = $1',
        [id, name, description ?? null],
      );
      return rowCount ? this.findById(id) : null;
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

module.exports = { createCategoryRepository };
