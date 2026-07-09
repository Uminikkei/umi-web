// UMI Nikkei Bar - script v2
// ── SCROLLBAR PROPIO (flota sobre el contenido, sin gutter/fondo nativo) ────────
(function(){
  const track = document.createElement('div');
  track.className = 'umi-scrollbar';
  const thumb = document.createElement('div');
  thumb.className = 'umi-scrollbar-thumb';
  track.appendChild(thumb);
  // Flechas arriba/abajo: para subir/bajar con clic si el cliente no alcanza la barra
  const up = document.createElement('button');
  up.className = 'umi-scrollbar-arrow umi-scrollbar-arrow--up';
  up.setAttribute('aria-label', 'Subir');
  const down = document.createElement('button');
  down.className = 'umi-scrollbar-arrow umi-scrollbar-arrow--down';
  down.setAttribute('aria-label', 'Bajar');
  track.appendChild(up);
  track.appendChild(down);
  document.body.appendChild(track);

  function pageScroll(dir){
    window.scrollBy({ top: window.innerHeight * 0.85 * dir, left: 0, behavior: 'smooth' });
  }
  up.addEventListener('click', () => pageScroll(-1));
  down.addEventListener('click', () => pageScroll(1));

  const PAD = 20;          // espacio reservado arriba/abajo para las flechas
  const MIN_THUMB = 30;
  let dragging = false, dragStartY = 0, dragStartScroll = 0;
  let lastScrollTop = -1, lastFullH = -1, lastViewH = -1;

  function update(){
    const doc = document.scrollingElement || document.documentElement;
    const viewH = window.innerHeight;
    const fullH = doc.scrollHeight;
    const scrollTop = doc.scrollTop;
    if (scrollTop === lastScrollTop && fullH === lastFullH && viewH === lastViewH) return;
    lastScrollTop = scrollTop; lastFullH = fullH; lastViewH = viewH;
    if (fullH <= viewH + 2){ track.style.display = 'none'; return; }
    track.style.display = 'block';
    const travel = Math.max(1, viewH - 2 * PAD);
    const thumbH = Math.max(MIN_THUMB, (viewH / fullH) * travel);
    const maxThumbTop = travel - thumbH;
    const maxScroll = fullH - viewH;
    const thumbTop = PAD + (maxScroll > 0 ? scrollTop / maxScroll * maxThumbTop : 0);
    thumb.style.height = thumbH + 'px';
    thumb.style.top = thumbTop + 'px';
  }

  function loop(){
    update();
    requestAnimationFrame(loop);
  }

  thumb.addEventListener('mousedown', (e) => {
    dragging = true;
    dragStartY = e.clientY;
    dragStartScroll = (document.scrollingElement || document.documentElement).scrollTop;
    thumb.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.documentElement.style.scrollBehavior = 'auto';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const doc = document.scrollingElement || document.documentElement;
    const viewH = window.innerHeight;
    const fullH = doc.scrollHeight;
    const travel = Math.max(1, viewH - 2 * PAD);
    const thumbH = Math.max(MIN_THUMB, (viewH / fullH) * travel);
    const maxThumbTop = travel - thumbH;
    const maxScroll = fullH - viewH;
    const deltaY = e.clientY - dragStartY;
    const deltaScroll = maxThumbTop > 0 ? (deltaY / maxThumbTop) * maxScroll : 0;
    doc.scrollTop = dragStartScroll + deltaScroll;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    thumb.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.documentElement.style.scrollBehavior = '';
  });

  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
  requestAnimationFrame(loop);
})();

// ── SONIDO AMBIENTE: OLAS QUE ROMPEN EN LA COSTA ───────────────────────────────
// Grabación real de playa (CC0, dominio público): olas rompiendo + aves. Arranque
// inmediato con autoplay silenciado (permitido) y suena al primer gesto del usuario;
// el botón de la esquina lo silencia y recuerda la elección.
(function(){
  const btn = document.getElementById('soundToggle');
  const audio = document.getElementById('oceanAudio');
  if(!btn || !audio){ if(btn) btn.style.display = 'none'; return; }
  audio.volume = 0.5;
  let userMuted = localStorage.getItem('umiMuted') === '1';

  function tryPlay(){ const p = audio.play(); if(p && p.catch) p.catch(()=>{}); }

  // Empieza de inmediato en silencio (el autoplay silenciado está permitido); el sonido
  // se activa en cuanto el usuario interactúa (política de autoplay de los navegadores).
  audio.muted = true;
  tryPlay();
  const EV = ['pointerdown','touchstart','keydown','scroll','mousemove','click'];
  function firstGesture(){
    EV.forEach(ev => window.removeEventListener(ev, firstGesture, true));
    if(!userMuted) audio.muted = false;
    tryPlay();
  }
  EV.forEach(ev => window.addEventListener(ev, firstGesture, {passive:true, capture:true}));

  btn.classList.toggle('muted', userMuted);
  window.toggleSound = function(){
    userMuted = !userMuted;
    localStorage.setItem('umiMuted', userMuted ? '1' : '0');
    audio.muted = userMuted;
    if(!userMuted) tryPlay();
    btn.classList.toggle('muted', userMuted);
  };
})();

// ── BOTÓN VOLVER AL INICIO ─────────────────────────────────────────────────────
window.scrollToTop = function(){ window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); };
(function(){
  const btt = document.getElementById('backToTop');
  if(!btt) return;
  const upd = () => btt.classList.toggle('show', (window.scrollY || document.documentElement.scrollTop || 0) > 320);
  window.addEventListener('scroll', upd, {passive:true});
  window.addEventListener('resize', upd);
  upd();
})();

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const WA = '56961551728';
const BASE = 'https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/';

// Ícono 2D de plato para productos sin foto
const PLATE_SVG = '<svg viewBox="0 0 36 26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="13" r="9"/><circle cx="18" cy="13" r="4"/><path d="M4 3v5a2 2 0 0 0 4 0V3"/><path d="M6 10v13"/><path d="M31 3c-1.6 1.2-2 3.2-2 5.5V13h3v10"/></svg>';
window.__plateSpan = `<span class="cart-row-emoji">${PLATE_SVG}</span>`;

const RESTO_LAT = -29.9641;
const RESTO_LNG = -71.3387;
const DELIVERY_TIERS = [
  { maxKm:  3.4, price:  2500 },
  { maxKm:  4.4, price:  3000 },
  { maxKm:  5.4, price:  3500 },
  { maxKm:  6.4, price:  4000 },
  { maxKm:  7.4, price:  4500 },
  { maxKm:  8.4, price:  5000 },
  { maxKm:  9.4, price:  5500 },
  { maxKm: 10.4, price:  6000 },
  { maxKm: 11.4, price:  6500 },
  { maxKm: 12.4, price:  7000 },
  { maxKm: 13.4, price:  7500 },
  { maxKm: 14.4, price:  8000 },
  { maxKm: 15.4, price:  8500 },
  { maxKm: 16.4, price:  9000 },
  { maxKm: 17.4, price:  9500 },
  { maxKm: 18.4, price: 10000 },
];
const DELIVERY_MAX_KM = 18.4;

