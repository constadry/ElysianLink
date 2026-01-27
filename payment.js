// Backend API configuration from config.js
const API_CONFIG = {
  baseURL: typeof CONFIG !== 'undefined' ? CONFIG.API_URL : 'https://localhost:7089',
  endpoints: {
    products: '/shopitems'
  }
};

const qs = new URLSearchParams(location.search);
const productId = decodeURIComponent(qs.get('id') || '');

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
  // 1. Try backend API first (matching script.js logic)
  try {
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.products}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      return (Array.isArray(data) ? data : [])
        .map(item => ({
          id: item.id || item.Id || item.title || item.Title,
          title: item.title || item.Title,
          price: item.price || item.Price,
          category: item.category || item.Category
        }))
        .filter(p => (p.category !== 'keys' && p.category !== 'Кейсы'));
    }
  } catch (backendError) {
    console.warn('Backend fetch failed on payment page:', backendError.message);
  }

  // 2. Fallback to local data
  const sources = [
    './data/products.json',
    'https://raw.githubusercontent.com/constadry/ArcWeave/master/data/products.json'
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      const rawProducts = Array.isArray(data) ? data : (data.products || []);
      return rawProducts
        .filter(p => (p.category !== 'keys' && p.category !== 'Кейсы'))
        .map(p => ({
          ...p,
          id: p.id || p.Id || p.title || p.Title
        }));
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
  if (!productId || productId === 'undefined' || productId === 'null') {
    ui.notFound.hidden = false;
    return;
  }

  const products = await fetchProducts();
  // Find by ID (which could be the title if ID was missing)
  const product = products.find(p => String(p.id) === productId);

  if (!product) {
    console.warn('Product not found for ID:', productId);
    ui.notFound.hidden = false;
    return;
  }

  ui.title.textContent = product.title;
  ui.price.textContent = formatPriceRUB(product.price);
  ui.card.hidden = false;

  // Wire validation
  ['input', 'change'].forEach(ev => {
    ui.nick?.addEventListener(ev, validate);
    ui.email?.addEventListener(ev, validate);
    ui.agree?.addEventListener(ev, validate);
  });
  validate();

  ui.cancelBtn?.addEventListener('click', () => history.back());
  ui.form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (typeof PaymentIntegration === 'undefined') {
      alert('Ошибка: Платежный модуль не загружен. Пожалуйста, обновите страницу.');
      return;
    }

    const orderId = `order_${Date.now()}_${ui.nick.value}`;

    // T-Bank Integration configuration
    const paymentData = {
      terminalKey: CONFIG.TINKOFF_TERMINAL_KEY,
      amount: product.price,
      orderId: orderId,
      description: `Покупка товара: ${product.title} (Ник: ${ui.nick.value})`,
      customerKey: ui.nick.value,
      email: ui.email.value,
      // Optional: you can add more fields if needed (receipt, etc.)
      receipt: {
        Email: ui.email.value,
        Taxation: 'usn_income',
        Items: [
          {
            Name: product.title,
            Price: product.price * 100, // in kopeks
            Quantity: 1.00,
            Amount: product.price * 100,
            Tax: 'none'
          }
        ]
      }
    };

    PaymentIntegration.pay(paymentData)
      .then(result => {
        console.log('Payment result:', result);
        // Successful payment logic (usually just closed widget, status should be verified on backend)
      })
      .catch(error => {
        console.error('Payment error:', error);
        alert('Произошла ошибка при инициализации оплаты: ' + (error.message || error));
      });
  });
}

init();
