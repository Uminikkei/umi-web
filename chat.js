// UMI Chat Assistant
let chatLanguage = 'es';
let conversationHistory = [];
let isLoading = false;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatWidget = document.getElementById('chatWidget');
const chatToggleBtn = document.getElementById('chatToggleBtn');

// ── Garzonas disponibles ──────────────────────────────────────────────────────
const GARZONAS = {
  yani:   { name: 'Jean',   img: 'garzona.png', genero: 'f' },
  laura:  { name: 'Laura',  img: 'laura.png',   genero: 'f' },
  juliet: { name: 'Juliet', img: 'juliet.png',  genero: 'f' },
  sam:    { name: 'Sam',    img: 'sam.png',     genero: 'm' },
  fran:   { name: 'Fran',   img: 'fran.png',    genero: 'm' }
};
let garzonaId = localStorage.getItem('umiGarzona') || 'yani';
if (!GARZONAS[garzonaId]) garzonaId = 'yani';

function applyGarzonaUI() {
  const g = GARZONAS[garzonaId];
  const av = document.getElementById('chatAvatar');
  const tg = document.getElementById('chatToggleImg');
  const nm = document.getElementById('chatGarzonaName');
  if (av) av.src = g.img;
  if (tg) tg.src = g.img;
  if (nm) nm.textContent = g.name;
  document.querySelectorAll('.garzona-opt').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('opt' + garzonaId.charAt(0).toUpperCase() + garzonaId.slice(1));
  if (btn) btn.classList.add('active');
}

function selectGarzona(id) {
  if (!GARZONAS[id] || id === garzonaId) return;
  garzonaId = id;
  localStorage.setItem('umiGarzona', id);
  applyGarzonaUI();
  // Sin mensaje de presentación: el nuevo garzón simplemente sigue atendiendo.
  // Si es el primer mensaje del chat (solo saludo inicial), actualizarlo al nuevo nombre.
  const msgs = chatMessages.querySelectorAll('.chat-msg');
  if (msgs.length === 1) {
    const firstMsg = chatMessages.querySelector('.bot-msg p');
    if (firstMsg) firstMsg.textContent = greetings[chatLanguage](GARZONAS[garzonaId]);
  }
}

// Initial greeting based on language
const greetings = {
  es: (g) => `¡Hola! Soy ${g.name}, tu ${g.genero === 'm' ? 'garzón' : 'garzona'} virtual en Umi. ¿Cómo puedo ayudarte hoy?`,
  en: (g) => `Hi! I'm ${g.name}, your virtual ${g.genero === 'm' ? 'waiter' : 'waitress'} at Umi. How can I help you today?`
};

const placeholders = {
  es: 'Escribe tu pregunta...',
  en: 'Type your question...'
};

const placeholderTexts = {
  es: '¿Qué platos recomendas?',
  en: 'What dishes do you recommend?'
};

function toggleChatWidget() {
  chatWidget.classList.toggle('open');
  if (chatWidget.classList.contains('open')) {
    chatInput.focus();
  }
}

function closeChatWidget() {
  chatWidget.classList.remove('open');
}

let isTranslating = false;

async function switchChatLanguage(lang) {
  if (lang === chatLanguage || isTranslating) return;
  chatLanguage = lang;

  // Update active button
  document.getElementById('langEs').classList.toggle('active', lang === 'es');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');

  // Update placeholder
  chatInput.placeholder = placeholders[lang];

  // Traduce TODO el chat al idioma elegido
  await translateChat(lang);
}

function setLangButtonsDisabled(disabled) {
  const a = document.getElementById('langEs');
  const b = document.getElementById('langEn');
  if (a) a.disabled = disabled;
  if (b) b.disabled = disabled;
}