const MENU = {"Entradas":[{"n":"Edamame al wok","p":6990,"e":"🥟"},{"n":"Salmón Garden (6 Pzs)","p":11990,"e":"🥟"},{"n":"Tartare Nikkei","p":13990,"e":"🥟"},{"n":"Gyozas Camarón","p":12990,"e":"🥟"},{"n":"Gyozas tori","p":12990,"e":"🥟"},{"n":"Gyozas Lomo","p":13990,"e":"🥟"},{"n":"Gyozas trufadas","p":11990,"e":"🥟"},{"n":"Nori Tacos (2 pzs)","p":8990,"e":"🥟"},{"n":"Nori Tacos (4 pzs)","p":17240,"e":"🥟"},{"n":"Camaron pasionarios","p":13990,"e":"🥟"},{"n":"Sakana bao (2 pzs)","p":15990,"e":"🥟"}],"Rolls de Autor":[{"n":"Saito Roll","p":14990,"e":"🍱"},{"n":"Karai Roll","p":14990,"e":"🍱"},{"n":"Uminari Roll","p":14990,"e":"🍱"},{"n":"Tartare Tuna Roll","p":13990,"e":"🍱"},{"n":"Ushio Roll","p":14990,"e":"🍱"},{"n":"Pacific Doré Roll","p":14990,"e":"🍱"},{"n":"No-rice Roll","p":13990,"e":"🍱"}],"Sushi Rolls":[{"n":"Tartare Sake Roll","p":13990,"e":"🍣"},{"n":"Acevichado Roll","p":13990,"e":"🍣"},{"n":"Ceviroll","p":13990,"e":"🍣"},{"n":"Teri roll","p":12990,"e":"🍣"},{"n":"Scallops Roll","p":12990,"e":"🍣"},{"n":"Chalaquito Roll","p":13990,"e":"🍣"},{"n":"Matsuri Roll","p":12990,"e":"🍣"},{"n":"Smoke Cheese Roll","p":12990,"e":"🍣"},{"n":"Sake Koi Roll","p":12990,"e":"🍣"},{"n":"Avocado Roll","p":12990,"e":"🍣"},{"n":"Furai Roll","p":8990,"e":"🍣"},{"n":"Tempura Roll","p":8990,"e":"🍣"},{"n":"Creamy Roll","p":12990,"e":"🍣"}],"Nigiris \u0026 Gunkans":[{"n":"TNT Atun","p":6500,"e":"🍙"},{"n":"TNT Salmon","p":6500,"e":"🍙"},{"n":"Tnt pulpo karami","p":7500,"e":"🍙"},{"n":"TNT Kani","p":6500,"e":"🍙"},{"n":"TNT Locos","p":9590,"e":"🍙"},{"n":"Nigiris Crispy Rice","p":6500,"e":"🍙"},{"n":"Nigiris Nissei","p":5990,"e":"🍙"},{"n":"Nigiris Anticuchero","p":5990,"e":"🍙"},{"n":"Nigiris Criollo Ponja","p":5990,"e":"🍙"},{"n":"Nigiris Extravaganza","p":6000,"e":"🍙"},{"n":"Nigiri Tako","p":5990,"e":"🍙"},{"n":"Nigiris Grilled Ostion","p":6500,"e":"🍙"}],"Sashimi 3 Cortes":[{"n":"Sashimi Atun","p":5990,"e":"🐟"},{"n":"Sashimi Salmon","p":5990,"e":"🐟"},{"n":"Sashimi Pulpo","p":8490,"e":"🐟"},{"n":"Sashimi Locos","p":9490,"e":"🐟"},{"n":"Sashimi 12 cortes","p":22990,"e":"🐟"},{"n":"Sashimi Pesca del Día","p":5990,"e":"🐟"}],"Ceviches":[{"n":"Ceviche Clásico nikkei","p":13290,"e":"🍋"},{"n":"Chirashi ceviche","p":13990,"e":"🍋"},{"n":"Ceviche carretillero","p":13990,"e":"🍋"},{"n":"Ceviche Mixto criollo","p":13990,"e":"🍋"}],"Tiraditos":[{"n":"Tiraditos Umi","p":13990,"e":"🐠"},{"n":"Tiraditos Nissei","p":13990,"e":"🐠"},{"n":"Tiraditos Olivo","p":16990,"e":"🐠"},{"n":"Tiraditos Locos","p":19490,"e":"🐠"}],"Fuertes":[{"n":"Asado de tira","p":22990,"e":"🍽️"},{"n":"Lomo saltado","p":18990,"e":"🍽️"},{"n":"Saltado Marino","p":21990,"e":"🍽️"},{"n":"Pulpo nikkei","p":23990,"e":"🍽️"},{"n":"Udon huancaína","p":18990,"e":"🍽️"},{"n":"Udon de camarones","p":19990,"e":"🍽️"},{"n":"Udon Saltado","p":18990,"e":"🍽️"},{"n":"Salmon Andino","p":18990,"e":"🍽️"},{"n":"Pesca al ajillo","p":18990,"e":"🍽️"},{"n":"Mar de Mariscos","p":18990,"e":"🍽️"},{"n":"Cremoso de mariscos","p":16990,"e":"🍽️"},{"n":"Niku ramen","p":15990,"e":"🍽️"},{"n":"Atun al sesamo","p":14990,"e":"🍽️"},{"n":"Chicken Katsu","p":13990,"e":"🍽️"},{"n":"Sakana Furai","p":13990,"e":"🍽️"}],"Postres":[{"n":"Torta de Brownie","p":7000,"e":"🍮"},{"n":"Cheesecake de Frutos Rojos","p":6500,"e":"🍮"},{"n":"Tiramisú","p":7000,"e":"🍮"},{"n":"Torta Opera","p":6500,"e":"🍮"},{"n":"Mousse Blanco","p":8000,"e":"🍮"},{"n":"Postre del Amor","p":8000,"e":"🍮"}],"Ensaladas":[{"n":"Asian Salad","p":13990,"e":"🥗"},{"n":"Tataki Salad","p":13990,"e":"🥗"},{"n":"Kabayaki Salad","p":13990,"e":"🥗"}],"Coctelería Clásica":[{"n":"St germain Spritz","p":14000,"e":"🍹"},{"n":"Tropical Gin","p":9000,"e":"🍹"},{"n":"Manhattan","p":10000,"e":"🍹"},{"n":"Tequila margarita","p":8500,"e":"🍹"},{"n":"Caipiriña","p":6500,"e":"🍹"},{"n":"Ramazzotti spritz","p":7900,"e":"🍹"},{"n":"Negroni","p":6900,"e":"🍹"},{"n":"Tom collins","p":6900,"e":"🍹"},{"n":"Dry Martini","p":6900,"e":"🍹"},{"n":"Odett Mocktail","p":5500,"e":"🍹"},{"n":"Bramble","p":9000,"e":"🍹"},{"n":"Rusty Nail","p":6900,"e":"🍹"},{"n":"Moscow Mule","p":8500,"e":"🍹"},{"n":"Espresso Martini","p":9000,"e":"🍹"},{"n":"Daikiri Sabores","p":5900,"e":"🍹"},{"n":"Cosmopolitan","p":8500,"e":"🍹"},{"n":"Negroni Premium 47","p":16000,"e":"🍹"},{"n":"Negroni Premium","p":13500,"e":"🍹"},{"n":"Boulevardier","p":9500,"e":"🍹"},{"n":"Vermouth 1757","p":7000,"e":"🍹"},{"n":"Aperol spritz","p":7900,"e":"🍹"},{"n":"Lychee Martini ( Clásico )","p":10000,"e":"🍹"},{"n":"Long Island Ice Tea","p":9500,"e":"🍹"},{"n":"White lady germain","p":9500,"e":"🍹"},{"n":"Old Fashion","p":9000,"e":"🍹"},{"n":"Saito Mocktail","p":5000,"e":"🍹"},{"n":"Saito Dirty","p":7500,"e":"🍹"},{"n":"Chambord Spritz","p":12000,"e":"🍹"},{"n":"Ruso Blanco","p":8500,"e":"🍹"},{"n":"PALOMA","p":10000,"e":"🍹"}],"Coctelería de Autor":[{"n":"Umi Coctel","p":10490,"e":"🌺"},{"n":"Kimon mule","p":10900,"e":"🌺"},{"n":"Margarita nikkei","p":9000,"e":"🌺"},{"n":"Rose collins","p":9900,"e":"🌺"}],"Mundo Mojito":[{"n":"Mojito Jack Blackberry","p":9500,"e":"🌿"},{"n":"Mojito mango","p":7500,"e":"🌿"},{"n":"Mojito coco","p":7500,"e":"🌿"},{"n":"Mojito clasico","p":6500,"e":"🌿"},{"n":"Mojito Jack Honey","p":9500,"e":"🌿"},{"n":"Mojito maracuya","p":7500,"e":"🌿"},{"n":"Mojito frambuesa","p":7500,"e":"🌿"},{"n":"Mojito Jack Apple","p":9500,"e":"🌿"},{"n":"Mojito Jagger","p":9000,"e":"🌿"}],"Piscos":[{"n":"Ovalle 40 +bebida","p":10000,"e":"🥃"},{"n":"Norterra transparente 40 + bebida","p":6500,"e":"🥃"},{"n":"Wiluf + bebida","p":9000,"e":"🥃"},{"n":"Tololo blue+ bebida","p":10000,"e":"🥃"},{"n":"Pisco Lapostolle XO","p":8000,"e":"🥃"},{"n":"Hacienda la torre 43 + bebida","p":8000,"e":"🥃"},{"n":"Pisco sour peruano catedral ( Viñas de oro acholado)","p":18500,"e":"🥃"},{"n":"Waqar +bebida","p":12000,"e":"🥃"},{"n":"Alto del carmen 40 azul+ bebida","p":6000,"e":"🥃"},{"n":"Pisco Sour Nacional (Norterra)","p":8000,"e":"🥃"},{"n":"Pisco Sour Premium (Tololo)","p":9000,"e":"🥃"},{"n":"Pisco Sour peruano ( Viñas de oro acholado)","p":14000,"e":"🥃"},{"n":"Pisco Sour Peruano Vaticano ( Viñas de oro acholado)","p":24990,"e":"🥃"},{"n":"El gobernador+ bebida","p":6000,"e":"🥃"},{"n":"Black heron + bebida","p":9000,"e":"🥃"},{"n":"Mistral nobel  + bebida","p":8000,"e":"🥃"},{"n":"Alto del carmen 40 negro + bebida","p":7000,"e":"🥃"},{"n":"Mistral apple+ bebida","p":8000,"e":"🥃"},{"n":"Tololo black+ bebida","p":10000,"e":"🥃"},{"n":"Pisco Mistral Gran Nobel","p":11900,"e":"🥃"},{"n":"Bou legado 40 +bebida","p":12000,"e":"🥃"},{"n":"Pisco Caur","p":10000,"e":"🥃"},{"n":"Juliá+ bebida","p":7000,"e":"🥃"},{"n":"Alto del carmen 40 transparente + bebida","p":6000,"e":"🥃"},{"n":"Pisco El Gobernador Platino","p":8000,"e":"🥃"}],"Whisky":[{"n":"Monkey Shoulder","p":13500,"e":"🥃"},{"n":"Woodford Reserve","p":14500,"e":"🥃"},{"n":"Jack daniels honey + bebida","p":8000,"e":"🥃"},{"n":"Buchanan\u0027s 12","p":10500,"e":"🥃"},{"n":"Jack daniels 7 +bebida","p":8000,"e":"🥃"},{"n":"Jameson + bebida","p":9000,"e":"🥃"},{"n":"Whisky Akashi Black","p":18000,"e":"🥃"},{"n":"Chivas regal 12 años + bebida","p":10000,"e":"🥃"},{"n":"Macalla 12 años","p":49990,"e":"🥃"},{"n":"Jw green + bebida","p":18000,"e":"🥃"},{"n":"Jack daniels apple +bebida","p":8000,"e":"🥃"},{"n":"Jack daniels gentleman + bebida","p":15000,"e":"🥃"},{"n":"Jw red +bebida","p":6000,"e":"🥃"},{"n":"Jw black +bebida","p":9000,"e":"🥃"},{"n":"Glenfiddich 12 años + bebida","p":12000,"e":"🥃"},{"n":"Jack Daniels Blackberry","p":8000,"e":"🥃"},{"n":"Jack daniels fire + bebida","p":8000,"e":"🥃"}],"Gin":[{"n":"Beeffeater + bebida","p":7500,"e":"🍸"},{"n":"Beeffeater pink  + bebida","p":7500,"e":"🍸"},{"n":"Hendricks + bebida","p":11000,"e":"🍸"},{"n":"Gin Bulldog","p":9900,"e":"🍸"},{"n":"Gin Monkey","p":17990,"e":"🍸"},{"n":"Tanqueray ten + bebida","p":12000,"e":"🍸"},{"n":"Tanqueray + bebida","p":8000,"e":"🍸"},{"n":"Bombay+ bebida","p":8000,"e":"🍸"},{"n":"Gin Mare","p":10900,"e":"🍸"}],"Ron":[{"n":"Havana 3 años + bebida","p":6900,"e":"🍹"},{"n":"Havana club especial + bebida","p":6900,"e":"🍹"},{"n":"Diplomático+ Bebida","p":9500,"e":"🍹"},{"n":"Havana 7 años + bebida","p":8500,"e":"🍹"}],"Vodka":[{"n":"Stoli + bebida","p":7000,"e":"🍸"},{"n":"Grey Goose + bebida","p":10000,"e":"🍸"},{"n":"Absolut pera+ bebida","p":8000,"e":"🍸"},{"n":"Absolut + bebida","p":8000,"e":"🍸"},{"n":"Absolut frabuesa + bebida","p":8000,"e":"🍸"}],"Tequila":[{"n":"Don julio reposado","p":15000,"e":"🌵"},{"n":"El merendero","p":4000,"e":"🌵"},{"n":"Don julio silver","p":14000,"e":"🌵"},{"n":"Olmeca","p":5000,"e":"🌵"},{"n":"Herradura ultra","p":14000,"e":"🌵"},{"n":"Don Julio Reposado Botella","p":100000,"e":"🌵"}],"Licores":[{"n":"Frangelico","p":7000,"e":"🍶"},{"n":"Kalua","p":6000,"e":"🍶"},{"n":"Fernet branca + bebida","p":6000,"e":"🍶"},{"n":"Ramazzotti violeto spritz","p":7900,"e":"🍶"},{"n":"Chelada","p":1000,"e":"🍶"},{"n":"St germain","p":9900,"e":"🍶"},{"n":"Licor de menta","p":2000,"e":"🍶"},{"n":"Malibu+ bebida","p":8000,"e":"🍶"},{"n":"Jagermeister","p":7000,"e":"🍶"},{"n":"Contreau","p":7000,"e":"🍶"},{"n":"Baileys","p":6000,"e":"🍶"},{"n":"Disarono","p":8000,"e":"🍶"},{"n":"Cachaza","p":3000,"e":"🍶"},{"n":"Drambuie","p":8000,"e":"🍶"},{"n":"Jagermeister Manifest","p":8000,"e":"🍶"},{"n":"Curazao","p":3000,"e":"🍶"},{"n":"Campari + bebida","p":7000,"e":"🍶"},{"n":"Chambord","p":10000,"e":"🍶"}],"Vinos":[{"n":"TH Chardonnay Copa","p":7000,"e":"🍷"},{"n":"Botella de vino Casa Marín RIESLING","p":29990,"e":"🍷"},{"n":"Tololo rose","p":4500,"e":"🍷"},{"n":"TH Chardonnay Botella","p":24990,"e":"🍷"},{"n":"TH Pinot Noir Copa","p":7000,"e":"🍷"},{"n":"TH Carmenere Botella","p":24990,"e":"🍷"},{"n":"TH Cabernet Sauvignon Botella","p":24990,"e":"🍷"},{"n":"Botella Vino Arboleda Brisa","p":69990,"e":"🍷"},{"n":"TH Cabernet Sauvignon Copa","p":7000,"e":"🍷"},{"n":"TH Pinot Noir Botella","p":24990,"e":"🍷"},{"n":"Tololo Pedro Jimenez Copa","p":6000,"e":"🍷"},{"n":"Botella Vino Undurraga Altazor","p":129990,"e":"🍷"},{"n":"TH Syrah Botella","p":24990,"e":"🍷"},{"n":"Copa de vino Casa Marín RIESLING","p":9000,"e":"🍷"},{"n":"TH Syrah Copa","p":7000,"e":"🍷"},{"n":"Tololo Pedro Jimenez Botella","p":24990,"e":"🍷"},{"n":"TH Sauvignon Blanc Copa","p":7000,"e":"🍷"},{"n":"TH Carmenere Copa","p":7000,"e":"🍷"},{"n":"Botella de vino Casa Marín GEWURZTRAMINER","p":29990,"e":"🍷"},{"n":"TH Sauvignon Blanc Botella","p":24990,"e":"🍷"},{"n":"Copa de vino  Casa Marín GEWURZTRAMINER","p":9000,"e":"🍷"}],"Vermut":[{"n":"Martini bianco","p":4500,"e":"🍸"},{"n":"Martini dry","p":4500,"e":"🍸"},{"n":"Martini rosso","p":4500,"e":"🍸"}],"Espumantes":[{"n":"Ricadonna asti botella","p":29990,"e":"🥂"},{"n":"Ricadonna ruby botella","p":29990,"e":"🥂"},{"n":"Undurraga brut copa","p":4500,"e":"🥂"},{"n":"Ricadonna chardonay botella","p":29990,"e":"🥂"},{"n":"Ricadonna moscato botella","p":29990,"e":"🥂"},{"n":"Botella champagne PIPER HEIDSIECK","p":119000,"e":"🥂"}],"Cervezas":[{"n":"Kustman torobayo","p":5500,"e":"🍺"},{"n":"Cerveza Asahi","p":7000,"e":"🍺"},{"n":"Kunstmann Lager","p":5500,"e":"🍺"},{"n":"Austral Lagger","p":5000,"e":"🍺"},{"n":"Peroni","p":5500,"e":"🍺"},{"n":"Austral calafate","p":5500,"e":"🍺"},{"n":"Peroni sin alcohol","p":4500,"e":"🍺"}],"Bebidas":[{"n":"Agua sin gas","p":3000,"e":"🥤"},{"n":"Agua con gas","p":3500,"e":"🥤"},{"n":"Pepsi","p":3500,"e":"🥤"},{"n":"Pepsi zero","p":3500,"e":"🥤"},{"n":"Coca Cola 350cc","p":3500,"e":"🥤"},{"n":"Coca Cola Zero","p":3500,"e":"🥤"},{"n":"Sprite","p":3500,"e":"🥤"},{"n":"Fanta","p":3500,"e":"🥤"},{"n":"Kem piña","p":3500,"e":"🥤"},{"n":"Crush","p":3500,"e":"🥤"},{"n":"Limon soda","p":3000,"e":"🥤"},{"n":"Ginger ale","p":3500,"e":"🥤"},{"n":"Ginger ale zero","p":3000,"e":"🥤"},{"n":"Canada dry tonica","p":3500,"e":"🥤"},{"n":"Canada dry tonica zero","p":3000,"e":"🥤"},{"n":"Redbull original","p":3500,"e":"🥤"},{"n":"Redbull yellow","p":4000,"e":"🥤"},{"n":"Fentimans indian water tonic","p":4000,"e":"🥤"},{"n":"Fentimans water tonic ligth","p":4000,"e":"🥤"},{"n":"Fentimans rose lemonade","p":4000,"e":"🥤"},{"n":"Fentimans ginger beer","p":4000,"e":"🥤"}],"Café \u0026 Calientes":[{"n":"Infusión Té","p":2500,"e":"☕"},{"n":"Cortado","p":4000,"e":"☕"},{"n":"Americano","p":4000,"e":"☕"},{"n":"Cappuccino","p":4000,"e":"☕"},{"n":"Espresso Doble","p":4500,"e":"☕"},{"n":"Espresso","p":3000,"e":"☕"}],"Adicionales":[{"n":"Extra Pulpa","p":500,"e":"➕"},{"n":"Michelada","p":1000,"e":"➕"},{"n":"Adicional Proteina","p":2000,"e":"➕"},{"n":"Extra Wantan","p":500,"e":"➕"},{"n":"Salsa Adicional","p":2000,"e":"➕"},{"n":"Porción de arroz","p":3000,"e":"➕"},{"n":"Porción palta","p":3000,"e":"➕"},{"n":"Papas Cuña Fritas","p":5000,"e":"➕"},{"n":"Ayuda para palillo","p":500,"e":"➕"},{"n":"Shot Jugo","p":500,"e":"➕"}]};

['Coctelería Clásica','Coctelería de Autor','Mundo Mojito',
 'Piscos','Whisky','Gin','Ron','Vodka','Tequila',
 'Licores','Vinos','Vermut','Espumantes','Cervezas'
].forEach(k => delete MENU[k]);
if(MENU['Fuertes']) MENU['Fuertes'] = MENU['Fuertes'].filter(item => item.n !== 'Niku ramen');

function fmt(p){return '$'+p.toLocaleString('es-CL')}

