const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');

// Archivos de la página de inicio, leídos una sola vez al arrancar.
const webAssets = {
  '/': { type: 'html', content: read('index.html') },
  '/app.js': { type: 'js', content: read('app.js') },
  '/styles.css': { type: 'css', content: read('styles.css') },
};

module.exports = { webAssets };