// Traduce todos los mensajes visibles al idioma destino.
// - El saludo se regenera con el texto canónico (incluye el nombre del garzón).
// - Cada mensaje guarda su versión por idioma, así volver atrás es instantáneo y sin degradar.
async function translateChat(target) {
  const msgs = Array.from(chatMessages.querySelectorAll('.chat-msg'));
  const pending = []; // { el, text }

  msgs.forEach(el => {
    // Saludo inicial: se regenera canónicamente (no se manda a traducir)
    if (el.dataset.greeting) {
      const g = greetings[target] && greetings[target](GARZONAS[garzonaId]);
      if (g) {
        renderMsgText(el, g);
        el._i18n = el._i18n || {};
        el._i18n[target] = g;
        el._lang = target;
      }
      return;
    }

    el._i18n = el._i18n || {};
    if (el._i18n[target] != null) {
      // Ya tenemos esta versión cacheada
      renderMsgText(el, el._i18n[target]);
      el._lang = target;
      return;
    }

    const src = el._i18n[el._lang] != null
      ? el._i18n[el._lang]
      : (el.querySelector('p') ? el.querySelector('p').textContent : '');
    if (src && src.trim()) pending.push({ el, text: src });
  });

  if (!pending.length) return;

  isTranslating = true;
  setLangButtonsDisabled(true);
  chatMessages.classList.add('translating');

  try {
    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: pending.map(p => p.text), target })
    });
    if (!resp.ok) throw new Error('translate failed ' + resp.status);
    const data = await resp.json();
    const translations = (data && data.translations) || [];
    pending.forEach((p, i) => {
      const t = translations[i] != null ? translations[i] : p.text;
      renderMsgText(p.el, t);
      p.el._i18n[target] = t;
      p.el._lang = target;
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    console.error('[CHAT] translate error:', e.message);
  } finally {
    isTranslating = false;
    setLangButtonsDisabled(false);
    chatMessages.classList.remove('translating');
  }
}

function onChatKeyPress(event) {
  if (event.key === 'Enter' && !isLoading) {
    sendChatMessage();
  }
}

