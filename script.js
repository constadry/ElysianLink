// Data sources: prefer GitHub raw, fallback to local file
const API_SOURCES = [
  'https://raw.githubusercontent.com/constadry/ElysianLink/master/data/products.json',
  './data/products.json'
];

const state = {
  allProducts: [],
  activeSubcategory: 'all'
};

const elements = {
  tabs: document.querySelectorAll('.tab-button'),
  cardsByCategory: {
    privileges: document.getElementById('cards-privileges'),
    currency: document.getElementById('cards-currency'),
    keys: document.getElementById('cards-keys'),
    misc: document.getElementById('cards-misc')
  },
  cardTemplate: document.getElementById('cardTemplate'),
  emptyState: document.getElementById('emptyState'),
  notice: document.getElementById('apiNotice'),
  subfilters: document.getElementById('subfilters'),
  subfilterList: document.getElementById('subfilterList'),
  modal: document.getElementById('productModal'),
  modalImage: document.getElementById('modalImage'),
  modalTitle: document.getElementById('modalTitle'),
  modalNote: document.getElementById('modalNote'),
  modalPrice: document.getElementById('modalPrice'),
  modalBuy: document.getElementById('modalBuy')
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
  buyBtn.addEventListener('click', (e) => { e.stopPropagation(); handleBuy(product); });

  // Open modal on card click or Enter key
  node.addEventListener('click', () => openModal(product));
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(product); });

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
  const url = new URL('./payment.html', location.href);
  url.searchParams.set('id', product.id);
  location.href = url.toString();
}

function openModal(product) {
  elements.modalImage.src = product.image || placeholderImage();
  elements.modalImage.alt = product.title;
  elements.modalTitle.textContent = product.title;
  elements.modalNote.textContent = product.note || '';
  elements.modalPrice.textContent = formatPriceRUB(product.price);
  elements.modalBuy.onclick = () => handleBuy(product);
  elements.modal.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', escListener);
}

function closeModal() {
  elements.modal.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', escListener);
}

function escListener(e) { if (e.key === 'Escape') closeModal(); }

function uniqueSubcategories(products) {
  const set = new Set(products.map(p => p.subcategory).filter(Boolean));
  return ['all', ...Array.from(set)];
}

function renderSubfilters() {
  const productsInCategory = state.allProducts.filter(p => p.category === 'keys');
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
      renderAllCategories();
      renderSubfilters();
    });
    elements.subfilterList.appendChild(btn);
  });
}

function renderAllCategories() {
  // Clear all containers
  Object.values(elements.cardsByCategory).forEach(node => node.innerHTML = '');
  elements.emptyState.hidden = true;

  const groups = {
    privileges: [],
    currency: [],
    keys: [],
    misc: []
  };

  for (const p of state.allProducts) {
    if (p.category === 'keys' && state.activeSubcategory !== 'all' && p.subcategory !== state.activeSubcategory) {
      continue;
    }
    if (groups[p.category]) groups[p.category].push(p);
  }

  let total = 0;
  for (const [category, list] of Object.entries(groups)) {
    const container = elements.cardsByCategory[category];
    if (!container) continue;
    if (list.length === 0) continue;
    const fragment = document.createDocumentFragment();
    list.forEach(p => fragment.appendChild(createCard(p)));
    container.appendChild(fragment);
    total += list.length;
  }

  if (total === 0) {
    elements.emptyState.hidden = false;
  }
}

async function loadProducts() {
  for (const url of API_SOURCES) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`Bad response: ${res.status}`);
      const data = await res.json();
      state.allProducts = Array.isArray(data) ? data : (data.products || []);
      elements.notice.hidden = false;
      return;
    } catch (e) {
      console.warn('Fetch failed for', url, e);
      continue;
    }
  }
  // If all sources failed
  state.allProducts = [];
}

function setupTabs() {
  elements.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabs.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const id = `section-${btn.dataset.category}`;
      const target = document.getElementById(id);
      if (target) {
        const header = document.querySelector('.site-header');
        const headerHeight = header ? header.offsetHeight : 92;
        const targetRect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetPosition = targetRect.top + scrollTop - headerHeight - 10; // дополнительный отступ 10px
        window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
      }
    });
  });
}

function setupBurgerMenu() {
  const burgerToggle = document.getElementById('burgerToggle');
  const navTabs = document.querySelector('.nav-tabs');
  if (!burgerToggle || !navTabs) return;

  burgerToggle.addEventListener('click', () => {
    const isExpanded = burgerToggle.getAttribute('aria-expanded') === 'true';
    burgerToggle.setAttribute('aria-expanded', String(!isExpanded));
    navTabs.setAttribute('aria-expanded', String(!isExpanded));
  });

  // Close menu when clicking on a tab (mobile)
  elements.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 1000) {
        burgerToggle.setAttribute('aria-expanded', 'false');
        navTabs.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

// Init
(async function init() {
  setupTabs();
  setupBurgerMenu();
  await loadProducts();
  renderAllCategories();
  renderSubfilters();
  // Modal close bindings
  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
})();


