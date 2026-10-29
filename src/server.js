// Servidor para desarrollo local y Docker.
const { loadConfig } = require('./config');
const app = require('./index');

const { port } = loadConfig();
const server = app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
