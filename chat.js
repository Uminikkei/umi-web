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

function switchChatLanguage(lang) {
  chatLanguage = lang;

  // Update active button
  document.getElementById('langEs').classList.toggle('active', lang === 'es');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');

  // Update placeholder
  chatInput.placeholder = placeholders[lang];
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
  chatMessages.appendChild(msgDiv);

  // Auto-scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  const firstMsg = chatMessages.querySelector('.bot-msg p');
  if (firstMsg) {
    firstMsg.textContent = greetings[chatLanguage](GARZONAS[garzonaId]);
  }

  // Set initial language
  document.getElementById('langEs').classList.add('active');
}

// Call init when DOM is ready
document.addEventListener('DOMContentLoaded', initChat);