function imgUrl(path){
  if(!path) return null;
  if(path.startsWith('http')) return path + '?alt=media';
  return BASE + path + '?alt=media';
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
function toggleSearch(){
  const box = document.getElementById('searchBox');
  if(box.classList.contains('open')){closeSearch();}
  else{box.classList.add('open');document.getElementById('searchInput').focus();}
}
function closeSearch(){
  document.getElementById('searchBox').classList.remove('open');
  document.getElementById('searchResults').classList.remove('open');
  document.getElementById('searchInput').value='';
}
function onSearchKey(e){if(e.key==='Escape')closeSearch();}
function doSearch(q){
  const el=document.getElementById('searchResults');
  q=q.trim().toLowerCase();
  if(q.length<2){el.classList.remove('open');return;}
  const matches=[];
  for(const[cat,items] of Object.entries(MENU)){
    for(const item of items){
      if(item.n.toLowerCase().includes(q)) matches.push({...item,cat});
    }
  }
  if(matches.length===0){
    el.innerHTML='<div class="search-no-results">Sin resultados para "'+q+'"</div>';
  } else {
    el.innerHTML=matches.map(m=>`
      <div class="search-result-item" onclick="addToCart('${m.n.replace(/'/g,"\\'")}',${m.p},'${m.e||'🍣'}','${m.cat.replace(/'/g,"\\'")}');closeSearch()">
        <div>
          <div class="search-result-name">${m.e} ${m.n}</div>
          <div class="search-result-cat">${m.cat}</div>
        </div>
        <div class="search-result-price">${fmt(m.p)}</div>
      </div>`).join('');
  }
  el.classList.add('open');
}
document.addEventListener('click',e=>{
  const wrap=document.querySelector('.search-wrap');
  if(wrap && !wrap.contains(e.target)) closeSearch();
});

// ── VENTANA DE PRODUCTO (nombre + descripción) ──────────────────────────────
let _prodCurrent = null;
function openProductModal(name, price, emoji, cat){
  const desc = (typeof SPLEAT_DESC !== 'undefined' && SPLEAT_DESC[name]) || '';
  const img  = dishPhoto(name);
  _prodCurrent = { name, price, emoji, cat };
  const imgEl = document.getElementById('prodImg');
  if(img){ imgEl.src = img; imgEl.style.display = ''; } else { imgEl.style.display = 'none'; }
  imgEl.classList.toggle('prod-img--bebida', cat === 'Bebidas');   // bebidas: mostrar completa (contain), no recortada
  document.getElementById('prodName').textContent = dishName(name);
  const dEl = document.getElementById('prodDesc');
  dEl.textContent = desc; dEl.style.display = desc ? '' : 'none';
  document.getElementById('prodPrice').textContent = fmt(price);
  document.getElementById('prodModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeProductModal(){
  document.getElementById('prodModal').classList.remove('open');
  document.body.style.overflow = '';
}
function prodModalAdd(){
  if(_prodCurrent){
    addToCart(_prodCurrent.name, _prodCurrent.price, _prodCurrent.emoji, _prodCurrent.cat);
    closeProductModal();
  }
}

function buildMenu(){
  // Geoglifos dorados — tamaños normalizados por viewBox de cada SVG
  // dyp = desplazamiento vertical hacia arriba en % del alto del icono (sube el geoglifo dentro del disco)
  const IC = (f, s, dyp=0) => `<img src="${f}" style="--dyp:${dyp}%;width:${s}px;height:${s}px;max-width:none;max-height:none;object-fit:contain;display:block;position:absolute;top:50%;left:50%;transform:translate(-50%,calc(-50% - var(--dyp)));z-index:3;pointer-events:none">`;
  const MAIN = {
    'Entradas': { icon:'icon_compartir.svg', size:130, cats:['Entradas'], ring:'Entradas' },
    'Sushi':     { icon:'icon_sushi.svg',    size:115, cats:['Sushi Rolls','Rolls de Autor','Nigiris & Gunkans','Sashimi 3 Cortes'], ring:'Sushi' },
    'Ceviches':  { icon:'icon_ceviches.svg', size:155, cats:['Ceviches'], ring:'Ceviches' },
    'Tiraditos': { icon:'icon_tiraditos.svg',size:150, cats:['Tiraditos'], ring:'Tiraditos' },
    'Ensaladas': { icon:'icon_ensaladas.svg',size:130, cats:['Ensaladas'], ring:'Ensaladas' },
    'Del Fuego': { icon:'icon_del_fuego.svg',size:130, cats:['Fuertes'], ring:'Del Fuego' },
    'Postres':   { icon:'icon_postres.png',  size:121, dyp:5, cats:['Postres'], ring:'Postres' },
    'Bebidas':   { icon:'icon_bebidas.svg',  size:122, cats:['Bebidas'], ring:'Bebidas' }
  };

  const mainWrap  = document.getElementById('mainCats');
  const subcatRow = document.getElementById('subcatRow');
  const content   = document.getElementById('menuContent');

  function catId(cat){ return 'cb_' + cat.replace(/[^a-zA-Z0-9]/g,'_'); }

  Object.keys(MENU).forEach(cat => {
    const block = document.createElement('div');
    block.className = 'cat-block';
    block.id = catId(cat);
    const grid = document.createElement('div');
    grid.className = 'items-grid';
    MENU[cat].forEach(item => {
      const card = document.createElement('div');
      card.className = 'item';
      const url = dishPhoto(item.n) || imgUrl(item.i || null);
      if(url){
        const img = document.createElement('img');
        img.className = 'item-img' + (cat === 'Bebidas' ? ' item-img--bebida' : ''); img.alt = item.n; img.loading = 'lazy'; img.decoding = 'async';
        img.onerror = function(){
          this.style.display='none';
          const ph = document.createElement('div');
          ph.className='item-img-placeholder'; ph.innerHTML = PLATE_SVG;
          card.insertBefore(ph, card.firstChild);
        };
        img.src = url; card.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'item-img-placeholder'; ph.innerHTML = PLATE_SVG;
        card.appendChild(ph);
      }
      const body = document.createElement('div');
      body.className = 'item-body';
      const nEsc = item.n.replace(/'/g,"\\'");
      const eEsc = item.e || '🍣';
      const cEsc = cat.replace(/'/g,"\\'");
      body.innerHTML = `
        <div class="item-name">${dishName(item.n)}</div>
        <div class="item-footer">
          <div class="item-price">${fmt(item.p)}</div>
          <button class="item-cart" title="Agregar al carrito" aria-label="Agregar" onclick="event.stopPropagation();addToCart('${nEsc}',${item.p},'${eEsc}','${cEsc}')">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M7 4V3a1 1 0 011-1h8a1 1 0 011 1v1h3.2a1 1 0 01.99 1.14l-1.7 12A2 2 0 0117.5 19h-11a2 2 0 01-1.99-1.86l-1.7-12A1 1 0 013.8 4H7zm2 0h6V4H9zm-.5 5a1 1 0 10-2 0 5.5 5.5 0 0011 0 1 1 0 10-2 0 3.5 3.5 0 01-7 0z"/></svg>
          </button>
        </div>`;
      card.onclick = () => openProductModal(item.n, item.p, eEsc, cat);
      card.appendChild(body);
      grid.appendChild(card);
    });
    block.appendChild(grid);
    content.appendChild(block);
  });

  function showMain(mainName, cats, circEl){
    document.querySelectorAll('.cat-circ').forEach(c => c.classList.remove('on'));
    circEl.classList.add('on');
    document.querySelectorAll('.cat-block').forEach(b => b.classList.remove('show'));
    subcatRow.innerHTML = '';
    subcatRow.className = 'subcat-row open';
    const valid = cats.filter(c => MENU[c]);
    valid.forEach((cat, si) => {
      const pill = document.createElement('button');
      pill.className = 'subcat-pill' + (si === 0 ? ' on' : '');
      pill.textContent = cat;
      pill.onclick = ev => {
        ev.stopPropagation();
        document.querySelectorAll('.subcat-pill').forEach(p => p.classList.remove('on'));
        document.querySelectorAll('.cat-block').forEach(b => b.classList.remove('show'));
        pill.classList.add('on');
        const bl = document.getElementById(catId(cat));
        if(bl){ bl.classList.add('show'); }
        // Sube la sección dejando la fila de subcategorías arriba (sticky),
        // así el cliente mantiene todos los botones a la vista.
        requestAnimationFrame(() => subcatRow.scrollIntoView({behavior:'smooth',block:'start'}));
      };
      subcatRow.appendChild(pill);
    });
    if(valid.length){
      const bl = document.getElementById(catId(valid[0]));
      if(bl) bl.classList.add('show');
    }
  }

  Object.entries(MAIN).forEach(([mainName, {icon, size, cats, ring, dyp}], idx) => {
    const e = IC(icon, size, dyp || 0);
    const circ = document.createElement('div');
    circ.className = 'cat-circ';
    // Variables para el efecto "brocado": el geoglifo se recorta del botón beige
    // (hueco transparente) y sólo la parte que sobresale del botón se ve en beige.
    circ.style.setProperty('--gi', `url("${icon}")`);
    circ.style.setProperty('--gs', size + 'px');
    const uid = 'rp' + idx;
    const R = 56.5, fontSize = 19, letterSpacing = 1;
    const word = (ring || mainName).toUpperCase();
    circ.innerHTML = `
      <div class="cat-circ-wrap">
        <svg class="cat-circ-ring" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <path id="${uid}" d="M 100 100 m -${R} 0 a ${R} ${R} 0 1 1 ${R*2} 0 a ${R} ${R} 0 1 1 -${R*2} 0"/>
          </defs>
          <text fill="#1f3f8c" font-size="${fontSize}"
                font-family="Inter,sans-serif" font-weight="700" letter-spacing="${letterSpacing}">
            <textPath href="#${uid}" startOffset="25%" text-anchor="middle">${word}</textPath>
          </text>
          <text fill="#1f3f8c" font-size="${fontSize}"
                font-family="Inter,sans-serif" font-weight="700" letter-spacing="${letterSpacing}">
            <textPath href="#${uid}" startOffset="75%" text-anchor="middle">${word}</textPath>
          </text>
        </svg>
        <div class="cat-circ-blob"><svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="100" fill="#f0e8d8"/></svg></div>
        <div class="cat-circ-inner">${e}</div>
      </div>
      <div class="cat-circ-label">${mainName}</div>`;
    circ.onclick = () => showMain(mainName, cats, circ);
    mainWrap.appendChild(circ);
    if(idx === 0) showMain(mainName, cats, circ);
  });
}

// ── CART STATE ────────────────────────────────────────────────────────────────
let cart = [];
let entregaMode = 'retiro';
let pagoMode = 'tarjeta';
let deliveryFee = 0;
let deliveryKm  = 0;
let gpsLat = null;
let gpsLng = null;
let geocodeTimer = null;
let addrSugIndex = -1;
let addrSuggestions = [];
let addrHouseNumber = '';

// ── ADDRESS AUTOCOMPLETE ──────────────────────────────────────────────────────
function splitAddrNum(q){
  const m = q.trim().match(/^(.*?)\s+(\d{1,6})\s*$/);
  if(m && m[1].trim().length >= 3) return { text: m[1].trim(), num: m[2] };
  return { text: q.trim(), num: '' };
}

function pedirUbicacionGPS(){
  const btn = document.getElementById('btnGps');
  const status = document.getElementById('gpsStatus');
  if(!navigator.geolocation){
    status.style.display='block'; status.style.color='#ef4444';
    status.textContent='Tu navegador no soporta GPS. Escribe la dirección manualmente.';
    return;
  }
  btn.textContent = '⏳ Obteniendo ubicación...';
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      gpsLat = pos.coords.latitude;
      gpsLng = pos.coords.longitude;
      // Geocodificación inversa para mostrar la dirección en el input
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${gpsLat}&lon=${gpsLng}&format=json&accept-language=es`);
        const d = await r.json();
        const addr = d.display_name || `${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`;
        const short = [d.address?.road, d.address?.house_number, d.address?.suburb, d.address?.city].filter(Boolean).join(' ');
        document.getElementById('cAddr').value = short || addr;
        // Calcular tarifa de delivery con las coords GPS
        calcDeliveryFromCoords(gpsLat, gpsLng);
      } catch(e) {
        document.getElementById('cAddr').value = `${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`;
      }
      btn.textContent = '✓ Ubicación GPS capturada';
      btn.style.background = '#15803d';
      status.style.display='block'; status.style.color='#22c55e';
      status.textContent = `📍 GPS: ${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}`;
    },
    (err) => {
      btn.textContent = '📍 Compartir mi ubicación exacta (recomendado)';
      btn.disabled = false;
      status.style.display='block'; status.style.color='#ef4444';
      status.textContent = 'No se pudo obtener GPS. Escribe la dirección manualmente.';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function calcDeliveryFromCoords(lat, lng){
  // Coordenadas del restaurante UMI (Av. Costanera 5633, Coquimbo)
  const UMI_LAT = -29.9583, UMI_LNG = -71.3397;
  const R = 6371;
  const dLat = (lat - UMI_LAT) * Math.PI / 180;
  const dLng = (lng - UMI_LNG) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(UMI_LAT*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  deliveryKm = Math.round(km * 10) / 10;
  deliveryFee = deliveryKm <= 1 ? 0 : deliveryKm <= 3 ? 1500 : deliveryKm <= 5 ? 2500 : 3500;
  const box = document.getElementById('deliveryFeeBox');
  if(box){
    box.style.display = '';
    box.innerHTML = deliveryFee === 0
      ? `✓ Gratis (${deliveryKm} km)`
      : `🛵 Envío: <strong>${fmt(deliveryFee)}</strong> (${deliveryKm} km)`;
  }
  updateDeliveryTotal();
}

function onAddrInput(val){
  clearTimeout(geocodeTimer);
  const { text, num } = splitAddrNum(val);
  addrHouseNumber = num;
  if(val.length < 3){ hideAddrSug(); deliveryFee=0; deliveryKm=0; updateDeliveryTotal(); return; }
  geocodeTimer = setTimeout(() => { fetchAddrSuggestions(text); }, 350);
}

function onAddrBlur(){
  setTimeout(() => {
    hideAddrSug();
    const val = document.getElementById('cAddr').value.trim();
    if(val.length >= 5 && deliveryKm === 0) calcDeliveryFee(val);
  }, 200);
}

async function fetchAddrSuggestions(q){
  const box = document.getElementById('addrSuggestions');
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Coquimbo, Chile')}&format=json&limit=6&addressdetails=1&countrycodes=cl&accept-language=es`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'uminikkeibar.cl/1.0' } });
    const data = await resp.json();
    if(!data.length){ hideAddrSug(); return; }
    addrSuggestions = data.slice(0, 5);
    addrSugIndex = -1;
    box.innerHTML = addrSuggestions.map((item, i) => {
      const road = (item.address || {}).road || item.display_name.split(',')[0].trim();
      const displayMain = addrHouseNumber ? road + ' ' + addrHouseNumber : road;
      const sub  = buildAddrSub(item);
      return `<div class="addr-sug-item" data-idx="${i}"
        onmousedown="event.preventDefault();selectAddrSug(${i})"
        ontouchstart="selectAddrSug(${i})"
        onmouseover="addrSugHover(${i})">
        <span class="addr-sug-icon">${addrIcon(item)}</span>
        <div><div class="addr-sug-main">${esc(displayMain)}</div>${sub?`<div class="addr-sug-sub">${esc(sub)}</div>`:''}</div>
      </div>`;
    }).join('');
    box.style.display = '';
  } catch(e){ hideAddrSug(); }
}

function buildAddrMain(item){
  const a = item.address || {};
  const parts = [];
  const place = a.mall || a.shop || a.amenity || a.leisure || a.building ||
                a.tourism || a.historic || a.office || a.industrial || a.commercial;
  if(place) parts.push(place);
  if(a.road){ parts.push(a.house_number ? a.road + ' ' + a.house_number : a.road); }
  if(!parts.length){ return item.display_name.split(',').slice(0, 2).join(',').trim(); }
  return parts.join(', ');
}

function buildAddrSub(item){
  const a = item.address || {};
  const parts = [];
  if(a.suburb) parts.push(a.suburb);
  else if(a.neighbourhood) parts.push(a.neighbourhood);
  const city = a.city || a.town || a.village || a.municipality;
  if(city) parts.push(city);
  return parts.join(', ');
}

function addrIcon(item){
  const cls  = (item.class || '').toLowerCase();
  const type = (item.type  || '').toLowerCase();
  const name = (item.display_name || '').toLowerCase();
  if(/mall|shopping|comercial/.test(type) || /mall|shopping/.test(name)) return '🏬';
  if(/hospital|clinic/.test(type) || /hospital|clínica/.test(name)) return '🏥';
  if(/school|college|university/.test(type) || /colegio|liceo|universidad|escuela/.test(name)) return '🎓';
  if(/hotel|hostel/.test(type) || /hotel/.test(name)) return '🏨';
  if(cls === 'amenity' && /restaurant|cafe|fast_food/.test(type)) return '🍽️';
  if(/fuel/.test(type)) return '⛽';
  if(/park|garden/.test(type)) return '🌳';
  if(/residential|house|flat|apartment/.test(type) || cls === 'building') return '🏠';
  return '📍';
}

function selectAddrSug(idx){
  const item = addrSuggestions[idx];
  if(!item) return;
  const a = item.address || {};
  const road = a.road || item.display_name.split(',')[0].trim();
  const houseNum = splitAddrNum(document.getElementById('cAddr').value.trim()).num || addrHouseNumber;
  let main = road + (houseNum ? ' ' + houseNum : '');
  const sub = buildAddrSub(item);
  if(sub) main += ', ' + sub.split(',')[0].trim();
  document.getElementById('cAddr').value = main;
  hideAddrSug();
  const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
  const km  = haversineKm(RESTO_LAT, RESTO_LNG, lat, lng);
  deliveryKm = Math.round(km * 10) / 10;
  const fee = feeForKm(km);
  const feeBox = document.getElementById('deliveryFeeBox');
  if(fee === null){
    deliveryFee = 0; feeBox.style.color = '#e74c3c';
    feeBox.innerHTML = `❌ Fuera de zona (${deliveryKm} km) — máximo ${DELIVERY_MAX_KM} km`;
  } else {
    deliveryFee = fee; feeBox.style.color = 'var(--teal)';
    feeBox.innerHTML = `🛵 Envío: <strong>${fmt(fee)}</strong> · ${deliveryKm} km`;
  }
  feeBox.style.display = '';
  updateDeliveryTotal();
}

function addrSugHover(idx){
  addrSugIndex = idx;
  document.querySelectorAll('.addr-sug-item').forEach((el,i)=>{
    el.classList.toggle('active', i===idx);
  });
}

function onAddrKey(e){
  const items = document.querySelectorAll('.addr-sug-item');
  if(!items.length) return;
  if(e.key==='ArrowDown'){ e.preventDefault(); addrSugIndex=Math.min(addrSugIndex+1,items.length-1); addrSugHover(addrSugIndex); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); addrSugIndex=Math.max(addrSugIndex-1,0); addrSugHover(addrSugIndex); }
  else if(e.key==='Enter' && addrSugIndex>=0){ e.preventDefault(); selectAddrSug(addrSugIndex); }
  else if(e.key==='Escape'){ hideAddrSug(); }
}

function hideAddrSug(){
  const box = document.getElementById('addrSuggestions');
  if(box){ box.style.display='none'; box.innerHTML=''; }
}

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return (s||'').replace(/"/g,'&quot;'); }

// ── DELIVERY HELPERS ──────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180)
    * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function feeForKm(km) {
  for (const t of DELIVERY_TIERS) { if (km <= t.maxKm) return t.price; }
  return null;
}

async function calcDeliveryFee(address) {
  const box = document.getElementById('deliveryFeeBox');
  if (!address || address.length < 5) { box.style.display='none'; deliveryFee=0; deliveryKm=0; updateDeliveryTotal(); return; }
  box.innerHTML = '⏳ Calculando distancia...';
  box.style.display = '';
  box.style.color = 'var(--muted)';
  try {
    const q = encodeURIComponent(address + ', Coquimbo, Chile');
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { 'User-Agent': 'uminikkeibar.cl/1.0' } });
    const data = await resp.json();
    if (!data.length) throw new Error('Dirección no encontrada');
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    const km = haversineKm(RESTO_LAT, RESTO_LNG, lat, lng);
    deliveryKm = Math.round(km * 10) / 10;
    const fee = feeForKm(km);
    if (fee === null) { deliveryFee=0; box.style.color='#e74c3c'; box.innerHTML=`❌ Fuera de zona (${deliveryKm} km) — máximo ${DELIVERY_MAX_KM} km`; updateDeliveryTotal(); return; }
    deliveryFee = fee; box.style.color='var(--teal)';
    box.innerHTML = `🛵 Envío: <strong>${fmt(fee)}</strong> · ${deliveryKm} km`;
    updateDeliveryTotal();
  } catch(e) {
    box.style.color='var(--muted)'; box.innerHTML='⚠️ No se pudo calcular — revisa la dirección';
    deliveryFee=0; deliveryKm=0; updateDeliveryTotal();
  }
}

