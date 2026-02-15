// Backend API configuration
const API_CONFIG = {
  baseURL: `${CONFIG.API_URL}`,
  endpoints: {
    products: '/api/shopitems'  // ASP.NET Core endpoint для получения услуг
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
    misc: document.getElementById('cards-misc')
  },
  cardTemplate: document.getElementById('cardTemplate'),
  emptyState: document.getElementById('emptyState'),
  notice: document.getElementById('apiNotice'),
  modal: document.getElementById('productModal'),
  modalImage: document.getElementById('modalImage'),
  modalTitle: document.getElementById('modalTitle'),
  modalNote: document.getElementById('modalNote'),
  modalPrice: document.getElementById('modalPrice'),
  modalBuy: document.getElementById('modalBuy'),
  storeContent: document.getElementById('store-content')
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
  // Enhanced SVG data URL with brand text
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='600' height='667' viewBox='0 0 600 667'>
      <defs>
        <linearGradient id='bg' x1='0' y1='0' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='%230f172a'/>
          <stop offset='100%' stop-color='%231e293b'/>
        </linearGradient>
        <linearGradient id='text-grad' x1='0' y1='0' x2='100%' y2='0%'>
          <stop offset='0%' stop-color='%233e92ff'/>
          <stop offset='100%' stop-color='%2314b8a6'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(%23bg)'/>
      <circle cx='300' cy='333' r='200' fill='rgba(62, 146, 255, 0.03)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='url(%23text-grad)' font-family='Inter, system-ui, Arial' font-size='42' font-weight='800' letter-spacing='-0.5'>arcweave.ru</text>
      <text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' fill='rgba(255,255,255,0.3)' font-family='Inter, system-ui, Arial' font-size='12' font-weight='600' letter-spacing='3'>NOT FOUND</text>
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
function formatDescription(text, product) {
  let itemTerm = 'привилегия';
  let verbEnding = 'а'; // выдана

  if (product) {
    const category = product.category?.toLowerCase();
    const title = product.title?.toLowerCase();

    if (category === 'currency') {
      itemTerm = 'линки будут';
      verbEnding = 'ы'; // выданы
    } else if (title.includes('разбан')) {
      itemTerm = 'разбан будет';
      verbEnding = ''; // выдан
    } else if (title.includes('мут')) {
      itemTerm = 'размут будет';
      verbEnding = ''; // выдан
    } else {
      itemTerm = 'привилегия будет';
      verbEnding = 'а'; // выдана
    }
  } else {
    itemTerm = 'привилегия будет';
    verbEnding = 'а';
  }

  const deliveryNotice = `<div class="description-notice">После завершения оплаты ${itemTerm} автоматически выдан${verbEnding} на ваш аккаунт в течение 5 минут</div>`;

  if (!text) return deliveryNotice;

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

  return htmlLines.join('') + deliveryNotice;
}

function openModal(product) {
  elements.modalImage.src = product.image || placeholderImage();
  elements.modalImage.alt = product.title;
  elements.modalTitle.textContent = product.title;

  // Format description with commands highlighted
  const formattedNote = formatDescription(product.note || product.description, product);
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



function renderSubfilters() {
  // Subfilters were only used for keys, which or now removed.
}

function renderAllCategories() {
  // Clear all containers
  Object.values(elements.cardsByCategory).forEach(node => node.innerHTML = '');
  elements.emptyState.hidden = true;

  const groups = {
    privileges: [],
    currency: [],
    misc: []
  };

  for (const p of state.allProducts) {
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
    state.allProducts = Array.isArray(data) ? data
      .map(item => ({
        id: item.id || item.Id || item.title || item.Title,
        category: item.category || item.Category,
        subcategory: item.subcategory || item.Subcategory,
        title: item.title || item.Title,
        price: item.price || item.Price,
        image: item.image || item.Image,
        backgroundColor: item.backgroundColor || item.BackgroundColor,
        note: item.description || item.Description || ''
      }))
      .filter(p => (p.category !== 'keys' && p.category !== 'Кейсы')) : [];

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
      const rawProducts = Array.isArray(fallbackData) ? fallbackData : (fallbackData.products || []);
      state.allProducts = rawProducts
        .filter(p => (p.category !== 'keys' && p.category !== 'Кейсы'))
        .map(p => ({
          ...p,
          id: p.id || p.Id || p.title || p.Title
        }));
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
      const category = btn.dataset.category;

      // Update all buttons with the same category to be active
      elements.tabs.forEach(b => {
        if (b.dataset.category === category) {
          b.classList.add('is-active');
        } else {
          b.classList.remove('is-active');
        }
      });

      const id = `section-${category}`;
      const target = document.getElementById(id);
      if (target) {
        const header = document.querySelector('.site-header');
        const headerHeight = header ? header.offsetHeight : 92;
        const targetRect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetPosition = targetRect.top + scrollTop - headerHeight - 10;
        window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
      }
    });
  });
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

  // Close menu when clicking on a tab or home item
  const menuItems = mobileMenu.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      toggleMenu(false);
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
  setupTeamModal();
})();


