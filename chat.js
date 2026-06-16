// UMI Chat Assistant
let chatLanguage = 'es';
let conversationHistory = [];
let isLoading = false;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatWidget = document.getElementById('chatWidget');
const chatToggleBtn = document.getElementById('chatToggleBtn');

// Initial greeting based on language
const greetings = {
  es: '¡Hola! 👋 Soy tu asistente de Umi. ¿Cómo puedo ayudarte hoy?',
  en: 'Hello! 👋 I\'m Umi\'s assistant. How can I help you today?'
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
  lines.forEach((line, lineIndex) => {
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

    // Add bot response
    addChatMessage(data.message, false);

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
  // Set initial greeting
  const firstMsg = chatMessages.querySelector('.bot-msg p');
  if (firstMsg) {
    firstMsg.textContent = greetings[chatLanguage];
  }

  // Set initial language
  document.getElementById('langEs').classList.add('active');
}

// Call init when DOM is ready
document.addEventListener('DOMContentLoaded', initChat);
