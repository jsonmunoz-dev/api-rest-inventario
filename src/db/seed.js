const { createPool } = require('./pool');

const categories = [
  ['Computación', 'Notebooks, monitores y periféricos'],
  ['Redes', 'Routers, switches y cableado'],
  ['Almacenamiento', 'Discos y memorias'],
];

const products = [
  ['NB-001', 'Notebook 14" Ryzen 5', 549990, 12, 3, 'Computación'],
  ['MON-024', 'Monitor 24" IPS', 129990, 25, 5, 'Computación'],
  ['TEC-101', 'Teclado mecánico', 39990, 4, 5, 'Computación'],
  ['RT-AX3', 'Router Wi-Fi 6', 69990, 8, 2, 'Redes'],
  ['SW-08', 'Switch 8 puertos gigabit', 24990, 15, 4, 'Redes'],
  ['SSD-1TB', 'SSD NVMe 1TB', 64990, 30, 10, 'Almacenamiento'],
  ['USB-64', 'Pendrive 64GB', 7990, 2, 10, 'Almacenamiento'],
];

async function seed(pool) {
  for (const [name, description] of categories) {
    await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [name, description],
    );
  }
  for (const [sku, name, price, stock, minStock, category] of products) {
    await pool.query(
      `INSERT INTO products (sku, name, price, stock, min_stock, category_id)
       SELECT $1, $2, $3, $4, $5, id FROM categories WHERE name = $6
       ON CONFLICT (sku) DO NOTHING`,
      [sku, name, price, stock, minStock, category],
    );
  }
  console.log('Datos de ejemplo cargados');
}

if (require.main === module) {
  require('dotenv').config();
  const pool = createPool(process.env.DATABASE_URL);
  seed(pool)
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