function updateDeliveryTotal() {
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = fmt(cartTotal());
  const feeLineEl = document.getElementById('checkoutDeliveryFee');
  if (feeLineEl) {
    if (entregaMode === 'delivery' && deliveryFee > 0) {
      feeLineEl.style.display = '';
      feeLineEl.querySelector('.fee-val').textContent = fmt(deliveryFee);
    } else { feeLineEl.style.display = 'none'; }
  }
  const checkTotalEl = document.getElementById('checkoutTotalVal');
  if (checkTotalEl) checkTotalEl.textContent = fmt(cartTotal());
  const earnEl = document.getElementById('checkoutEarnLine');
  if (earnEl) earnEl.innerHTML = earnLineHtml();
}

function addToCart(name, price, emoji, category){
  const existing = cart.find(r => r.n === name);
  if(existing){ existing.qty++; }
  else { cart.push({n:name, p:price, e:emoji, qty:1, cat:category||'Fuertes'}); }
  renderCart(); updateBadge();
  const fab = document.querySelector('.side-tab--cart');
  if(fab){ fab.style.transform = 'scale(1.12)'; setTimeout(()=>{ fab.style.transform = ''; }, 200); }
}

function removeFromCart(name){ cart = cart.filter(r => r.n !== name); renderCart(); updateBadge(); }

function changeQty(name, delta){
  const item = cart.find(r => r.n === name);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) removeFromCart(name);
  else { renderCart(); updateBadge(); }
}

let cuponDescuento = 0; // porcentaje de descuento activo (0-100)
let puntosCanjeados = 0; // pesos descontados con puntos UMI (1 punto = $1)
const PUNTOS_PORCENTAJE = 0.10;     // se gana 10% del subtotal en puntos
const PUNTOS_TOPE_CANJE = 0.50;     // máximo 50% de la cuenta se puede pagar con puntos

function billAfterCoupon(){
  const base = cart.reduce((s,r) => s + r.p * r.qty, 0) + (entregaMode === 'delivery' ? deliveryFee : 0);
  return cuponDescuento > 0 ? Math.round(base * (1 - cuponDescuento / 100)) : base;
}
function cartTotal(){
  return Math.max(0, billAfterCoupon() - puntosCanjeados);
}
function cartSubtotal(){ return cart.reduce((s,r) => s + r.p * r.qty, 0); }
function productsAfterCoupon(){
  const base = cartSubtotal();
  return cuponDescuento > 0 ? Math.round(base * (1 - cuponDescuento / 100)) : base;
}

// ── PUNTOS UMI (canje en checkout) ──────────────────────────────────────────
function maxPuntosCanjeables(){
  if(!(window.umiIsRegistered && window.umiIsRegistered())) return 0;
  if(cuponDescuento > 0) return 0; // cupón y puntos no se combinan
  const prof = window.umiGetProfile ? window.umiGetProfile() : null;
  const saldo = (prof && prof.points) || 0;
  const tope  = Math.floor(billAfterCoupon() * PUNTOS_TOPE_CANJE);
  return Math.max(0, Math.min(saldo, tope));
}
function usarPuntos(){ puntosCanjeados = maxPuntosCanjeables(); refrescarResumenCheckout(); }
function quitarPuntos(){ puntosCanjeados = 0; refrescarResumenCheckout(); }
// Puntos que se GANAN con este pedido: solo sobre el valor de los PRODUCTOS
// (con cupón aplicado y descontando puntos canjeados). El costo de envío
// del delivery nunca genera puntos.
function puntosGanaPedido(){
  const base = Math.max(0, productsAfterCoupon() - puntosCanjeados);
  return Math.round(base * PUNTOS_PORCENTAJE);
}
function earnLineHtml(){
  if(!(window.umiIsRegistered && window.umiIsRegistered())) return '';
  const g = puntosGanaPedido();
  return g > 0 ? `🎁 Con esta compra acumulas <b>${g.toLocaleString('es-CL')} puntos</b>` : '';
}

function puntosSummaryHtml(){
  if(!(window.umiIsRegistered && window.umiIsRegistered())) return '';
  const prof = window.umiGetProfile ? window.umiGetProfile() : null;
  const saldo = (prof && prof.points) || 0;
  let h = '';
  if(puntosCanjeados > 0){
    h += `<div class="checkout-summary-item" style="color:#22c55e"><span>★ Puntos canjeados</span><span>-${fmt(puntosCanjeados)}</span></div>`;
    h += `<div class="checkout-puntos-action"><button type="button" class="puntos-btn-quitar" onclick="quitarPuntos()">Quitar puntos</button></div>`;
  } else {
    const maxR = maxPuntosCanjeables();
    if(maxR > 0){
      h += `<div class="checkout-puntos-action"><button type="button" class="puntos-btn-usar" onclick="usarPuntos()">★ Usar mis puntos (−${fmt(maxR)})</button><div class="checkout-puntos-bal">Tienes ${saldo.toLocaleString('es-CL')} pts disponibles</div></div>`;
    } else if(saldo > 0){
      h += `<div class="checkout-puntos-bal">★ Tienes ${saldo.toLocaleString('es-CL')} pts (se canjean hasta el 50% de la cuenta)</div>`;
    }
  }
  h += `<div class="checkout-earn-line" id="checkoutEarnLine">${earnLineHtml()}</div>`;
  return h;
}
// Suma los puntos ganados y descuenta los canjeados, tras un pedido
function aplicarPuntosTrasPedido(){
  if(window.umiAddPoints){
    try { window.umiAddPoints(puntosGanaPedido(), puntosCanjeados); } catch(e){}
  }
  puntosCanjeados = 0;
}

function aplicarCupon(){
  const val = (document.getElementById('cCupon')?.value || '').trim().toUpperCase();
  const msg = document.getElementById('cuponMsg');
  // Cupones fijos de respaldo + cupones creados desde el panel (Firestore)
  const CUPONES = Object.assign({ 'HOPLIX': 90, 'CHOCOLATE': 50 }, window.umiCupones || {});
  if(CUPONES[val] !== undefined){
    const teniaPuntos = puntosCanjeados > 0;
    cuponDescuento = CUPONES[val];
    puntosCanjeados = 0; // cupón y puntos no se combinan
    if(msg){
      msg.textContent = teniaPuntos
        ? `✓ Cupón aplicado: ${cuponDescuento}% de descuento. Se quitaron tus puntos canjeados (no se pueden combinar con cupones).`
        : `✓ Cupón aplicado: ${cuponDescuento}% de descuento`;
      msg.style.color='#22c55e';
    }
    // Actualizar solo el resumen sin reabrir el modal
    refrescarResumenCheckout();
  } else {
    cuponDescuento = 0;
    if(msg){ msg.textContent = '❌ Cupón inválido'; msg.style.color='#ef4444'; }
  }
}

function refrescarResumenCheckout(){
  const sumEl = document.getElementById('checkoutSummary');
  if(!sumEl) return;
  let html = '<div class="checkout-summary-title">Resumen de tu pedido</div>';
  cart.forEach(r => { html += `<div class="checkout-summary-item"><span>${r.e} ${dishName(r.n)} ×${r.qty}</span><span>${fmt(r.p*r.qty)}</span></div>`; });
  if(entregaMode === 'delivery' && deliveryFee > 0){
    html += `<div class="checkout-summary-item"><span>🛵 Envío (${deliveryKm} km)</span><span>${fmt(deliveryFee)}</span></div>`;
  }
  if(cuponDescuento > 0){
    const base = cart.reduce((s,r) => s + r.p * r.qty, 0) + (entregaMode === 'delivery' ? deliveryFee : 0);
    html += `<div class="checkout-summary-item" style="color:#22c55e"><span>🏷️ Descuento (${cuponDescuento}%)</span><span>-${fmt(base - cartTotal())}</span></div>`;
  }
  html += puntosSummaryHtml();
  html += `<div class="checkout-summary-total"><span>Total</span><span id="checkoutTotalVal">${fmt(cartTotal())}</span></div>`;
  sumEl.innerHTML = html;
}

function updateBadge(){
  const total = cart.reduce((s,r) => s + r.qty, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.classList.toggle('hidden', total === 0);
  const navBadge = document.getElementById('ntbBagBadge');
  if(navBadge){ navBadge.textContent = total; navBadge.classList.toggle('hidden', total === 0); }
  // Abrir la pestaña "Mi Pedido" solo cuando hay productos
  const cartTab = document.querySelector('.side-tab--cart');
  if(cartTab) cartTab.classList.toggle('open', total > 0);
}

function renderCart(){
  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const totalEl = document.getElementById('cartTotal');
  if(cart.length === 0){
    el.innerHTML = `<div class="cart-empty">
      <svg class="cart-empty-icon" viewBox="0 0 36 26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="13" r="9"/>
        <circle cx="18" cy="13" r="4"/>
        <path d="M4 3v5a2 2 0 0 0 4 0V3"/><path d="M6 10v13"/>
        <path d="M31 3c-1.6 1.2-2 3.2-2 5.5V13h3v10"/>
      </svg>
      <p>Tu pedido está vacío.<br/>Agrega platos desde el menú.</p>
      <button class="cart-empty-btn" onclick="closeCart();document.getElementById('menu').scrollIntoView({behavior:'smooth'})">Ir al menú →</button>
    </div>`;
    footer.style.display = 'none'; return;
  }
  footer.style.display = '';
  totalEl.textContent = fmt(cartTotal());
  el.innerHTML = '';
  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    const thumbUrl = dishPhoto(item.n);
    const thumbHtml = thumbUrl
      ? `<img class="cart-row-thumb" src="${thumbUrl}" alt="${item.n}" onerror="this.outerHTML=window.__plateSpan">`
      : window.__plateSpan;
    row.innerHTML = `
      ${thumbHtml}
      <div class="cart-row-info">
        <div class="cart-row-name">${dishName(item.n)}</div>
        <div class="cart-row-price">${fmt(item.p * item.qty)}</div>
      </div>
      <div class="cart-qty">
        <button class="qty-btn" onclick="changeQty('${item.n.replace(/'/g,"\\'")}', -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty('${item.n.replace(/'/g,"\\'")}', 1)">+</button>
      </div>
      <button class="cart-row-del" onclick="removeFromCart('${item.n.replace(/'/g,"\\'")}')">🗑</button>`;
    el.appendChild(row);
  });
}

function openCart(){ renderCart(); document.getElementById('cartDrawer').classList.add('open'); document.getElementById('cartOverlay').classList.add('open'); document.body.style.overflow='hidden'; }
function closeCart(){ document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('open'); document.body.style.overflow=''; }

function openCheckout(){
  if(cart.length === 0) return;
  // Registro obligatorio antes de pedir
  if(!(window.umiIsRegistered && window.umiIsRegistered())){
    if(window.umiOpenAuth) window.umiOpenAuth();
    return;
  }
  puntosCanjeados = 0;
  closeCart();
  // Prefill con los datos del cliente registrado
  try {
    const prof = window.umiGetProfile && window.umiGetProfile();
    if(prof){
      const nEl = document.getElementById('cName');  if(nEl && !nEl.value)  nEl.value  = prof.name || '';
      const pEl = document.getElementById('cPhone'); if(pEl && !pEl.value) pEl.value = prof.whatsapp || '';
    }
  } catch(e){}
  const sumEl = document.getElementById('checkoutSummary');
  let html = '<div class="checkout-summary-title">Resumen de tu pedido</div>';
  cart.forEach(r => { html += `<div class="checkout-summary-item"><span>${r.e} ${dishName(r.n)} ×${r.qty}</span><span>${fmt(r.p*r.qty)}</span></div>`; });
  if(entregaMode === 'delivery' && deliveryFee > 0){
    html += `<div class="checkout-summary-item" id="checkoutDeliveryFee"><span>🛵 Envío (${deliveryKm} km)</span><span class="fee-val">${fmt(deliveryFee)}</span></div>`;
  } else {
    html += `<div class="checkout-summary-item" id="checkoutDeliveryFee" style="display:none"><span>🛵 Envío</span><span class="fee-val"></span></div>`;
  }
  if(cuponDescuento > 0){
    const base = cart.reduce((s,r) => s + r.p * r.qty, 0) + (entregaMode === 'delivery' ? deliveryFee : 0);
    html += `<div class="checkout-summary-item" style="color:#22c55e"><span>🏷️ Descuento (${cuponDescuento}%)</span><span>-${fmt(base - cartTotal())}</span></div>`;
  }
  html += puntosSummaryHtml();
  html += `<div class="checkout-summary-total"><span>Total</span><span id="checkoutTotalVal">${fmt(cartTotal())}</span></div>`;
  sumEl.innerHTML = html;
  document.getElementById('checkoutModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout(){ document.getElementById('checkoutModal').classList.remove('open'); document.body.style.overflow=''; }

function selectEntrega(mode){
  entregaMode = mode;
  document.querySelectorAll('[id^="opt-"]').forEach(el => el.classList.remove('selected'));
  document.getElementById('opt-'+mode).classList.add('selected');
  document.getElementById('fieldAddr').style.display = mode === 'delivery' ? '' : 'none';
  if(mode !== 'delivery'){ deliveryFee=0; deliveryKm=0; document.getElementById('deliveryFeeBox').style.display='none'; }
  else { const addr = document.getElementById('cAddr').value.trim(); if(addr) calcDeliveryFee(addr); }
  updateDeliveryTotal();
}

function selectPago(mode){
  pagoMode = mode;
  document.querySelectorAll('[id^="pay-"]').forEach(el => el.classList.remove('selected'));
  document.getElementById('pay-'+mode).classList.add('selected');
}

async function sendOrder(){
  // Seguro: registro obligatorio antes de pedir
  if(!(window.umiIsRegistered && window.umiIsRegistered())){
    if(window.umiOpenAuth) window.umiOpenAuth();
    return;
  }
  const name  = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  const addr  = document.getElementById('cAddr').value.trim();
  const notes = document.getElementById('cNotes').value.trim();
  if(!name){ alert('Por favor ingresa tu nombre.'); return; }
  if(!phone){ alert('Por favor ingresa tu teléfono.'); return; }
  if(entregaMode === 'delivery' && !addr){ alert('Por favor ingresa tu dirección de entrega.'); return; }
  if(entregaMode === 'delivery' && deliveryKm > DELIVERY_MAX_KM){ alert(`Lo sentimos, tu dirección está fuera de nuestra zona de delivery (${deliveryKm} km). Máximo ${DELIVERY_MAX_KM} km.`); return; }
  const now = new Date().toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'});
  const pagoLabel = {efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta'}[pagoMode];
  const entregaLabel = entregaMode === 'retiro' ? 'Retiro en local' : 'Delivery';

  // ── Pago con tarjeta → formulario en la misma web (Mercado Pago Brick) ──
  if(pagoMode === 'tarjeta'){
    closeCheckout();
    openCardPayment({ name, phone, addr, notes, total: Math.round(cartTotal()), lat: gpsLat, lng: gpsLng });
    return;
  }

  await sendToSpleat(name, phone, addr, notes);
  let lines = `\u{1F363} *NUEVO PEDIDO - Umi*\n\n*Detalle:*\n`;
  cart.forEach(r => { lines += `  \u{25B8} ${r.n} x${r.qty} = ${fmt(r.p*r.qty)}\n`; });
  const sub = cartSubtotal();
  if(entregaMode === 'delivery' && deliveryFee > 0){ lines += `\nSubtotal: ${fmt(sub)}\nEnvío (${deliveryKm} km): ${fmt(deliveryFee)}\n*Total: ${fmt(cartTotal())}*\n\n`; }
  else { lines += `\n*Total: ${fmt(cartTotal())}*\n\n`; }
  lines += `*Cliente:* ${name}\n*Tel:* ${phone}\n*Entrega:* ${entregaLabel}\n`;
  if(entregaMode === 'delivery'){ lines += `*Dirección:* ${addr}\n*Maps:* https://maps.google.com/?q=${encodeURIComponent(addr+', Coquimbo, Chile')}\n`; }
  lines += `*Pago:* ${pagoLabel}\n`;
  if(notes) lines += `*Notas:* ${notes}\n`;
  lines += `\nPedido a las ${now}`;
  window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(lines), '_blank');
  // Nota: los puntos NO se mueven aquí. Solo se suman/canjean cuando un pago
  // con tarjeta es aprobado (ver onCardApproved), para evitar dar puntos sin pago.
  cart=[]; renderCart(); updateBadge(); closeCheckout();
}

// ── Firestore REST ────────────────────────────────────────────────────────────
function _fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean')  return { booleanValue: v };
  if (typeof v === 'string')   return { stringValue: v };
  if (v instanceof Date)       return { timestampValue: v.toISOString() };
  if (typeof v === 'number') { return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }; }
  if (Array.isArray(v))  return { arrayValue: { values: v.map(_fsVal) } };
  if (typeof v === 'object') { const fields={}; for(const[k,val] of Object.entries(v)){ if(val!==undefined) fields[k]=_fsVal(val); } return { mapValue: { fields } }; }
  return { stringValue: String(v) };
}
function _fsDoc(obj) { const fields={}; for(const[k,v] of Object.entries(obj)){ if(v!==undefined) fields[k]=_fsVal(v); } return { fields }; }

