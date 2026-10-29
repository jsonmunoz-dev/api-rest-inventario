const { conflict } = require('../errors');

function toMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    note: row.note,
    createdAt: row.created_at,
  };
}

function createMovementRepository(pool) {
  return {
    async listByProduct(productId, { page, pageSize }) {
      const [items, count] = await Promise.all([
        pool.query(
          `SELECT * FROM stock_movements WHERE product_id = $1
           ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
          [productId, pageSize, (page - 1) * pageSize],
        ),
        pool.query('SELECT COUNT(*)::int AS total FROM stock_movements WHERE product_id = $1', [
          productId,
        ]),
      ]);
      return { items: items.rows.map(toMovement), total: count.rows[0].total };
    },

    // Registra el movimiento y actualiza el stock en una sola transacción.
    // SELECT ... FOR UPDATE bloquea la fila del producto para que dos salidas
    // simultáneas no dejen el stock negativo.
    async register(productId, { type, quantity, note }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
          [productId],
        );
        if (rows.length === 0) {
          await client.query('ROLLBACK');
          return null;
        }
        const delta = type === 'in' ? quantity : -quantity;
        const newStock = rows[0].stock + delta;
        if (newStock < 0) {
          throw conflict(`Stock insuficiente: disponible ${rows[0].stock}, solicitado ${quantity}`);
        }
        await client.query('UPDATE products SET stock = $2, updated_at = NOW() WHERE id = $1', [
          productId,
          newStock,
        ]);
        const inserted = await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, note)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [productId, type, quantity, note ?? null],
        );
        await client.query('COMMIT');
        return { movement: toMovement(inserted.rows[0]), stock: newStock };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createMovementRepository };
