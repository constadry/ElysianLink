// Configuration: replace API_URL with your backend endpoint when ready
const API_URL = './data/products.json';

const state = {
  allProducts: [],
  activeCategory: 'privileges',
  activeSubcategory: 'all'
};

const elements = {
  tabs: document.querySelectorAll('.tab-button'),
  cards: document.getElementById('cards'),
  cardTemplate: document.getElementById('cardTemplate'),
  emptyState: document.getElementById('emptyState'),
  notice: document.getElementById('apiNotice'),
  subfilters: document.getElementById('subfilters'),
  subfilterList: document.getElementById('subfilterList')
};

function formatPriceRUB(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(number);
}

function createCard(product) {
  const node = elements.cardTemplate.content.firstElementChild.cloneNode(true);
  const img = node.querySelector('[data-image]');
  const title = node.querySelector('[data-title]');
  const note = node.querySelector('[data-note]');
  const price = node.querySelector('[data-price]');
  const buyBtn = node.querySelector('[data-buy]');
  const badge = node.querySelector('[data-badge]');

  title.textContent = product.title;
  note.textContent = product.note || '';
  price.textContent = formatPriceRUB(product.price);
  buyBtn.addEventListener('click', () => handleBuy(product));

  // Badge like "Выгодно"
  if (product.badge) {
    badge.textContent = product.badge;
    badge.setAttribute('data-visible', 'true');
  } else {
    badge.setAttribute('data-visible', 'false');
  }

  // Image fallback
  img.src = product.image || placeholderImage();
  img.alt = product.title;
  img.addEventListener('error', () => { img.src = placeholderImage(); });

  return node;
}

function placeholderImage() {
  // Simple SVG data URL with blue gradient
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
      <defs>
        <linearGradient id='g' x1='0' x2='1'>
          <stop offset='0%' stop-color='%231379ff'/>
          <stop offset='100%' stop-color='%2314b8a6'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(%23g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Inter, Arial' font-size='28'>AresMine</text>
    </svg>
  `);
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
}

function handleBuy(product) {
  // Placeholder: integrate your payment flow here
  alert(`Покупка: ${product.title} — ${formatPriceRUB(product.price)}`);
}

function uniqueSubcategories(products) {
  const set = new Set(products.map(p => p.subcategory).filter(Boolean));
  return ['all', ...Array.from(set)];
}

function renderSubfilters(category) {
  const productsInCategory = state.allProducts.filter(p => p.category === category);
  const subs = uniqueSubcategories(productsInCategory);
  if (subs.length <= 1) {
    elements.subfilters.hidden = true;
    elements.subfilterList.innerHTML = '';
    state.activeSubcategory = 'all';
    return;
  }
  elements.subfilters.hidden = false;
  elements.subfilterList.innerHTML = '';
  subs.forEach(sub => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'subfilter-button' + (sub === state.activeSubcategory ? ' is-active' : '');
    btn.textContent = sub === 'all' ? 'Все' : sub;
    btn.addEventListener('click', () => {
      state.activeSubcategory = sub;
      render();
      renderSubfilters(category);
    });
    elements.subfilterList.appendChild(btn);
  });
}

function render() {
  const { activeCategory, activeSubcategory } = state;
  elements.cards.innerHTML = '';

  let list = state.allProducts.filter(p => p.category === activeCategory);
  if (activeSubcategory !== 'all') {
    list = list.filter(p => p.subcategory === activeSubcategory);
  }

  if (list.length === 0) {
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;
  const fragment = document.createDocumentFragment();
  list.forEach(p => fragment.appendChild(createCard(p)));
  elements.cards.appendChild(fragment);
}

async function loadProducts() {
  try {
    const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Bad response');
    const data = await res.json();
    // Expecting an array of products
    state.allProducts = Array.isArray(data) ? data : (data.products || []);
    elements.notice.hidden = false;
  } catch (e) {
    // Fallback to empty list; UI will show empty state if needed
    console.warn('Failed to fetch products:', e);
    state.allProducts = [];
  }
}

function setupTabs() {
  elements.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabs.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.activeCategory = btn.dataset.category;
      state.activeSubcategory = 'all';
      render();
      renderSubfilters(state.activeCategory);
    });
  });
}

// Init
(async function init() {
  setupTabs();
  await loadProducts();
  render();
  renderSubfilters(state.activeCategory);
})();