async function sendToSpleat(nombre, telefono, direccion, notas){
  try {
    const BASE_FS = 'https://firestore.googleapis.com/v1/projects/rest-app-chile/databases/(default)/documents';
    const KEY  = 'AIzaSyCTEgmBUftRPXnfYl9yNbh3Js7fR0nySws';
    const RID  = 'lFwud0mMFsVrrHJlslCrRpEwPsc2';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const rndId = (n=20) => Array.from({length:n}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    const nowDate = new Date();
    const isDelivery = entregaMode === 'delivery';
    const reservationId = rndId();
    const total = cart.reduce((s,i) => s + i.p * i.qty, 0);
    const reservation = { restaurant:RID, restaurantId:RID, createdAt:nowDate, status:'active', type:isDelivery?'delivery':'pickup', clientName:nombre, clientPhone:telefono, address:isDelivery?(direccion||''):'', paymentType:pagoMode, notes:notas||'', source:'web', total, tableNumber:'WEB', box:'web' };
    const r1 = await fetch(`${BASE_FS}/restaurants/${RID}/reservations?documentId=${reservationId}&key=${KEY}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(_fsDoc(reservation)) });
    if (!r1.ok) throw new Error('reserva '+r1.status);
    for (const item of cart) {
      const orderId = rndId();
      const order = { restaurantId:RID, reservationId, productName:item.n, price:item.p, quantity:item.qty, totalPrice:item.p*item.qty, orderId, source:'web', category:'Web', addedAt:nowDate, createdAt:nowDate, step:'pending' };
      const r2 = await fetch(`${BASE_FS}/restaurants/${RID}/reservations/${reservationId}/orders?documentId=${orderId}&key=${KEY}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(_fsDoc(order)) });
      if (!r2.ok) throw new Error('orden '+r2.status);
    }
    return true;
  } catch(e) { console.warn('⚠️ SPLEAT:', e.message); return false; }
}

