// Same data sources as on main page
const API_SOURCES = [
  'https://raw.githubusercontent.com/constadry/ArcWeave/master/data/products.json',
  './data/products.json'
];

const qs = new URLSearchParams(location.search);
const productId = qs.get('id');

const ui = {
  card: document.getElementById('payCard'),
  notFound: document.getElementById('notFound'),
  title: document.getElementById('productTitle'),
  price: document.getElementById('productPrice'),
  form: document.getElementById('payForm'),
  nick: document.getElementById('nick'),
  email: document.getElementById('email'),
  agree: document.getElementById('agree'),
  nickErr: document.getElementById('nickErr'),
  emailErr: document.getElementById('emailErr'),
  payBtn: document.getElementById('payBtn'),
  cancelBtn: document.getElementById('cancelBtn')
};

function formatPriceRUB(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(number);
}

async function fetchProducts() {
  for (const url of API_SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products || []);
    } catch (e) {
      // try next source
    }
  }
  return [];
}

function validate() {
  const nickValid = ui.nick.value.trim().length >= 2;
  const emailValid = /^\S+@\S+\.\S+$/.test(ui.email.value.trim());
  const agreeValid = ui.agree.checked;

  ui.nickErr.setAttribute('aria-hidden', String(nickValid));
  ui.emailErr.setAttribute('aria-hidden', String(emailValid));

  const allValid = nickValid && emailValid && agreeValid;
  ui.payBtn.disabled = !allValid;
  return allValid;
}

async function init() {
  if (!productId) {
    ui.notFound.hidden = false;
    return;
  }

  const products = await fetchProducts();
  const product = products.find(p => p.id === productId);
  if (!product) {
    ui.notFound.hidden = false;
    return;
  }

  ui.title.textContent = product.title;
  ui.price.textContent = formatPriceRUB(product.price);
  ui.card.hidden = false;

  // Wire validation
  ['input', 'change'].forEach(ev => {
    ui.nick.addEventListener(ev, validate);
    ui.email.addEventListener(ev, validate);
    ui.agree.addEventListener(ev, validate);
  });
  validate();

  ui.cancelBtn.addEventListener('click', () => history.back());
  ui.form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Stub payment processing
    alert(`Заказ оформлен: ${product.title}\nНик: ${ui.nick.value}\nПочта: ${ui.email.value}`);
  });
}

init();


