// Backend API configuration
const API_CONFIG = {
  baseURL: `${CONFIG.API_URL}`,
  endpoints: {
    products: '/shopitems'  // ASP.NET Core endpoint для получения услуг
  }
};

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

  // Apply backgroundColor to .card-media for keys
  if (product.category === 'keys' && product.backgroundColor) {
    const cardMedia = node.querySelector('.card-media');
    if (cardMedia) {
      cardMedia.style.backgroundColor = product.backgroundColor;
    }
  }

  // Set image handling for keys
  if (product.category === 'keys' && product.title) {
    // Use separate image for each key count
    img.classList.add('key-separate-image');
  }

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

// Format description with commands highlighted
function formatDescription(text) {
  if (!text) return '';

  // Split by lines first to preserve paragraph structure
  const lines = text.split('\n');
  const htmlLines = [];

  lines.forEach(line => {
    if (!line.trim()) {
      // Empty line - add a break
      htmlLines.push('<br>');
      return;
    }

    // Process commands in this line
    const parts = [];
    let currentIndex = 0;
    const commandRegex = /\/[a-zA-Z0-9_]+(?:\s+[^\/\n,;.!?]+)?/g;
    let match;

    while ((match = commandRegex.exec(line)) !== null) {
      // Add text before the command
      if (match.index > currentIndex) {
        const textBefore = line.slice(currentIndex, match.index).trim();
        if (textBefore) {
          parts.push({
            type: 'text',
            content: textBefore
          });
        }
      }

      // Add the command
      parts.push({
        type: 'command',
        content: match[0].trim()
      });

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text in the line
    if (currentIndex < line.length) {
      const remaining = line.slice(currentIndex).trim();
      if (remaining) {
        parts.push({
          type: 'text',
          content: remaining
        });
      }
    }

    // Build HTML for this line
    if (parts.length === 0) {
      // Line with only whitespace
      htmlLines.push(escapeHtml(line.trim()));
    } else {
      parts.forEach((part, index) => {
        if (part.type === 'command') {
          htmlLines.push(`<span class="command-highlight">${escapeHtml(part.content)}</span>`);
        } else {
          htmlLines.push(`<span class="description-text">${escapeHtml(part.content)}</span>`);
        }

        // Add space between parts on the same line
        if (index < parts.length - 1 && parts[index + 1].type !== 'command') {
          htmlLines.push(' ');
        }
      });
    }

    // Add line break after each line
    htmlLines.push('<br>');
  });

  // Remove the last <br> if exists
  if (htmlLines[htmlLines.length - 1] === '<br>') {
    htmlLines.pop();
  }

  return htmlLines.join('');
}

function openModal(product) {
  elements.modalImage.src = product.image || placeholderImage();
  elements.modalImage.alt = product.title;
  elements.modalTitle.textContent = product.title;

  // Format description with commands highlighted
  const formattedNote = formatDescription(product.note);
  if (formattedNote) {
    elements.modalNote.innerHTML = formattedNote;
  } else {
    elements.modalNote.textContent = '';
  }
  elements.modalPrice.textContent = formatPriceRUB(product.price);

  // Apply background color if exists
  const mediaContainer = elements.modalImage.parentElement;
  if (product.backgroundColor) {
    mediaContainer.style.backgroundColor = product.backgroundColor;
  } else {
    mediaContainer.style.backgroundColor = ''; // Reset to default CSS
  }

  // Adjust width if description is empty
  const dialog = elements.modal.querySelector('.modal-dialog');
  if (!product.note) {
    dialog.classList.add('is-narrow');
  } else {
    dialog.classList.remove('is-narrow');
  }

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

    // Special handling for keys category - group by subcategory
    if (category === 'keys') {
      renderKeysGrouped(container, list);
      total += list.length;
    } else {
      const fragment = document.createDocumentFragment();
      list.forEach(p => fragment.appendChild(createCard(p)));
      container.appendChild(fragment);
      total += list.length;
    }
  }

  if (total === 0) {
    elements.emptyState.hidden = false;
  }
}

function renderKeysGrouped(container, keysList) {
  // Group keys by subcategory
  const subcategoryGroups = {};
  keysList.forEach(key => {
    const sub = key.subcategory || 'Другое';
    if (!subcategoryGroups[sub]) {
      subcategoryGroups[sub] = [];
    }
    subcategoryGroups[sub].push(key);
  });

  // Render each subcategory group
  Object.entries(subcategoryGroups).forEach(([subcategory, products]) => {
    // Create group container
    const groupDiv = document.createElement('div');
    groupDiv.className = 'keys-group';

    // Create group header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'keys-group-header';
    headerDiv.textContent = subcategory;
    groupDiv.appendChild(headerDiv);

    // Create cards container
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'keys-group-cards';
    products.forEach(p => cardsDiv.appendChild(createCard(p)));
    groupDiv.appendChild(cardsDiv);

    container.appendChild(groupDiv);
  });
}