// ── SPLEAT DATA ───────────────────────────────────────────────────────────────
const SPLEAT_PHOTOS = {"Kaisen Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FKaisen%20Roll%2Fphotos%2FDSC09825.jpg.jpeg?alt=media","Don Julio Reposado Botella":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FDon%20Julio%20Reposado%20Botella%2Fphotos%2FScreenshot2023-02-28at11.07.56AM.jpg.jpeg?alt=media","St germain Spritz":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSt%20germain%20Spritz%2Fphotos%2F42238050c852-botella-face-ok.jpg.webp.jpeg?alt=media","Ushio Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FUshio%20Roll%2Fphotos%2FDSC09816%20(1).jpg.jpeg?alt=media","Frangelico":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FFrangelico%2Fphotos%2Ffrangelico.jpg.jpeg?alt=media","Kalua":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FKalua%2Fphotos%2Fingredient_kahlua_1x1_5199efa65cf3c02e71294f7ad49be9aa.jpg.jpeg?alt=media","Ovalle 40 +bebida":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FOvalle%2040%20%2Bbebida%2Fphotos%2FDSC09834.jpg.jpeg?alt=media","Norterra transparente 40 + bebida":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNorterra%20transparente%2040%20%2B%20bebida%2Fphotos%2F8646881.jpg.jpeg?alt=media","Nori Tacos (4 pzs)":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNori%20tacos%20(4%20pzs)%2Fphotos%2FDSC01659%20(1).jpg.jpeg?alt=media","Sashimi Pulpo":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSashimi%20Pulpo%2Fphotos%2FIMG_0246%20(1).JPG.jpeg?alt=media","Wiluf + bebida":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FWiluf%20%2B%20bebida%2Fphotos%2FPisco-Wiluf.jpg.jpeg?alt=media","Sashimi Locos":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSashimi%20Locos%2Fphotos%2FIMG_0240%20(1).JPG.jpeg?alt=media","Tiraditos Umi":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTiraditos%20Umi%2Fphotos%2FTIRADITO%20UMI%20(3).jpg.jpeg?alt=media","Teri roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTeri%20roll%2Fphotos%2FTERI%20ROLL.jpg.jpeg?alt=media","No-rice Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNo-rice%20Roll%2Fphotos%2FNO%20RICE%20(2).JPG.jpeg?alt=media","TNT Atun":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTNT%20Atun%2Fphotos%2FTNT%20ATUN.jpg.jpeg?alt=media","Acevichado Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FAcevichado%20Roll%2Fphotos%2FDSC03723.jpg.jpeg?alt=media","Chirashi ceviche":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FChirashi%20ceviche%2Fphotos%2FIMG_7671.jpeg.jpeg?alt=media","Tololo blue+ bebida":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTololo%20blue%2B%20bebida%2Fphotos%2Ftbls.png.jpeg?alt=media","Cremoso de mariscos":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCremoso%20de%20mariscos%2Fphotos%2F1779828916634-ec9a3e6b-5407-4033-8f1f-3e9cd1470df9.mp4?alt=media","Edamame al wok":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FEdamame%20al%20wok%2Fphotos%2FDSC01655.jpg.jpeg?alt=media","Ceviroll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCeviroll%2Fphotos%2FCevi%20roll.jpg.jpeg?alt=media","Tartare Tuna Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTartare%20Tuna%20Roll%2Fphotos%2FTartar%20tuna.jpg.jpeg?alt=media","TNT Kani":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTNT%20Kani%2Fphotos%2FTNT%20KANI.jpg.jpeg?alt=media","Udon Saltado":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FUdon%20Saltado%2Fphotos%2FDSC01280.jpg.jpeg?alt=media","TNT Locos":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTNT%20Locos%2Fphotos%2FTNT%20DE%20TAKO%20(1).jpg.jpeg?alt=media","Tartare Sake Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTartare%20Sake%20Roll%2Fphotos%2FTartare%20sake.jpg.jpeg?alt=media","Nori Tacos (2 pzs)":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNori%20Tacos%20(2%20pzs)%2Fphotos%2FDSC01662.jpg.jpeg?alt=media","Nigiris Nissei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiris%20Nissei%2Fphotos%2FDSC02454.tif.jpeg?alt=media","Umi Coctel":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FUmi%2Fphotos%2FIMG_7841.jpg.jpeg?alt=media","Udon huancaína":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FUdon%20huancaina%2Fphotos%2FDSC01772%20(1).jpg.jpeg?alt=media","Scallops Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FScallops%20Roll%2Fphotos%2FDSC02524%20(1).jpg.jpeg?alt=media","Nigiris Criollo Ponja":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiris%20Criollo%20Ponja%2Fphotos%2FDSC01219.jpg.jpeg?alt=media","Matsuri Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FMatsuri%20Roll%2Fphotos%2FIMG_0230.JPG.jpeg?alt=media","Odett Mocktail":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FOdett%20Mocktail%2Fphotos%2FWhatsApp%20Image%202026-05-26%20at%2016.08.07.jpeg.jpeg?alt=media","Nigiris Grilled Ostion":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiris%20Parmesano%2Fphotos%2FDSC02581.jpg.jpeg?alt=media","Atun al sesamo":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FAtun%20al%20sesamo%2Fphotos%2F1000398740.jpg.jpeg?alt=media","Lomo saltado":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FLomo%20saltado%2Fphotos%2FLOMO%20SALTADO%20(1).jpg.jpeg?alt=media","Tartare Nikkei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTartare%20Nikkei%2Fphotos%2FTARTARE%20(3).jpg.jpeg?alt=media","Pacific Doré Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FPacific%20Dor%C3%A9%20Roll%2Fphotos%2FDSC09819.jpg.jpeg?alt=media","Asado de tira":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FAsado%20de%20tira%2Fphotos%2FDSC02461.jpg.jpeg?alt=media","Gyozas Camarón":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FGyozas%20camaron%2Fphotos%2FGYOZAS%20CAMARON%20.jpg.jpeg?alt=media","Nigiris Crispy Rice":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiris%20Crispy%20Rice%2Fphotos%2FDSC02615%20(1).jpg.jpeg?alt=media","Creamy Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCreamy%20Roll%2Fphotos%2FCreamy%20Roll1.JPG.jpeg?alt=media","Ceviche Clásico nikkei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCeviche%20Cl%C3%A1sico%20nikkei%2Fphotos%2FCEVICHE%20CLASICO.jpg.jpeg?alt=media","Chalaquito Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FChalaquito%20Roll%2Fphotos%2FDSC01421.jpg.jpeg?alt=media","Torta Opera":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FOpera%2Fphotos%2FDSC00148.jpg.jpeg?alt=media","Kimon mule":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FKimon%20mule%2Fphotos%2FDSC00932.jpg.jpeg?alt=media","Pulpo nikkei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FPulpo%20nikkei%2Fphotos%2FPULPO%20NIKKEI%20(2).jpg.jpeg?alt=media","Sashimi 12 cortes":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSashimi%2012%20cortes%2Fphotos%2FIMG_2885.jpeg.jpeg?alt=media","Torta de Brownie":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTorta%20de%20Brownie%2Fphotos%2F00e184ec-a7af-4aab-bba0-4f3bb6c0f283.jpeg.jpeg?alt=media","Asian Salad":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FAsian%20Salad%2Fphotos%2FENSALADA%20ASIAN.jpg.jpeg?alt=media","Ceviche Ishi Nikkei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FIshi%20Nikkei%2Fphotos%2F1000398741.png.jpeg?alt=media","Mar de Mariscos":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FMar%20de%20Mariscos%2Fphotos%2F881cbe13-d258-4bfc-8d46-a6af1f8d2e5a.jpeg.jpeg?alt=media","Saito Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSaito%20Roll%2Fphotos%2FSAITO%20ROLL%20(2).jpg.jpeg?alt=media","Chicken Katsu":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FChicken%20Katsu%2Fphotos%2FDSC01276.jpg.jpeg?alt=media","Sakana bao (2 pzs)":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSakana%20bao%2Fphotos%2FDSC02007.jpg.jpeg?alt=media","Tataki Salad":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTataki%20Salad%2Fphotos%2F1000398828.jpg.jpeg?alt=media","Margarita nikkei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FMargarita%20nikkei%2Fphotos%2FDSC00152.jpg.jpeg?alt=media","Sakana Furai":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSakana%20Furai%2Fphotos%2F1000123138.jpg.jpeg?alt=media","Salmón Garden (6 Pzs)":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSalm%C3%B3n%20Garden%2Fphotos%2F6e0d0224-17c7-46bc-8c20-6af6fbfbec3f.jpeg.jpeg?alt=media","Camaron pasionarios":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCamaron%20pasionarios%2Fphotos%2FCAMARONES%20APASIONARIOS.jpg.jpeg?alt=media","Nigiris Anticuchero":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiris%20Salmon%20anticuchero%2Fphotos%2FDSC02618%20(1).jpg.jpeg?alt=media","Smoke Cheese Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSmoke%20Cheese%20Roll%2Fphotos%2FSMOKE%20CHEESE%20(2).jpg.jpeg?alt=media","Tempura Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTempura%20Roll%2Fphotos%2FDSC01646.jpg.jpeg?alt=media","Nigiri Tako":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiri%20Tako%2Fphotos%2FIMG_3429.jpeg.jpeg?alt=media","Salmon Andino":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSalmon%20Andino%2Fphotos%2FScreenshot_2026-03-09-14-24-54-699_com.miui.gallery.jpg.jpeg?alt=media","Pesca al ajillo":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FPesca%20al%20ajillo%2Fphotos%2FDSC07353%20(1).jpg.jpeg?alt=media","Tiraditos Nissei":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTiraditos%20Nissei%2Fphotos%2FDSC02440.jpg.jpeg?alt=media","Furai Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FFurai%20Roll%20%2Fphotos%2F1000398829.jpg.jpeg?alt=media","Nigiris Extravaganza":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNigiris%20Extravaganza%2Fphotos%2FDSC01274.jpg.jpeg?alt=media","Sashimi Salmon":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSashimi%20Salmon%2Fphotos%2FIMG_0243.JPG.jpeg?alt=media","Rose collins":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FRose%20collins%2Fphotos%2FIMG_7828.jpg.jpeg?alt=media","Lychee Martini ( Clásico )":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FLychee%20Maritini%20(%20Cl%C3%A1sico%20)%2Fphotos%2F1000123142.jpg.jpeg?alt=media","Sashimi Atun":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSashimi%20Atun%2Fphotos%2FIMG_0237.JPG.jpeg?alt=media","Karai Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FKarai%20Roll%2Fphotos%2Fkarai%20(5).jpg.jpeg?alt=media","TNT Salmon":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTnt%20salmon%2Fphotos%2FTNT%20SALMON.jpg.jpeg?alt=media","Tiraditos Olivo":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTiraditos%20Olivo%2Fphotos%2FIMG_0238.JPG.jpeg?alt=media","Sake Koi Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSake%20Koi%20Roll%2Fphotos%2FSake%20koi%20(2).jpg.jpeg?alt=media","Udon de camarones":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FUdon%20de%20camarones%2Fphotos%2FUDON%20DE%20CAMARONES%20(1).jpg.jpeg?alt=media","Tiraditos Locos":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTiraditos%20Locos%2Fphotos%2FTIRADITO%20DE%20LOCOS%20(1).jpg.jpeg?alt=media","Tnt pulpo karami":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTnt%20pulpo%20karami%2Fphotos%2FTNT%20DE%20TAKO%20(1).jpeg.jpeg?alt=media","Gyozas tori":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FGyozas%20tori%2Fphotos%2FGYOZAS%20TORI%20(1).jpg.jpeg?alt=media","PALOMA":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FPALOMA%20%2Fphotos%2FWhatsApp%20Image%202026-05-26%20at%204.18.46%20PM.jpeg.jpeg?alt=media","Gyozas trufadas":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FGyozas%20trufadas%2Fphotos%2FGYOZAS%20TRUFADAS%20(1).jpg.jpeg?alt=media","Ceviche carretillero":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCeviche%20carretillero%2Fphotos%2FCEVICHE%20CARRETILLERO%20(2).jpg.jpeg?alt=media","Uminari Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FKinjo%20Umi%20Roll%2Fphotos%2FWhatsApp%20Image%202025-12-23%20at%2000.28.18.JPG.jpeg?alt=media","Cheesecake de Frutos Rojos":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCheesecake%20de%20Frutos%20Rojos%2Fphotos%2FIMG_4032.jpeg.jpeg?alt=media","Avocado Roll":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FAvocado%20Roll%2Fphotos%2FAVOCADO.jpg.jpeg?alt=media","Ceviche Mixto criollo":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FCeviche%20Mixto%20criollo%2Fphotos%2FDSC01690.jpg.jpeg?alt=media","Niku ramen":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FNiku%20ramen%2Fphotos%2FNIKU%20RAMEN.jpg.jpeg?alt=media","Saltado Marino":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FSaltado%20Marino%2Fphotos%2FIMG_4795.jpeg.jpeg?alt=media","Kabayaki Salad":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FKabayaki%20Salad%2Fphotos%2F1000398839.png.jpeg?alt=media","Tiramisú":"https://firebasestorage.googleapis.com/v0/b/rest-app-chile.appspot.com/o/restaurants%2FlFwud0mMFsVrrHJlslCrRpEwPsc2%2Fmenu%2FTiramis%C3%BA%2Fphotos%2F142666b7-d636-432a-a689-98f979bd3ed5.jpeg.jpeg?alt=media"
};
// SPLEAT_PHOTOS["Cremoso de mariscos"] apunta a un .mp4, no sirve como <img>; forzamos la foto local.
const PHOTO_OVERRIDES = {
  'Cremoso de mariscos': 'cremoso-mariscos.jpg', 'Postre del Amor': 'postre-del-amor.jpg', 'Chirashi ceviche': 'chirashi-ceviche.jpg', 'Gyozas Camarón': 'gyozas-camaron.jpg',
  // ── Bebidas (fotos de producto sobre fondo blanco, recortadas a la botella/lata) ──
  'Agua con gas': 'agua-con-gas.jpg', 'Agua sin gas': 'agua-sin-gas.jpg',
  'Coca Cola 350cc': 'coca-cola-classic.jpg', 'Coca Cola Zero': 'coca-cola-zero.png',
  'Pepsi': 'pepsi.jpg', 'Pepsi zero': 'pepsi-zero.jpg', 'Sprite': 'sprite.png', 'Fanta': 'fanta.jpg',
  'Crush': 'crush.jpg', 'Limon soda': 'limon-soda.jpg', 'Kem piña': 'kem.png',
  'Ginger ale': 'ginger-ale.jpg', 'Ginger ale zero': 'ginger-ale-zero.jpg', 'Canada dry tonica': 'canada-dry-tonica.jpg', 'Canada dry tonica zero': 'canada-dry-tonica-zero.jpg',
  'Redbull original': 'redbull-original.png', 'Redbull yellow': 'redbull-yellow.png',
  'Fentimans indian water tonic': 'fentimans-indian-tonic.png', 'Fentimans rose lemonade': 'fentimans-rose-lemonade.png',
  'Fentimans ginger beer': 'fentimans-ginger-beer.png', 'Fentimans water tonic ligth': 'fentimans-light-tonic.jpg'
};
function dishPhoto(name){
  return PHOTO_OVERRIDES[name] || (typeof SPLEAT_PHOTOS !== 'undefined' && SPLEAT_PHOTOS[name]) || null;
}
// Nombre visible del platillo: primera letra de cada palabra en mayúscula + aclaración.
// OJO: la clave interna (item.n) NO cambia — solo se transforma al mostrar, para no
// romper las búsquedas de foto/descripción ni los selectores CSS por alt.
const DISH_SUFFIX = { 'Chicken Katsu': ' (Pollo)', 'Sakana Furai': ' (Pescado)' };
function tcName(name){ return String(name).replace(/(^|[\s(])([a-zà-ÿ])/g, (m,p,c) => p + c.toUpperCase()); }
function dishName(name){ return tcName(name) + (DISH_SUFFIX[name] || ''); }

const SPLEAT_DESC = {"Ushio Roll":"Mix fresco de lechuga, pepinillo y palta.\nTopping de locos acevichados, chalaquita cítrica y crujiente de camote dorado.","Nori Tacos (4 pzs)":"4 Crujientes láminas de alga nori base de shari, crema de palta, lechuga chiffonade rellenas de atún y salmón con toque de acevichada, furikake y un toque de ciboulette.","Sashimi Pulpo":"Sashimi de tres cortes de pulpo, finamente laminado y presentado con elegancia al estilo tradicional japonés.","Sashimi Locos":"Sashimi de tres cortes de locos frescos, laminados finamente y presentados con elegancia al estilo japonés.","Tiraditos Umi":"Pesca del día con pulpo a la parrilla, crema de ají amarillo ahumado, palta cremosa, chalaquita y encurtido de perla.","Teri roll":"Roll con camarón tempura, queso crema, cubierto con salmon y láminas de limón con salsa Tare y semillas de sésamo.","No-rice Roll":"Roll relleno con atún, queso crema, palta y camaron tempura cubierto con salmon y toque de spicy y quinoa.","TNT Atun":"Atún aderezado con salsa dragón cubierto de Nori, con un toque de ají peruano y ciboulette.","Acevichado Roll":"Roll relleno con camarón empanizado y palta cubierto con alga nori y shari, coronado con laminas de atun, salsa acevichada y toques de furikake.","Chirashi ceviche":"Sashimi mixtos de salmón, atún, pulpo en Shari (arroz) con leche de tigre ahumada de ají peruano, palta, un toque de furikake, chalaquita peruana.","Cremoso de mariscos":"Arroz cremoso al estilo 'arroz con mariscos' peruano, con tope de Katsuobushi japonés.","Edamame al wok":"Vainas de soya salteadas al wok en aceite de sesamo con toque de sal marina.","Ceviroll":"Roll con camarón empanizado, palta y tartar de pescado fresco, cubierto con leche de tigre al estilo Nikkei.","Tartare Tuna Roll":"Roll empanizado relleno de palta y camaron, cubierto con tartar de atún spicy, toque de acevichado y furikake.","TNT Kani":"Jaiba acevichada con toque de spicy y furikake, cubierta en Nori.","Udon Saltado":"Fideos gruesos japoneses con atún y vegetales al wok, salteados en salsa de lomo saltado y parmesano.","TNT Locos":"Locos en salsa con chalaquita de palta, pasta de ají amarillo, un toque acevichado cubierto en Nori.","Tartare Sake Roll":"Roll con camarón y palta, cubierto nori, shari, tartar de salmón con toque spicy y sala taré.","Nori Tacos (2 pzs)":"2 Crujientes láminas de alga nori base de shari, crema de palta, lechuga chiffonade rellenas de atún y salmón con toque de acevichada, furikake y un toque de ciboulette.","Nigiris Nissei":"Nigiri de pesca del día en shari con emulsión de ají amarillo, chalaquita y furikake.","Umi Coctel":"Gin Tanqueray Ten, vermut blanco, maracuyá y limón, equilibrados con syrup de té Earl Grey y sutiles notas de chocolate blanco. Final floral de viola. 🍸","Udon huancaína":"Fideos gruesos japoneses al estilo Nikkei en salsa huancaína y parmesano, con lomo saltado con cilantro y tomates cherry.","Scallops Roll":"Roll con camarón crocante y palta, cubierto con ostiones al estilo batayaki y gratinado con queso parmesano fundido.","Nigiris Criollo Ponja":"Pesca del día con ají criollo y chimichurri nikkei.","Matsuri Roll":"Roll relleno de camarón tempura, palta y kiuri japones, cubierto con tartar de camarón y salsa dragon y un toque de ciboulette.","Odett Mocktail":"Sirope de Té de ceilán, jugo fresco de limón sutil, puré casero de lychee recién hecho y decorado elegantemente con caviares de lychee.","Nigiris Grilled Ostion":"Ostiones gratinados con mantequilla japonesa y ciboulette.","Atun al sesamo":"Atún sellado con costra de sésamo, puré de papa, miel pasionaria y mix de verdes.","Lomo saltado":"Filete de res con cebolla morada y tomate, en salsa de lomo saltado. Acompañado con papas cuñas y arroz shari y ajonjoli.","Tartare Nikkei":"Tartar de atún y salmón aderezado, con base de palta cubierto con un crocante japonés con toques de acevichada y spicy, acompañadas con tostadas den tinta de sepia.","Pacific Doré Roll":"Relleno de queso crema, espárragos y pimientos salteados, con lomo fino en tempura, cubierto con filete de lomo y flameado con salsa parrillera de la casa.","Asado de tira":"Res cocida a baja temperatura por 6 horas, acompañado de puré de papa y salsa nitsuke, choclo crocante, zanahorias y zetas.","Gyozas Camarón":"Gyosas de camarón aderezado fritas y bañadas en salsa acevichada y una decorado con brotes.","Nigiris Crispy Rice":"Shari crocante con tartar de salmón, toque de gochujang y ciboulette.","Creamy Roll":"Roll con camarón tempura, palta y queso crema, cubierto con crema de pizza flameado, salsa tare y aceite de orégano.","Ceviche Clásico nikkei":"Pesca del día marinada en leche de tigre, cebolla morada y puré de camote glaseado acompañado con cancha peruana y choclo.","Chalaquito Roll":"Roll relleno de palta y chicharrón de pescado, coronado con leche de tigre de rocoto ahumada y chalaquita fresca.","Torta Opera":"Capas de bizcocho de almendra con café espresso, crema al café y ganache de chocolate negro.","Kimon mule":"Reinterpretación del clásico mule, shrub de ají amarillo, zumo de limon, syrup simple, ginger beer, espuma de jengibre y ralladura de limon sutil.","Pulpo nikkei":"Pulpo al grill, bañado en salsa anticuchera y acompañado de papas cuñas crocantes.","Asian Salad":"Mix de lechugas con camarones al panko, dressing oriental, crujiente de nori cracker, tomates cherry y parmesano.","Ceviche Ishi Nikkei":"Pesca del día con chicharrón de pescado, salsa acevichada y leche de tigre de ají amarillo ahumada.","Mar de Mariscos":"Selección de camarón, calamar y pulpo salteados y grillados, bañados en salsa de mariscos elaborada con la pesca del día, acompañado de arroz nikkei.","Saito Roll":"Roll relleno con camaron empanizado, palta, flameado con crema de jaibas (cangrejo) y mantequilla parmesana con un toque spicy.","Chicken Katsu":"Pechuga de pollo marinada, empanizada en panko japonés y frita hasta quedar dorada y crujiente. Servidas con papas fritas.","Sakana bao (2 pzs)":"Dos Bao de chicharrón de pescado con salsa tártara y criolla, cebolla morada y mix de lechuga.","Tataki Salad":"Mix de lechugas, palta, tomate cherry y palmito, acompañados de tataki de atún y dressing ponja.","Margarita nikkei":"Refrescante mezcla de Tequila con Cointreau y frutas tropicales de mango y maracuyá, equilibrado con limón y servido bien frío con espuma de sal de mar y wasabi.","Sakana Furai":"Pesca del dia, sazonado y empanizado en panko japonés, frito con una textura dorada y crujiente. Acompañado con arroz o papas fritas.","Salmón Garden (6 Pzs)":"Espiral de salmón fresco envolviendo shari, con topping de puré cremoso de palta, terminado con chalaquita peruana.","Camaron pasionarios":"Camarones bañados en miel de maracuyá con toque de ajo y ajonjoli, picante, en una base de fideos de arroz crujientes.","Nigiris Anticuchero":"Nigiri de salmón en shari con salsa anticuchera, chimichurri y palta.","Smoke Cheese Roll":"Roll con langostinos tempura, palta, cubierto con queso crema gratinado y chimichurri japonés.","Tempura Roll":"Roll Clasico con camarón tempura crocante, queso crema suave y palta fresca.","Nigiri Tako":"Nigiri de pulpo en shari con mousse de palta, puré de camote, chalaquita y togarashi.","Salmon Andino":"Salmon grillado con pesto criollo andino y quinoa, tope arroz crocante, salsa de ají peruano y chalaquita de la casa.","Ceviche Veggie Nikkei":"Champiñones, palta y palmito en leche de tigre vegetal (amarilla o ponzu).","Pesca al ajillo":"Pesca al grill con mixtura de mariscos, bañada en salsa de ajo, acompañado de arroz nikkei.","Tiraditos Nissei":"Pesca del día con chicharrón de pescado, salsa acevichada y leche de tigre de ají amarillo ahumada.","Furai Roll":"Roll Clasico Tempura relleno con salmon, queso crema, palta.","Nigiris Extravaganza":"Salmón fresco flameado con mantequilla japonesa, oroshi de limón, furikake y ciboulette.","Sashimi Salmon":"Sashimi de tres cortes de salmón fresco, delicadamente laminado y presentado al estilo tradicional japonés.","Rose collins":"Una versión floral del clásico Collins, combinando notas cítricas con delicadas esencias de rosa para un final suave y aromático.","Sashimi Atun":"Sashimi de tres cortes de atún fresco, finamente laminado y presentado con la pureza y delicadeza del estilo japonés.","Karai Roll":"Roll con camarón tempura, palta y cubos de salmón en salsa dragón flambeados con Tare.","TNT Salmon":"Salmón en Nori aderezado con salsa spicy al estilo TNT y un toque de ciboulette y furikake.","Tiraditos Olivo":"Pulpo al olivo con emulsión de palta y chalaquita fresca.","Sake Koi Roll":"Roll con camarón empanizado, queso crema y salmón flameado, finalizado con ralladura de limón.","Udon de camarones":"Fideos gruesos japoneses bañados en reducción de mariscos con ajíes peruanos, y croquetas de arroz.","Tiraditos Locos":"Locos en salsa de leche de tigre amarilla ahumada, chalaquita y palta cremosa.","Tnt pulpo karami":"Pulpo al olivo con chalaquita y emulsión de palta sobre shari crocante.","Gyozas tori":"Rellenas de pollo y col con aromas asiáticos, acompañadas de salsa huancaína.","PALOMA":"Tequila Don Julio Blanco, soda de pomelo, jugo de limón fresco y jarabe syrup. Un cóctel balanceado, cítrico y sumamente refrescante.","Gyozas trufadas":"Rellenas de champiñón, perfumadas con aceite de trufa y un toque de sesamo.","Ceviche carretillero":"Pesca del día con mariscos de temporada, bañados en leche de tigre al rocoto y coronados con chicharrón de pescado, con cancha peruana y choclo.","Uminari Roll":"Relleno de palta, salmón y pulpa de jaiba acevichada.\nCubierto con salmón y corvina flameada, bañado en salsa anticuchera de la casa, con toque de ají ahumado y chalaquita fresca.","Avocado Roll":"Roll con queso crema y camarón tempura, cubierto con palta, semillas de sesamo y salsa taré.","Ceviche Mixto criollo":"Pesca del día, atún, salmón y camarón en leche de tigre clásica acompañado con puré de camote glaseado, choclo tostado y cancha peruana.","Saltado Marino":"Camarón, pulpo, ostiones, champiñones, maíz, brócoli, tomates cherry y cebolla morada saltados, sobre una cama de papas cuña y shari para acompañar.","Kabayaki Salad":"Mix de lechugas con cebolla crocante, pollo teriyaki, tomate y pepino encurtido.","Gyozas Lomo":"Rellenas de lomo fino salteado al wok con cebolla morada, ají amarillo y un toque de soya. Servidas con salsa sriracha o acevichada a elección. Puedes disfrutarlas al vapor o fritas."};

buildMenu();

// ── REEL FUNCTIONS ────────────────────────────────────────────────────────────
function playReel(card) {
  const video    = card.querySelector('.reel-video');
  const playBtn  = card.querySelector('.reel-play-btn');
  const soundBtn = card.querySelector('.reel-sound-btn');
  document.querySelectorAll('.reel-embed-card').forEach(c => {
    if (c === card) return;
    const v = c.querySelector('.reel-video');
    const s = c.querySelector('.reel-sound-btn');
    const p = c.querySelector('.reel-play-btn');
    v.muted = true;
    if(s){ s.classList.remove('visible'); s.classList.add('muted'); s.querySelector('.icon-muted').style.display=''; s.querySelector('.icon-sound').style.display='none'; }
    if(p) p.classList.remove('hidden');
  });
  video.muted = false;
  playBtn.classList.add('hidden');
  soundBtn.classList.add('visible');
  soundBtn.classList.remove('muted');
  soundBtn.querySelector('.icon-muted').style.display = 'none';
  soundBtn.querySelector('.icon-sound').style.display = '';
}

function toggleReelSound(e, btn) {
  e.stopPropagation();
  const video = btn.closest('.reel-embed-card').querySelector('.reel-video');
  const muted = btn.classList.contains('muted');
  document.querySelectorAll('.reel-sound-btn').forEach(b => {
    if (b === btn) return;
    const v = b.closest('.reel-embed-card').querySelector('.reel-video');
    v.muted = true; b.classList.add('muted');
    b.querySelector('.icon-muted').style.display=''; b.querySelector('.icon-sound').style.display='none';
  });
  video.muted = !muted;
  btn.classList.toggle('muted', !muted);
  btn.querySelector('.icon-muted').style.display = muted ? 'none' : '';
  btn.querySelector('.icon-sound').style.display  = muted ? '' : 'none';
}

// ── EVENTOS / GALERÍA ─────────────────────────────────────────────────────────
// Cada evento: portada = primer elemento de media. Agregar imágenes/video aquí.
const EVENTOS = {
  'dia-de-las-madres-2026': {
    title: 'Día de las Madres 2026',
    media: [
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-03.mp4' },
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-01.mp4' },
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-02.mp4' },
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-04.mp4' },
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-05.mp4' },
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-06.mp4' },
      { t:'video', s:'eventos/dia-de-las-madres-2026/video-07.mp4' }
    ]
  },
  'barco-gigante-2026': {
    title: 'Barco Gigante 2026',
    media: [
      { t:'img', s:'eventos/barco-gigante-2026/05.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/01.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/02.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/03.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/04.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/06.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/07.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/08.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/09.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/10.jpg' },
      { t:'img', s:'eventos/barco-gigante-2026/11.jpg' }
    ]
  },
  'maridaje-7-tiempos': {
    title: 'Maridaje de 7 Tiempos',
    media: [
      { t:'img', s:'eventos/maridaje-7-tiempos/04.jpg' },
      { t:'img', s:'eventos/maridaje-7-tiempos/01.jpg' },
      { t:'img', s:'eventos/maridaje-7-tiempos/02.jpg' },
      { t:'img', s:'eventos/maridaje-7-tiempos/03.jpg' },
      { t:'img', s:'eventos/maridaje-7-tiempos/05.jpg' }
    ]
  },
  'san-valentin-2026': {
    title: 'San Valentín 2026',
    media: [
      { t:'img', s:'eventos/san-valentin-2026/03.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/05.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/01.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/02.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/04.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/06.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/07.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/08.jpg' },
      { t:'img', s:'eventos/san-valentin-2026/09.jpg' },
      { t:'video', s:'eventos/san-valentin-2026/video-01.mp4' },
      { t:'video', s:'eventos/san-valentin-2026/video-02.mp4' },
      { t:'video', s:'eventos/san-valentin-2026/video-03.mp4' },
      { t:'video', s:'eventos/san-valentin-2026/video-04.mp4' }
    ]
  },
  'halloween-2025': {
    title: 'Halloween 2025',
    media: [
      { t:'img', s:'eventos/halloween-2025/01.jpg' },
      { t:'img', s:'eventos/halloween-2025/02.jpg' },
      { t:'img', s:'eventos/halloween-2025/03.jpg' },
      { t:'img', s:'eventos/halloween-2025/04.jpg' },
      { t:'img', s:'eventos/halloween-2025/05.jpg' },
      { t:'img', s:'eventos/halloween-2025/06.jpg' },
      { t:'img', s:'eventos/halloween-2025/07.jpg' },
      { t:'img', s:'eventos/halloween-2025/08.jpg' },
      { t:'img', s:'eventos/halloween-2025/09.jpg' },
      { t:'img', s:'eventos/halloween-2025/10.jpg' },
      { t:'img', s:'eventos/halloween-2025/11.jpg' },
      { t:'img', s:'eventos/halloween-2025/12.jpg' },
      { t:'img', s:'eventos/halloween-2025/13.jpg' },
      { t:'img', s:'eventos/halloween-2025/14.jpg' },
      { t:'img', s:'eventos/halloween-2025/15.jpg' },
      { t:'img', s:'eventos/halloween-2025/16.jpg' },
      { t:'img', s:'eventos/halloween-2025/17.jpg' },
      { t:'img', s:'eventos/halloween-2025/18.jpg' },
      { t:'img', s:'eventos/halloween-2025/19.jpg' },
      { t:'img', s:'eventos/halloween-2025/20.jpg' },
      { t:'img', s:'eventos/halloween-2025/21.jpg' },
      { t:'img', s:'eventos/halloween-2025/22.jpg' }
    ]
  }
};

let _evMedia = [], _evIdx = 0, _evTimer = null;

function _evCell(m){
  if(m && m.t === 'video') return `<video src="${m.s}" muted playsinline preload="metadata"></video>`;
  return `<img src="${m ? m.s : ''}" alt="" loading="lazy">`;
}
function _evMainCell(m){
  if(m && m.t === 'video') return `<video src="${m.s}" controls autoplay playsinline></video>`;
  return `<img src="${m ? m.s : ''}" alt="">`;
}
function renderEventStage(){
  const n = _evMedia.length; if(!n) return;
  const cur  = _evMedia[_evIdx];
  const prev = _evMedia[(_evIdx - 1 + n) % n];
  const next = _evMedia[(_evIdx + 1) % n];
  document.getElementById('eventMain').innerHTML = _evMainCell(cur);
  const prevEl = document.getElementById('eventPrev');
  const nextEl = document.getElementById('eventNext');
  // con una sola imagen no mostramos miniaturas laterales
  prevEl.innerHTML = n > 1 ? _evCell(prev) : '';
  nextEl.innerHTML = n > 1 ? _evCell(next) : '';
  prevEl.style.visibility = n > 1 ? '' : 'hidden';
  nextEl.style.visibility = n > 1 ? '' : 'hidden';
}
function scheduleEventAuto(){
  clearTimeout(_evTimer);
  if(_evMedia.length < 2) return;
  // Rota siempre; a los videos les damos más tiempo para que se vean antes de avanzar
  const delay = (_evMedia[_evIdx] && _evMedia[_evIdx].t === 'video') ? 7000 : 3000;
  _evTimer = setTimeout(() => {
    _evIdx = (_evIdx + 1) % _evMedia.length;
    renderEventStage();
    scheduleEventAuto();
  }, delay);
}
function openEventGallery(id){
  const ev = EVENTOS[id]; if(!ev) return;
  _evMedia = ev.media.slice();
  _evIdx = 0;
  document.getElementById('eventModalTitle').textContent = ev.title;
  renderEventStage();
  document.getElementById('eventModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  scheduleEventAuto();
}
function eventGoRel(d){
  const n = _evMedia.length; if(n < 2) return;
  _evIdx = (_evIdx + d + n) % n;
  renderEventStage();
  scheduleEventAuto(); // reinicia el reloj al navegar a mano
}
function closeEventGallery(){
  clearTimeout(_evTimer); _evTimer = null;
  document.getElementById('eventModal').classList.remove('open');
  document.body.style.overflow = '';
}
// Desplaza el carrusel de categorías de eventos una tarjeta a izq/der.
function evRowStep(dir){
  const row = document.getElementById('eventosGrid');
  if(!row) return;
  const card = row.querySelector('.evento-card');
  const gap = parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap) || 22;
  const w = card ? card.getBoundingClientRect().width + gap : 260;
  row.scrollBy({ left: dir * w, behavior: 'smooth' });
}
document.addEventListener('keydown', (e) => {
  if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
  // Con la galería de eventos abierta, las flechas cambian de imagen
  const md = document.getElementById('eventModal');
  if(md && md.classList.contains('open')){
    if(e.key === 'Escape') closeEventGallery();
    else if(e.key === 'ArrowLeft') eventGoRel(-1);
    else if(e.key === 'ArrowRight') eventGoRel(1);
    return;
  }
  if(e.key === 'Escape') return;
  // No secuestrar las flechas mientras se escribe en un campo
  const tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
  const dir = e.key === 'ArrowLeft' ? -1 : 1;
  // Enruta la flecha al carrusel más visible en pantalla
  const secs = [
    { el: document.getElementById('favCarousel'),           act: () => favGo(favIdx + dir, true) },
    { el: document.getElementById('eventosGrid'),           act: () => evRowStep(dir) },
    { el: document.querySelector('.reviews-track-wrap'),    act: () => window._revStep && window._revStep(dir) },
  ];
  const vh = window.innerHeight;
  let best = null, bestVis = 0;
  secs.forEach(s => {
    if(!s.el) return;
    const r = s.el.getBoundingClientRect();
    const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    if(vis > bestVis){ bestVis = vis; best = s; }
  });
  if(best && bestVis > 40){ e.preventDefault(); best.act(); }
});
// Carruseles que se deslizan solos en bucle continuo (como los reviews):
// la galería de categorías en PC y móvil; los reels sólo en móvil.
(function(){
  function autoLoop(el, speed){
    if(!el || el.children.length === 0) return;
    el.innerHTML += el.innerHTML;        // duplica el contenido para un bucle continuo
    el.style.scrollBehavior = 'auto';
    let auto = null, pos = 0;
    const half = () => el.scrollWidth / 2;
    function tick(){ pos += speed; const h = half(); if(h && pos >= h) pos -= h; el.scrollLeft = pos; }
    function start(){ clearInterval(auto); pos = el.scrollLeft; auto = setInterval(tick, 16); }
    function stop(){ clearInterval(auto); }
    // Pausa al pasar el mouse (PC) o mientras se desliza con el dedo (móvil)
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    el.addEventListener('touchstart', stop, {passive:true});
    el.addEventListener('touchend', () => { clearTimeout(el._rs); el._rs = setTimeout(start, 2500); }, {passive:true});
    start();
  }
  // Auto-desplazamiento "ida y vuelta" SIN duplicar contenido (para los reels): mantiene
  // los 4 videos originales, se autodesliza y permite deslizar con el dedo.
  function autoPingPong(el, speed){
    if(!el || el.children.length === 0) return;
    el.style.scrollBehavior = 'auto';
    let auto = null, dir = 1, pos = 0;
    function tick(){
      const max = el.scrollWidth - el.clientWidth;
      if(max <= 0) return;
      pos += speed * dir;
      if(pos >= max){ pos = max; dir = -1; }
      else if(pos <= 0){ pos = 0; dir = 1; }
      el.scrollLeft = pos;
    }
    function start(){ clearInterval(auto); pos = el.scrollLeft; auto = setInterval(tick, 16); }
    function stop(){ clearInterval(auto); }
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    // Deslizar con el dedo: pausa el auto y reanuda desde donde quedó
    el.addEventListener('touchstart', stop, {passive:true});
    el.addEventListener('touchend', () => { clearTimeout(el._rs); el._rs = setTimeout(start, 2500); }, {passive:true});
    start();
  }
  // Galería: se desliza sola en todas las pantallas (loop continuo)
  autoLoop(document.getElementById('eventosGrid'), 0.3);
  // Reels: sólo en móvil (en PC ya se ven las 4 en cuadrícula); sin duplicar, ida y vuelta
  if(window.matchMedia('(max-width:700px)').matches){
    autoPingPong(document.querySelector('.reels-grid'), 0.6);
  }
})();

// Deslizar con el dedo en móvil (o mouse-drag) para cambiar de imagen
(function(){
  const stage = document.getElementById('eventStage');
  if(!stage) return;
  let x0 = 0, dx = 0, drag = false;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; dx = 0; drag = true; }, {passive:true});
  stage.addEventListener('touchmove', (e) => {
    if(!drag) return;
    dx = e.touches[0].clientX - x0;
    if(Math.abs(dx) > Math.abs(e.touches[0].clientY - 0)) { /* horizontal */ }
  }, {passive:true});
  stage.addEventListener('touchend', () => {
    if(!drag) return; drag = false;
    if(dx <= -40) eventGoRel(1);
    else if(dx >= 40) eventGoRel(-1);
  });
})();

