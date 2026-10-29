const API = '/api/v1';
const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const tbody = document.getElementById('products');
const lowStock = document.getElementById('low-stock');
const message = document.getElementById('message');
const summary = document.getElementById('summary');

function showMessage(text, kind) {
  message.textContent = text;
  message.className = `message ${kind}`;
  message.hidden = false;
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function actionButton(label, product, type, quantity, secondary) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (secondary) button.className = 'secondary';
  button.addEventListener('click', () => registerMovement(product, type, quantity, button));
  return button;
}

function render(products) {
  tbody.replaceChildren();
  if (products.length === 0) {
    const tr = document.createElement('tr');
    tr.append(cell('No hay productos para mostrar.', 'muted'));
    tr.firstChild.colSpan = 6;
    tbody.append(tr);
  }
  for (const p of products) {
    const tr = document.createElement('tr');
    const status = cell(
      p.lowStock ? '⚠️ Stock bajo' : '✅ Disponible',
      p.lowStock ? 'status low' : 'status ok',
    );
    status.title = `Stock mínimo: ${p.minStock}`;
    const actions = document.createElement('td');
    actions.className = 'actions';
    actions.append(
      actionButton('Vender 1', p, 'out', 1),
      actionButton('Reponer 5', p, 'in', 5, true),
    );
    tr.append(
      cell(p.name),
      cell(p.category.name, 'muted'),
      cell(clp.format(p.price), 'num'),
      cell(String(p.stock), 'num strong'),
      status,
      actions,
    );
    tbody.append(tr);
  }
}

async function load() {
  const params = new URLSearchParams({ pageSize: '100', sort: 'name' });
  if (lowStock.checked) params.set('lowStock', 'true');
  try {
    const res = await fetch(`${API}/products?${params}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    render(data.items);
    const low = data.items.filter((p) => p.lowStock).length;
    summary.textContent = lowStock.checked
      ? `${data.total} productos con stock bajo`
      : `${data.total} productos · ${low} con stock bajo`;
  } catch (err) {
    showMessage(`No se pudieron cargar los productos: ${err.message}`, 'error');
  }
}

async function registerMovement(product, type, quantity, button) {
  button.disabled = true;
  try {
    const res = await fetch(`${API}/products/${product.id}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, quantity, note: 'Demo web' }),
    });
    const body = await res.json();
    if (!res.ok) {
      showMessage(`No se pudo registrar: ${body.error}`, 'error');
    } else {
      const verb = type === 'out' ? 'Vendiste' : 'Repusiste';
      showMessage(`${verb} ${quantity} × ${product.name}. Stock actual: ${body.stock}.`, 'ok');
    }
    await load();
  } catch (err) {
    showMessage(`Error de conexión: ${err.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

lowStock.addEventListener('change', load);
load();
