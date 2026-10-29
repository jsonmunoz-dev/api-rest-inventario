const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const SPEC_PATH = path.join(__dirname, 'openapi.yaml');

function loadSpec() {
  return YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
}

module.exports = { loadSpec, SPEC_PATH };