async function loadProducts() {
  try {
    // Try to load from backend API
    const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.products}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    // Map backend ShopItem model to frontend format
    // Backend uses PascalCase (Id, Title, etc.), frontend expects camelCase
    state.allProducts = Array.isArray(data) ? data.map(item => ({
      id: item.id || item.Id,
      category: item.category || item.Category,
      subcategory: item.subcategory || item.Subcategory,
      title: item.title || item.Title,
      price: item.price || item.Price,
      image: item.image || item.Image,
      backgroundColor: item.backgroundColor || item.BackgroundColor,
      note: item.description || item.Description || ''
    })) : [];

    elements.notice.hidden = true;
    console.log(`✓ Products loaded from backend API (${state.allProducts.length} items)`);
  } catch (error) {
    console.warn('⚠ Failed to load from backend:', error.message);

    // Fallback to local file
    try {
      console.log('→ Attempting to load from local file...');
      const fallbackRes = await fetch('./data/products.json', {
        headers: { 'Accept': 'application/json' }
      });

      if (!fallbackRes.ok) {
        throw new Error(`Fallback failed: ${fallbackRes.status}`);
      }

      const fallbackData = await fallbackRes.json();
      state.allProducts = Array.isArray(fallbackData) ? fallbackData : (fallbackData.products || []);
      elements.notice.textContent = '⚠ Загружены локальные данные (бэкенд недоступен)';
      elements.notice.hidden = false;
      console.log('✓ Products loaded from local file');
    } catch (fallbackError) {
      console.error('✗ All data sources failed:', fallbackError.message);
      elements.notice.textContent = 'Ошибка при загрузке данных. Пожалуйста, обновите страницу.';
      elements.notice.hidden = false;
      state.allProducts = [];
    }
  }
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

  // Setup rules and feedback modals
  setupRulesModal();
  setupFeedbackModal();
})();

// ============================================
// Rules Modal
// ============================================
function setupRulesModal() {
  const rulesLink = document.querySelector('a[href="#rules"]');
  const rulesModal = document.getElementById('rulesModal');
  const closeButtons = document.querySelectorAll('[data-close-rules]');

  if (!rulesLink || !rulesModal) return;

  rulesLink.addEventListener('click', (e) => {
    e.preventDefault();
    openRulesModal();
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeRulesModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rulesModal.getAttribute('aria-hidden') === 'false') {
      closeRulesModal();
    }
  });
}

function openRulesModal() {
  const rulesModal = document.getElementById('rulesModal');
  rulesModal.setAttribute('aria-hidden', 'false');
}

function closeRulesModal() {
  const rulesModal = document.getElementById('rulesModal');
  rulesModal.setAttribute('aria-hidden', 'true');
}

// ============================================
// Feedback Modal & Telegram Integration
// ============================================
const TELEGRAM_CONFIG = {
  botToken: '8304575234:AAEh5vuo0lbdYC8bKEJ_TOMdnBNcMItCHfM',
  chatId: '-1003288093469'
};

function setupFeedbackModal() {
  const feedbackLink = document.querySelector('a[href="#feedback"]');
  const feedbackModal = document.getElementById('feedbackModal');
  const closeButtons = document.querySelectorAll('[data-close-feedback]');
  const feedbackForm = document.getElementById('feedbackForm');

  if (!feedbackLink || !feedbackModal || !feedbackForm) return;

  feedbackLink.addEventListener('click', (e) => {
    e.preventDefault();
    openFeedbackModal();
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeFeedbackModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && feedbackModal.getAttribute('aria-hidden') === 'false') {
      closeFeedbackModal();
    }
  });

  feedbackForm.addEventListener('submit', handleFeedbackSubmit);
}

function openFeedbackModal() {
  const feedbackModal = document.getElementById('feedbackModal');
  feedbackModal.setAttribute('aria-hidden', 'false');
}

function closeFeedbackModal() {
  const feedbackModal = document.getElementById('feedbackModal');
  feedbackModal.setAttribute('aria-hidden', 'true');
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = document.getElementById('submitFeedback');
  const formMessage = document.getElementById('formMessage');

  // Get form data
  const formData = {
    playerNick: form.playerNick.value.trim(),
    reason: form.reason.value,
    contactMethod: form.contactMethod.value,
    contactInfo: form.contactInfo.value.trim(),
    message: form.message.value.trim()
  };

  // Validate
  if (!formData.playerNick || !formData.reason || !formData.contactMethod || !formData.contactInfo || !formData.message) {
    showFormMessage('Пожалуйста, заполните все поля', 'error');
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  formMessage.hidden = true;

  try {
    await sendToTelegram(formData);
    showFormMessage('✓ Ваше обращение успешно отправлено!', 'success');
    form.reset();

    // Close modal after 2 seconds
    setTimeout(() => {
      closeFeedbackModal();
      formMessage.hidden = true;
    }, 2000);
  } catch (error) {
    console.error('Error sending feedback:', error);
    showFormMessage('Ошибка при отправке. Попробуйте позже.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function sendToTelegram(data) {
  const message = `
🎮 <b>Новое обращение с сайта ElysianLink</b>

👤 <b>Игровой ник:</b> ${escapeHtml(data.playerNick)}
📋 <b>Причина:</b> ${escapeHtml(data.reason)}
💬 <b>Связь:</b> ${escapeHtml(data.contactMethod)} - ${escapeHtml(data.contactInfo)}

📝 <b>Сообщение:</b>
${escapeHtml(data.message)}
  `.trim();

  const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CONFIG.chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API error: ${errorData.description || response.statusText}`);
  }

  return response.json();
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showFormMessage(text, type) {
  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}