function addChatMessage(text, isUser = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${isUser ? 'user-msg' : 'bot-msg'}`;

  const p = document.createElement('p');

  if (isUser) {
    p.textContent = text;
  } else {
    // Renderiza formato básico del bot de forma segura (sin innerHTML):
    // - **negrita**  -> <strong>
    // - saltos de línea -> <br>
    renderFormatted(p, text);
  }

  msgDiv.appendChild(p);
  // Caché por idioma para traducir el chat al cambiar ES <-> EN (sin perder el original)
  msgDiv._isUser = isUser;
  msgDiv._lang = chatLanguage;
  msgDiv._i18n = { [chatLanguage]: text };
  chatMessages.appendChild(msgDiv);

  // Auto-scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Reemplaza el texto de un mensaje ya existente (respeta formato del bot)
function renderMsgText(msgDiv, text) {
  const p = msgDiv.querySelector('p');
  if (!p) return;
  if (msgDiv._isUser) {
    p.textContent = text;
  } else {
    p.textContent = '';
    renderFormatted(p, text);
  }
}

// Convierte **negrita** y saltos de línea en nodos DOM reales (seguro contra XSS)
function renderFormatted(parent, text) {
  const lines = text.split('\n');
  lines.forEach((rawLine, lineIndex) => {
    let line = rawLine;

    // Línea de viñeta: empieza con "- " o "* " -> usar "• " con sangría
    const isBullet = /^\s*[-*]\s+/.test(line);
    if (isBullet) {
      line = line.replace(/^\s*[-*]\s+/, '');
      const bullet = document.createElement('span');
      bullet.className = 'chat-bullet';
      bullet.textContent = '• ';
      parent.appendChild(bullet);
    }

    // Divide la línea por **...** manteniendo los delimitadores
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach(part => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        parent.appendChild(strong);
      } else if (part) {
        parent.appendChild(document.createTextNode(part));
      }
    });
    if (lineIndex < lines.length - 1) {
      parent.appendChild(document.createElement('br'));
    }
  });
}

// ── Agregar platos al carrito desde el bot ──────────────────────────────────
// El asistente marca los platos a agregar con [[AGREGAR: Nombre]] al final
// de su respuesta. Aquí se procesan: se agregan al carrito y se quitan del texto.
function findMenuItem(name) {
  if (typeof MENU === 'undefined') return null;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const target = norm(name);
  // 1) coincidencia exacta
  for (const [cat, items] of Object.entries(MENU)) {
    for (const it of items) {
      if (norm(it.n) === target) return { cat, item: it };
    }
  }
  // 2) coincidencia parcial
  for (const [cat, items] of Object.entries(MENU)) {
    for (const it of items) {
      if (norm(it.n).includes(target) || target.includes(norm(it.n))) return { cat, item: it };
    }
  }
  return null;
}

function processCartCommands(text) {
  const added = [];
  const clean = text.replace(/\s*\[\[\s*(?:AGREGAR|ADD)\s*:\s*([^\]]+)\]\]/gi, (m, name) => {
    const found = findMenuItem(name);
    if (found && typeof addToCart === 'function') {
      addToCart(found.item.n, found.item.p, found.item.e, found.cat);
      added.push(found.item.n);
    }
    return '';
  }).trim();
  return { clean, added };
}

function showTypingIndicator() {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg bot-msg';
  msgDiv.id = 'typing-indicator';

  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';

  msgDiv.appendChild(typing);
  chatMessages.appendChild(msgDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

async function sendChatMessage() {
  const message = chatInput.value.trim();

  if (!message || isLoading) {
    return;
  }

  isLoading = true;

  // Disable send button
  const sendBtn = document.querySelector('.chat-send-btn');
  sendBtn.classList.add('loading');
  sendBtn.disabled = true;

  // Add user message to UI
  addChatMessage(message, true);
  chatInput.value = '';

  // Show typing indicator
  showTypingIndicator();

  try {
    const response = await fetch('/api/chat-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        language: chatLanguage,
        garzona: GARZONAS[garzonaId].name,
        genero: GARZONAS[garzonaId].genero,
        conversationHistory: conversationHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[CHAT] API Error:', response.status, errorData);
      throw new Error(errorData.error || `API Error ${response.status}`);
    }

    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator();

    // Procesar comandos de carrito y mostrar respuesta limpia
    const { clean, added } = processCartCommands(data.message);
    if (clean) {
      addChatMessage(clean, false);
    } else if (added.length) {
      const confirm = chatLanguage === 'en'
        ? `Done! I added ${added.join(', ')} to your order.`
        : `¡Listo! Agregué ${added.join(', ')} a tu pedido.`;
      addChatMessage(confirm, false);
    }

    // Update conversation history
    conversationHistory = data.conversationHistory;

  } catch (error) {
    removeTypingIndicator();

    const errorMessages = {
      es: 'Oops, algo salió mal. Por favor intenta de nuevo.',
      en: 'Oops, something went wrong. Please try again.'
    };

    addChatMessage(errorMessages[chatLanguage], false);
    console.error('[CHAT] Catch error:', error.message);
  } finally {
    isLoading = false;

    // Re-enable send button
    sendBtn.classList.remove('loading');
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Initialize chat
function initChat() {
  applyGarzonaUI();

  // Set initial greeting
  const greetDiv = chatMessages.querySelector('.bot-msg');
  const firstMsg = greetDiv && greetDiv.querySelector('p');
  if (firstMsg) {
    firstMsg.textContent = greetings[chatLanguage](GARZONAS[garzonaId]);
  }
  // Marca el saludo para que al traducir se regenere (no se envíe a la API)
  if (greetDiv) {
    greetDiv.dataset.greeting = '1';
    greetDiv._isUser = false;
    greetDiv._lang = chatLanguage;
    greetDiv._i18n = { [chatLanguage]: firstMsg ? firstMsg.textContent : '' };
  }

  // Set initial language
  document.getElementById('langEs').classList.add('active');
}

// Call init when DOM is ready
document.addEventListener('DOMContentLoaded', initChat);