// ── REVIEWS MARQUEE ───────────────────────────────────────────────────────────
// Comillas azules de apertura/cierre y cierre truncado (con puntos suspensivos)
const REV_QO = '<span class="rev-q">"</span>';        // apertura
const REV_QC = '<span class="rev-q">"</span>';        // cierre completo
const REV_QT = '...<span class="rev-q">"</span>';     // cierre truncado ..."

(function(){
  const track = document.getElementById('revTrack');
  if(!track) return;
  const MAX_LINES = 8;

  function processAll(){
    track.querySelectorAll('.rev-text').forEach(txt => {
      if(txt.classList.contains('rev-open')) return; // no tocar las abiertas por el usuario
      if(txt.dataset.full === undefined){
        txt.dataset.full  = txt.innerHTML;   // HTML original (conserva <br>)
        txt.dataset.plain = txt.textContent; // texto plano para truncar
      }
      const lh = parseFloat(getComputedStyle(txt).lineHeight) || 22;
      const maxH = lh * MAX_LINES + 2;
      // ¿cabe completa entre comillas?
      txt.innerHTML = REV_QO + txt.dataset.full + REV_QC;
      if(txt.scrollHeight <= maxH){
        txt.classList.remove('rev-clamped');
        return; // reseña corta: sin botón
      }
      // reseña larga: truncar por palabras hasta que quepa con ..."
      const words = txt.dataset.plain.trim().split(/\s+/);
      let lo = 1, hi = words.length, best = 1;
      while(lo <= hi){
        const mid = (lo + hi) >> 1;
        const s = words.slice(0, mid).join(' ').replace(/[\s,;.]+$/, '');
        txt.innerHTML = REV_QO + s + REV_QT;
        if(txt.scrollHeight <= maxH){ best = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      const s = words.slice(0, best).join(' ').replace(/[\s,;.]+$/, '');
      txt.dataset.trunc = s;
      txt.innerHTML = REV_QO + s + REV_QT;
      txt.classList.add('rev-clamped');
      let btn = txt.nextElementSibling;
      if(!btn || !btn.classList.contains('rev-more')){
        btn = document.createElement('button');
        btn.className = 'rev-more visible';
        btn.setAttribute('onclick', 'toggleRevMore(this)');
        txt.insertAdjacentElement('afterend', btn);
      }
      btn.textContent = 'Ver más';
    });
  }

  processAll();
  const clone = track.innerHTML;
  track.innerHTML = clone + clone;
  // Recalcular el corte cuando la fuente termine de cargar (medidas exactas)
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(processAll); }

  // ── Auto-scroll continuo + navegación con flechas del teclado ──────────────
  const wrap = track.closest('.reviews-track-wrap');
  if(wrap){
    let auto = null, pos = 0;
    const revSpeed = window.matchMedia('(max-width:700px)').matches ? 0.62 : 0.35; // más rápido en móvil
    const half = () => track.scrollWidth / 2;
    function tick(){
      pos += revSpeed;
      const h = half();
      if(h && pos >= h) pos -= h;
      wrap.scrollLeft = pos;   // acumulador flotante: permite sub-píxel continuo
    }
    function start(){ clearInterval(auto); pos = wrap.scrollLeft; auto = setInterval(tick, 16); }
    function stop(){ clearInterval(auto); }
    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', start);
    // Móvil: al tocar/deslizar con el dedo se pausa el auto-scroll para que el usuario
    // pueda arrastrar libremente de un lado a otro; reanuda desde donde quedó al soltar.
    wrap.addEventListener('touchstart', stop, {passive:true});
    wrap.addEventListener('touchmove', stop, {passive:true});
    wrap.addEventListener('touchend', () => {
      clearTimeout(window._revResume);
      window._revResume = setTimeout(start, 3500);
    }, {passive:true});
    start();
    // Paso manual (flechas): desplaza una tarjeta y reinicia el reloj
    window._revStep = (dir) => {
      const card = track.querySelector('.rev-card');
      const w = card ? card.getBoundingClientRect().width + 22 : 300;
      const h = half();
      if(dir < 0 && wrap.scrollLeft < w && h) wrap.scrollLeft += h; // permite ir hacia atrás sin toparse en 0
      wrap.scrollBy({ left: dir * w, behavior: 'smooth' });
      stop(); clearTimeout(window._revResume);
      window._revResume = setTimeout(start, 2500);
    };
  }
})();

function toggleRevMore(btn){
  const txt = btn.previousElementSibling;
  const open = txt.classList.toggle('rev-open');
  if(open){
    txt.innerHTML = REV_QO + txt.dataset.full + REV_QC;
    btn.textContent = 'Ver menos';
  } else {
    txt.innerHTML = REV_QO + txt.dataset.trunc + REV_QT;
    btn.textContent = 'Ver más';
  }
}

// ── PAGO CON TARJETA EN LA WEB (Mercado Pago Brick) ───────────────────────────
const MP_PUBLIC_KEY = 'APP_USR-4f89ddca-0f8e-4dcb-bd6b-59ecb085ee70';
let pendingCardOrder = null;
let mpInstance = null;
let cardBrickController = null;

function openCardPayment(orderData){
  pendingCardOrder = orderData;
  const amtEl = document.getElementById('cardAmount');
  if(amtEl) amtEl.textContent = fmt(orderData.total);
  document.getElementById('cardModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCardBrick(orderData.total);
}

function closeCardModal(){
  document.getElementById('cardModal').classList.remove('open');
  document.body.style.overflow = '';
  if(cardBrickController){ try{ cardBrickController.unmount(); }catch(e){} cardBrickController = null; }
  const c = document.getElementById('cardBrickContainer'); if(c) c.innerHTML = '';
}

async function renderCardBrick(amount){
  if(typeof MercadoPago === 'undefined'){ alert('No se pudo cargar el sistema de pago. Revisa tu conexión e intenta de nuevo.'); return; }
  if(!mpInstance){ mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale:'es-CL' }); }
  const bricks = mpInstance.bricks();
  try {
    cardBrickController = await bricks.create('cardPayment', 'cardBrickContainer', {
      initialization: { amount: Math.round(amount) },
      customization: { visual: { style: { theme: 'dark' } } },
      callbacks: {
        onReady: () => {},
        onError: (error) => { console.error('Brick error:', error); },
        onSubmit: (formData) => {
          return new Promise((resolve, reject) => {
            fetch('/api/process-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: formData.token,
                payment_method_id: formData.payment_method_id,
                issuer_id: formData.issuer_id,
                installments: formData.installments,
                payer: formData.payer,
                monto: Math.round(amount),
                descripcion: 'Pedido Umi - ' + ((pendingCardOrder && pendingCardOrder.name) || ''),
                order: {
                  name: (pendingCardOrder && pendingCardOrder.name) || '',
                  phone: (pendingCardOrder && pendingCardOrder.phone) || '',
                  addr: (pendingCardOrder && pendingCardOrder.addr) || '',
                  notes: (pendingCardOrder && pendingCardOrder.notes) || '',
                  lat: (pendingCardOrder && pendingCardOrder.lat) || null,
                  lng: (pendingCardOrder && pendingCardOrder.lng) || null,
                  entregaMode: entregaMode,
                  deliveryFee: deliveryFee,
                  deliveryKm: deliveryKm,
                  items: cart.map(function(r){ return { n:r.n, qty:r.qty, p:r.p }; }),
                  total: Math.round(amount)
                }
              })
            })
            .then(r => r.json())
            .then(res => {
              if(res.status === 'approved'){
                resolve();
                onCardApproved();
              } else if(res.status === 'in_process' || res.status === 'pending'){
                resolve();
                alert('Tu pago está siendo procesado. Te confirmaremos apenas se acredite.');
                closeCardModal();
              } else {
                reject();
                alert('El pago no se aprobó: ' + (res.status_detail || res.error || 'intenta con otra tarjeta'));
              }
            })
            .catch(() => { reject(); alert('Error de conexión al procesar el pago.'); });
          });
        }
      }
    });
  } catch(e){ console.error(e); alert('No se pudo cargar el formulario de pago.'); }
}