// ============================================
// Rules Modal
// ============================================
function setupRulesModal() {
  const rulesLinks = document.querySelectorAll('a[href="#rules"]');
  const rulesModal = document.getElementById('rulesModal');
  const closeButtons = document.querySelectorAll('[data-close-rules]');

  if (!rulesLinks.length || !rulesModal) return;

  rulesLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openRulesModal();
    });
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
// Feedback Modal & Backend Telegram Integration
// ============================================
// SECURITY: Telegram токен теперь хранится на бекэнде, а не в клиентском коде

function setupFeedbackModal() {
  const feedbackLinks = document.querySelectorAll('a[href="#feedback"]');
  const feedbackModal = document.getElementById('feedbackModal');
  const closeButtons = document.querySelectorAll('[data-close-feedback]');
  const feedbackForm = document.getElementById('feedbackForm');

  if (!feedbackLinks.length || !feedbackModal || !feedbackForm) return;

  feedbackLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openFeedbackModal();
    });
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
    await sendFeedbackToBackend(formData);
    showFormMessage('✓ Ваше обращение успешно отправлено!', 'success');
    form.reset();

    // Close modal after 2 seconds
    setTimeout(() => {
      closeFeedbackModal();
      formMessage.hidden = true;
    }, 2000);
  } catch (error) {
    console.error('Error sending feedback:', error);
    showFormMessage(error.message || 'Ошибка при отправке. Попробуйте позже.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Отправляет обратную связь через безопасный бекэнд API
 * Токен Telegram хранится только на сервере
 */
async function sendFeedbackToBackend(data) {
  const url = `${CONFIG.API_URL}/telegram/feedback`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    // Логируем полный ответ для отладки
    console.error('Backend error response:', result);

    // Обработка ошибок валидации от ASP.NET Core
    const errorMessage = extractErrorMessage(result);
    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Извлекает читаемое сообщение об ошибке из ответа бекэнда
 */
function extractErrorMessage(errorResponse) {
  // Если есть прямое сообщение
  if (errorResponse.message) {
    return errorResponse.message;
  }

  // Если есть errors объект (ASP.NET Core ModelState)
  if (errorResponse.errors) {
    const errors = [];

    // Обрабатываем объект errors
    for (const [field, messages] of Object.entries(errorResponse.errors)) {
      if (Array.isArray(messages)) {
        errors.push(...messages);
      } else if (typeof messages === 'string') {
        errors.push(messages);
      }
    }

    if (errors.length > 0) {
      return errors.join('; ');
    }
  }

  // Если есть title (стандартный формат ProblemDetails)
  if (errorResponse.title) {
    return errorResponse.title;
  }

  // Fallback
  return 'Ошибка при отправке';
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

function showFormMessage(text, type, elementId = 'formMessage') {
  const formMessage = document.getElementById(elementId);
  if (!formMessage) return;
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}

// ============================================
// Team Application Modal
// ============================================
function setupTeamModal() {
  const teamLinks = document.querySelectorAll('a[href="#team"], .team-link');
  const teamModal = document.getElementById('teamModal');
  const closeButtons = document.querySelectorAll('[data-close-team]');
  const teamForm = document.getElementById('teamForm');

  if (!teamModal || !teamForm) return;

  teamLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openTeamModal();
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeTeamModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && teamModal.getAttribute('aria-hidden') === 'false') {
      closeTeamModal();
    }
  });

  teamForm.addEventListener('submit', handleTeamSubmit);
}

function openTeamModal() {
  const teamModal = document.getElementById('teamModal');
  teamModal.setAttribute('aria-hidden', 'false');
}

function closeTeamModal() {
  const teamModal = document.getElementById('teamModal');
  teamModal.setAttribute('aria-hidden', 'true');
}

async function handleTeamSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = document.getElementById('submitTeam');
  const formMessageId = 'teamFormMessage';

  const formData = {
    playerNick: form.teamNick.value.trim(),
    server: form.teamServer.value,
    role: form.teamRole.value,
    hours: form.teamHours.value,
    history: form.teamHistory.value.trim(),
    discord: form.teamDiscord.value.trim(),
    reason: form.teamReason.value.trim()
  };

  submitBtn.disabled = true;
  document.getElementById(formMessageId).hidden = true;

  try {
    await sendTeamApplicationToBackend(formData);
    showFormMessage('✓ Ваша заявка успешно отправлена!', 'success', formMessageId);
    form.reset();

    setTimeout(() => {
      closeTeamModal();
      document.getElementById(formMessageId).hidden = true;
    }, 2500);
  } catch (error) {
    console.error('Error sending team application:', error);
    showFormMessage(error.message || 'Ошибка при отправке. Попробуйте позже.', 'error', formMessageId);
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Отправляет заявку в команду через безопасный бекэнд API
 * Токен Telegram хранится только на сервере
 */
async function sendTeamApplicationToBackend(data) {
  const url = `${CONFIG.API_URL}/telegram/team-application`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    // Логируем полный ответ для отладки
    console.error('Backend error response:', result);

    // Обработка ошибок валидации от ASP.NET Core
    const errorMessage = extractErrorMessage(result);
    throw new Error(errorMessage);
  }

  return result;
}


