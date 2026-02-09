// Backend API configuration from config.js
const API_CONFIG = {
  baseURL: typeof CONFIG !== 'undefined' ? CONFIG.API_URL : 'https://localhost:7089',
  endpoints: {
    products: '/shopitems'
  }
};

const qs = new URLSearchParams(location.search);
const productId = decodeURIComponent(qs.get('id') || '');
let currentProduct = null;
let isSubmitting = false;

// Prevent double script initialization
if (window.__PAYMENT_PAGE_INITIALIZED) {
  console.warn('Payment script already initialized, skipping.');
} else {
  window.__PAYMENT_PAGE_INITIALIZED = true;
  init();
}

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
  currentProduct = product;

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
  ui.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting || !validate()) return;

    isSubmitting = true;
    ui.payBtn.disabled = true;
    const originalBtnText = ui.payBtn.textContent;
    ui.payBtn.textContent = 'Переход к оплате...';

    const payload = {
      nick: ui.nick.value,
      email: ui.email.value,
      productId: currentProduct ? currentProduct.id : productId,
      title: currentProduct ? currentProduct.title : 'Товар',
      amount: currentProduct ? currentProduct.price : 0,
      orderId: `order_${Date.now()}_${ui.nick.value}`,
      description: `Покупка: ${currentProduct ? currentProduct.title : 'Товар'} (Ник: ${ui.nick.value})`
    };

    console.log('Initiating payment with payload:', payload);

    try {
      const url = `${API_CONFIG.baseURL}/api/payment/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const res = await response.json();
      const redirectUrl = res.url || res.paymentUrl;

      if (res && redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error(`Некорректный ответ от сервера (поле url отсутствует). Получено: ${JSON.stringify(res)}`);
      }
    } catch (err) {
      console.error('Payment init error:', err);
      alert('Ошибка инициализации платежа: ' + (err.message || 'неизвестная ошибка'));
      isSubmitting = false;
      ui.payBtn.disabled = false;
      ui.payBtn.textContent = originalBtnText;
    }
  });

  setupBurgerMenu();
}

function setupBurgerMenu() {
  const burgerToggle = document.getElementById('burgerToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuClose = document.getElementById('menuClose');

  if (!burgerToggle || !mobileMenu) return;

  const toggleMenu = (show) => {
    const isExpanded = mobileMenu.getAttribute('aria-expanded') === 'true';
    const nextState = typeof show === 'boolean' ? show : !isExpanded;

    burgerToggle.setAttribute('aria-expanded', String(nextState));
    mobileMenu.setAttribute('aria-expanded', String(nextState));
    document.body.style.overflow = nextState ? 'hidden' : '';
  };

  burgerToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  if (menuClose) {
    menuClose.addEventListener('click', () => toggleMenu(false));
  }

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileMenu.getAttribute('aria-expanded') === 'true' &&
      !mobileMenu.contains(e.target) &&
      !burgerToggle.contains(e.target)) {
      toggleMenu(false);
    }
  });

  // Close menu when clicking on a menu item
  const menuItems = mobileMenu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      toggleMenu(false);
    });
  });
}

/**
 * Initiates a refund/cancellation of a payment.
 * Requires providing the receipt items for 54-FZ compliance.
 * 
 * @param {string} paymentId - The payment ID from T-Bank
 * @param {number} amountRub - Refund amount in RUB
 * @param {string} email - Customer email
 * @param {Array<{Name:string, Price:number, Quantity:number, Amount:number, Tax:string}>} items - List of items. Price and Amount in kopecks.
 */
window.doRefund = async function (paymentId, amountRub, email, items) {
  if (!paymentId || !amountRub || !email || !items || !items.length) {
    console.error('doRefund: Missing required arguments (paymentId, amount, email, items)');
    return;
  }

  const payload = {
    paymentId: paymentId,
    amount: amountRub,
    email: email,
    items: items
  };

  console.log('Initiating refund with payload:', payload);

  try {
    const url = `${API_CONFIG.baseURL}/api/payment/cancel`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Refund response:', result);

    if (result.Success || result.success) { // Handle PascalCase or camelCase
      alert(`Возврат успешно оформлен! Статус: ${result.Status}`);
    } else {
      alert(`Ошибка при возврате: ${result.Message || result.message || 'Unknown error'}`);
    }
    return result;

  } catch (err) {
    console.error('Refund error:', err);
    alert('Ошибка запроса возврата: ' + err.message);
  }
};