async function onCardApproved(){
  const p = pendingCardOrder || {};
  // 1) Registrar el pedido PAGADO en el sistema (SPLEAT/POS)
  try { await sendToSpleat(p.name, p.phone, p.addr, p.notes); } catch(e){}
  // 2) Armar mensaje de WhatsApp con aviso de pago con tarjeta
  const now = new Date().toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'});
  const entregaLabel = entregaMode === 'retiro' ? 'Retiro en local' : 'Delivery';
  let lines = `\u{1F363} *NUEVO PEDIDO - Umi*\n\n✅ *PAGADO CON TARJETA*\n\n*Detalle:*\n`;
  cart.forEach(r => { lines += `  \u{25B8} ${r.n} x${r.qty} = ${fmt(r.p*r.qty)}\n`; });
  const sub = cartSubtotal();
  if(entregaMode === 'delivery' && deliveryFee > 0){ lines += `\nSubtotal: ${fmt(sub)}\nEnvío (${deliveryKm} km): ${fmt(deliveryFee)}\n*Total: ${fmt(cartTotal())}*\n\n`; }
  else { lines += `\n*Total: ${fmt(cartTotal())}*\n\n`; }
  lines += `*Cliente:* ${p.name}\n*Tel:* ${p.phone}\n*Entrega:* ${entregaLabel}\n`;
  if(entregaMode === 'delivery'){ lines += `*Dirección:* ${p.addr}\n*Maps:* https://maps.google.com/?q=${encodeURIComponent((p.addr||'')+', Coquimbo, Chile')}\n`; }
  lines += `*Pago:* Tarjeta (pagado online) ✅\n`;
  if(p.notes) lines += `*Notas:* ${p.notes}\n`;
  lines += `\nPedido a las ${now}`;
  const waLink = 'https://wa.me/'+WA+'?text='+encodeURIComponent(lines);
  // Puntos ganados con esta compra (capturar antes de limpiar el carrito)
  const ganadosPuntos = (window.umiIsRegistered && window.umiIsRegistered()) ? puntosGanaPedido() : 0;
  // Cerrar modal y limpiar carrito
  closeCardModal();
  aplicarPuntosTrasPedido();
  cart = []; renderCart(); updateBadge();
  // 3) Pantalla de éxito (el aviso a Umi se envía AUTOMÁTICO desde el servidor)
  const ov = document.createElement('div');
  ov.id = 'paidOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,12,16,.93);display:flex;align-items:center;justify-content:center;padding:1.5rem';
  ov.innerHTML = `
    <div style="max-width:420px;width:100%;background:#0d1520;border:1px solid #1e2d3d;border-radius:18px;padding:2rem 1.6rem;text-align:center;font-family:'Inter',sans-serif;color:#e8edf2">
      <div style="margin-bottom:.4rem;display:flex;justify-content:center"><svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg></div>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;margin-bottom:.5rem;color:#fff">¡Pago recibido!</h2>
      <p style="color:#6b7d8f;font-size:.95rem;margin-bottom:1.4rem">Tu pedido ya fue enviado a Umi y está en preparación. ¡Gracias!</p>
      ${ganadosPuntos > 0 ? `<div style="background:rgba(98,202,227,.12);border:1px solid #62CAE3;border-radius:12px;color:#62CAE3;font-weight:700;font-size:1rem;padding:.85rem;margin-bottom:1.4rem">★ Con esta compra acumulaste ${ganadosPuntos.toLocaleString('es-CL')} puntos UMI</div>` : ''}
      <button onclick="document.getElementById('paidOverlay').remove()" style="display:block;width:100%;background:var(--teal);color:#000;font-weight:700;padding:.9rem;border-radius:999px;border:none;cursor:pointer;margin-bottom:.7rem">Listo</button>
      <a href="${waLink}" target="_blank" style="color:#6b7d8f;font-size:.8rem;text-decoration:underline">¿Algún problema? Avísanos por WhatsApp</a>
    </div>`;
  document.body.appendChild(ov);
}

// ── INFO DE USUARIO (modal esquina superior) ─────────────────────────────────
function umiUserClick(){
  const p = window.umiGetProfile ? window.umiGetProfile() : null;
  if(!p){ if(window.umiOpenAuth) umiOpenAuth(); return; }
  document.getElementById('uiName').textContent = p.name || '—';
  document.getElementById('uiMail').textContent = p.email || '';
  document.getElementById('uiPts').textContent = (p.points || 0).toLocaleString('es-CL');
  document.getElementById('uiWa').textContent = p.whatsapp || '—';
  document.getElementById('uiBday').textContent = p.birthday || '—';
  document.getElementById('userModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeUserInfo(){
  document.getElementById('userModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ── MAPA (modal) ──────────────────────────────────────────────────────────────
function openMap(){
  const frame = document.getElementById('mapFrame');
  if(frame && !frame.src) frame.src = frame.dataset.src; // carga perezosa
  document.getElementById('mapModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMap(){
  document.getElementById('mapModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ── TÉRMINOS Y CONDICIONES ────────────────────────────────────────────────────
function openTerms(){
  document.getElementById('termsModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeTerms(){
  document.getElementById('termsModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ── COMENTARIOS Y RECLAMOS ────────────────────────────────────────────────────
function openFeedback(){
  document.getElementById('feedbackModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFeedback(){
  document.getElementById('feedbackModal').classList.remove('open');
  document.body.style.overflow = '';
}
function fbCount(){
  const t = document.getElementById('fbMensaje');
  document.getElementById('fbChars').textContent = t.value.length;
}
async function enviarFeedback(){
  const nombre   = document.getElementById('fbNombre').value.trim();
  const correo   = document.getElementById('fbCorreo').value.trim();
  const telefono = document.getElementById('fbTelefono').value.trim();
  const mensaje  = document.getElementById('fbMensaje').value.trim();
  const status   = document.getElementById('fbStatus');
  const btn      = document.getElementById('fbSend');

  if(!nombre || !correo || !telefono || !mensaje){
    status.textContent = 'Todos los campos son obligatorios.';
    status.className = 'fb-status error'; return;
  }
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)){
    status.textContent = 'Ingresa un correo válido.';
    status.className = 'fb-status error'; return;
  }
  if(telefono.replace(/\D/g,'').length < 8){
    status.textContent = 'Ingresa un teléfono válido (mín. 8 dígitos).';
    status.className = 'fb-status error'; return;
  }

  btn.disabled = true; btn.textContent = 'Enviando...';
  status.textContent = ''; status.className = 'fb-status';
  try {
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, telefono, mensaje })
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || 'Error al enviar');
    status.textContent = '¡Mensaje enviado! Gracias por escribirnos.';
    status.className = 'fb-status ok';
    document.getElementById('fbNombre').value = '';
    document.getElementById('fbCorreo').value = '';
    document.getElementById('fbTelefono').value = '';
    document.getElementById('fbMensaje').value = '';
    fbCount();
    setTimeout(closeFeedback, 2500);
  } catch(e){
    status.textContent = e.message || 'No se pudo enviar. Intenta de nuevo.';
    status.className = 'fb-status error';
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar';
  }
}

// ── CARRUSEL FAVORITOS (Los más pedidos) ─────────────────────────────────────
const FAVORITOS = ['Saito Roll', 'Tartare Nikkei', 'Lomo saltado', 'Acevichado Roll'];
// Fotos propias en alta calidad para el carrusel (optimizadas a 1920px)
const FAV_IMGS = {
  'Acevichado Roll': 'fav-acevichado.jpg?v=2',
  'Saito Roll':      'fav-saito.jpg',
  'Lomo saltado':    'fav-lomo.jpg',
  'Tartare Nikkei':  'fav-tartare.jpg?v=2'
};
let favIdx = 0, favTimer = null;

function favFind(name){
  for(const [cat, items] of Object.entries(MENU)){
    for(const it of items){ if(it.n === name) return { cat, item: it }; }
  }
  return null;
}

function buildFavCarousel(){
  const track = document.getElementById('favTrack');
  const dots  = document.getElementById('favDots');
  if(!track || !dots) return;
  FAVORITOS.forEach((name, i) => {
    const f = favFind(name); if(!f) return;
    const img = FAV_IMGS[name] || dishPhoto(name) || '';
    const nEsc = name.replace(/'/g, "\\'");
    const cEsc = f.cat.replace(/'/g, "\\'");
    const slide = document.createElement('div');
    slide.className = 'fav-slide' + (i === 0 ? ' on' : '');
    slide.innerHTML = `
      <img src="${img}" alt="${name}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"/>
      <div class="fav-info">
        <span class="fav-name">${dishName(name)}</span>
        <div class="fav-row">
          <span class="fav-price">${fmt(f.item.p)}</span>
          <button class="fav-add" aria-label="Agregar a tu orden" onclick="addToCart('${nEsc}',${f.item.p},'','${cEsc}')">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4V3a1 1 0 011-1h8a1 1 0 011 1v1h3.2a1 1 0 01.99 1.14l-1.7 12A2 2 0 0117.5 19h-11a2 2 0 01-1.99-1.86l-1.7-12A1 1 0 013.8 4H7zm2 0h6V4H9zm-.5 5a1 1 0 10-2 0 5.5 5.5 0 0011 0 1 1 0 10-2 0 3.5 3.5 0 01-7 0z"/></svg>
            <span class="fav-tip">Agregar a tu orden</span>
          </button>
        </div>
      </div>`;
    track.appendChild(slide);
    const dot = document.createElement('button');
    dot.className = 'fav-dot' + (i === 0 ? ' on' : '');
    dot.setAttribute('aria-label', 'Ver ' + name);
    dot.onclick = () => favGo(i, true);
    dots.appendChild(dot);
  });
  favAuto();
  const car = document.getElementById('favCarousel');
  car.addEventListener('mouseenter', () => clearTimeout(favTimer));
  car.addEventListener('mouseleave', favAuto);

  // Deslizar con el dedo (móvil) para cambiar de foto, además de puntitos/botones
  let touchX = 0, touchY = 0, touchDX = 0, dragging = false;
  car.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchX = t.clientX; touchY = t.clientY; touchDX = 0; dragging = true;
  }, { passive: true });
  car.addEventListener('touchmove', (e) => {
    if(!dragging) return;
    const t = e.touches[0];
    touchDX = t.clientX - touchX;
    const dy = t.clientY - touchY;
    if(Math.abs(touchDX) > Math.abs(dy)) e.preventDefault();
  }, { passive: false });
  car.addEventListener('touchend', () => {
    if(!dragging) return;
    dragging = false;
    if(touchDX <= -40) favGo(favIdx + 1, true);
    else if(touchDX >= 40) favGo(favIdx - 1, true);
  });
}

function favGo(i, manual){
  const track = document.getElementById('favTrack');
  const n = track.children.length; if(!n) return;
  favIdx = ((i % n) + n) % n;
  [...track.children].forEach((s, k) => s.classList.toggle('on', k === favIdx));
  document.querySelectorAll('.fav-dot').forEach((d, k) => d.classList.toggle('on', k === favIdx));
  favAuto(); // re-arma el reloj: cada slide dura exactamente lo mismo desde que aparece
}

function favAuto(){
  clearTimeout(favTimer);
  favTimer = setTimeout(() => favGo(favIdx + 1), 4000);
}

buildFavCarousel();

// ── MENÚ MÓVIL (hamburguesa) ──────────────────────────────────────────────────
function toggleMobileMenu(){
  const m = document.getElementById('mobileMenu');
  if(!m) return;
  const open = m.classList.toggle('open');
  const burger = document.querySelector('.nav-burger');
  if(burger){ burger.classList.toggle('on', open); burger.setAttribute('aria-expanded', open); }
  document.body.style.overflow = open ? 'hidden' : '';
}
