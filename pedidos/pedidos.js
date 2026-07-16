// UMI Pedidos — app interna de compras (chefs y encargados)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDocs,
  onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzwcCVQ0xPeGZbpjYT3CLsxYMqof6KyCE",
  authDomain: "umi-clientes.firebaseapp.com",
  projectId: "umi-clientes",
  storageBucket: "umi-clientes.firebasestorage.app",
  messagingSenderId: "103545801738",
  appId: "1:103545801738:web:4079b9f8ae474516f9a3f3"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Usuarios y PIN por área (cambiar aquí si se necesita) ──────────────────
const USUARIOS = {
  '1111': { area: 'Chef Frío',      rol: 'pedidor' },
  '2222': { area: 'Chef Caliente',  rol: 'pedidor' },
  '3333': { area: 'Barra',          rol: 'pedidor' },
  '4444': { area: 'Administración', rol: 'pedidor' },
  '2505': { area: 'Compras',        rol: 'comprador' },
  '3008': { area: 'Administrador',  rol: 'admin' },   // ve lo mismo que Compras (costos incluidos)
};
// Compras y Administrador ven costos, proveedores y el panel de compras
const esComprador = () => usuario && (usuario.rol === 'comprador' || usuario.rol === 'admin');

const CATEGORIAS = [
  '🥑 Verduras y Frutas',
  '🐟 Pescados y Mariscos',
  '🥩 Carnes y Aves',
  '🍚 Abarrotes',
  '🍰 Pastelería',
  '🍸 Destilados y Licores',
  '🍺 Cervezas',
  '🍷 Vinos y Espumantes',
  '🥤 Bebidas y Aguas',
  '🧊 Coctelería e Insumos',
  '📦 Papelería y Envases',
  '🍳 Utensilios',
  '🧴 Limpieza',
];
const UNIDADES = ['kg','gr','un','caja','bandeja','saco','malla','atado','paquete','bolsa','rollo','frasco','galón','litro','botella','lata','barra','pote','pieza','par','ramo','porción'];

// Catálogo base: sacado de los pedidos reales del grupo de WhatsApp "Pedidos Umi"
// (oct 2025 - jul 2026). Se carga a Firestore la primera vez; después se edita desde la app.
const BASE = {
  '🥑 Verduras y Frutas': [
    ['Palta','kg'],['Limón sutil','caja'],['Limón de pica','caja'],['Nabo','un'],['Betarraga','un'],
    ['Lechuga morada','un'],['Lechuga verde','un'],['Pepinillo (kiuri)','un'],['Cebolla roja','kg'],
    ['Cebolla blanca','kg'],['Cebolla morada','malla'],['Cebolla perla','kg'],['Cebollín','atado'],
    ['Ciboulette','kg'],['Cilantro','kg'],['Perejil','kg'],['Espinaca','kg'],['Albahaca','kg'],
    ['Apio','un'],['Poro (puerro)','un'],['Brócoli','un'],['Repollo blanco','un'],['Repollo morado','un'],
    ['Mix de hojas','bandeja'],['Champiñones','kg'],['Zanahoria','kg'],['Tomate','kg'],
    ['Tomate cherry','kg'],['Pimentón rojo','un'],['Ají amarillo','kg'],['Ají limo','kg'],
    ['Ají panca','kg'],['Rocoto','kg'],['Jengibre','kg'],['Ajo','kg'],['Camote','kg'],['Papa','saco'],
    ['Choclo peruano','kg'],['Choclo amarillo','kg'],['Maíz cancha (chulpi)','kg'],['Espárragos','kg'],
    ['Zapallo','kg'],['Zapallo italiano','un'],['Rabanito','kg'],['Alcachofa','un'],
    ['Aceituna morada','kg'],['Huacatay','kg'],['Hierba luisa','kg'],['Plátano amarillo','un'],
    ['Fresas','bandeja'],['Arándanos','bandeja'],['Flores comestibles','bandeja'],
  ],
  '🐟 Pescados y Mariscos': [
    ['Salmón fresco','kg'],['Atún','pieza'],['Corvina','kg'],['Reineta','kg'],['Merluza','kg'],
    ['Palometa','kg'],['Camarón premium','kg'],['Camarón sea','caja'],['Camarón con piel','kg'],
    ['Camarón jumbo 16/20','kg'],['Langostino','kg'],['Pulpo','kg'],['Calamar','caja'],['Ostión','kg'],
    ['Machas','bandeja'],['Jaiba','kg'],['Pulpa de cangrejo','kg'],['Locos','pote'],['Almejas','un'],
  ],
  '🥩 Carnes y Aves': [
    ['Filete de lomo','caja'],['Lomo vetado','kg'],['Asado de tira','caja'],['Entraña','caja'],
    ['Carne molida','kg'],['Chuleta de cerdo','un'],['Panceta','kg'],['Manitas de cerdo','un'],
    ['Pechuga de pollo','caja'],['Trutro entero','caja'],['Encuentro de pollo','caja'],
    ['Hígado de pollo','kg'],['Hueso carnudo','kg'],
  ],
  '🍚 Abarrotes': [
    ['Arroz de sushi','kg'],['Arroz normal','malla'],['Alga nori','paquete'],['Alga kombu','paquete'],
    ['Panko blanco','saco'],['Harina','kg'],['Harina tempura','kg'],['Azúcar blanca','kg'],
    ['Sal','kg'],['Sal gruesa','kg'],['Sal de cáhuil','kg'],['Vinagre blanco','litro'],
    ['Vinagre tinto','galón'],['Vinagre de manzana','litro'],['Sillao Kiko','galón'],
    ['Soya oscura (dark soy)','un'],['Soya en balde Kikkoman','un'],['Ajinomoto','kg'],
    ['Hondashi','kg'],['Katsuobushi','gr'],['Togarashi','paquete'],['Furikake','kg'],
    ['Gari (jengibre encurtido)','un'],['Masa wantán','caja'],['Masa gyoza','caja'],['Masa philo','un'],
    ['Fideos udon','caja'],['Fideos ramen','caja'],['Fideos de arroz','paquete'],['Espagueti','kg'],
    ['Quinoa','kg'],['Chuño','kg'],['Lentejas','kg'],['Garbanzos','kg'],['Porotos negros','kg'],
    ['Arveja partida','kg'],['Huevos','caja'],['Sésamo blanco','kg'],['Sésamo negro','kg'],
    ['Mayonesa Kraft','un'],['Mayonesa Alacena','kg'],['Queso crema','caja'],['Queso mozzarella','barra'],
    ['Queso grana padano','gr'],['Queso parmesano','un'],['Mantequilla','caja'],['Mantequilla sin sal','kg'],
    ['Crema de leche','caja'],['Leche entera','caja'],['Leche evaporada','un'],['Leche condensada','un'],
    ['Leche en polvo','kg'],['Aceite vegetal','caja'],['Aceite de fritura','caja'],
    ['Aceite de sésamo','galón'],['Aceite de trufa','botella'],['Ketchup','kg'],['Mostaza','kg'],
    ['Salsa inglesa','un'],['Salsa de ostras','lata'],['Salsa tonkatsu','un'],['Sriracha','un'],
    ['Salsa española (demiglace)','un'],['Pasta de tomate','kg'],['Picante de ajos','frasco'],
    ['Miel','kg'],['Pimienta negra','gr'],['Comino','gr'],['Laurel','gr'],['Achiote','gr'],
    ['Choclo bebé','lata'],['Choclo dulce congelado','bolsa'],['Palmito','un'],
    ['Papa congelada (cuña)','caja'],['Edamame','caja'],['Alcaparras','frasco'],['Pan árabe','paquete'],
    ['Galleta soda','paquete'],['Levadura','kg'],['Frutos rojos congelados','caja'],
    ['Chicken powder','un'],['Colorantes vegetales','un'],['Vino blanco (cocina)','litro'],
    ['Vino tinto (cocina)','litro'],['Bidón de agua','un'],
  ],
  '🍰 Pastelería': [
    ['Harina de almendras','kg'],['Azúcar impalpable','kg'],['Galleta vainilla','paquete'],
    ['Galleta para cheesecake','paquete'],['Galleta de champaña','paquete'],['Cacao semiamargo','gr'],
    ['Canela en polvo','gr'],['Manjar','un'],['Mermelada de fresa','kg'],['Colapez','paquete'],
    ['Café','un'],['Tapioca perla','paquete'],
  ],
  '🍸 Destilados y Licores': [
    // Whisky
    ['Johnnie Walker Red','botella'],['Johnnie Walker Black','botella'],['Jack Daniels N7','botella'],
    ['Jack Daniels Apple','botella'],['Jack Daniels Honey','botella'],['Jack Daniels Fire','botella'],
    ['Jack Daniels Blackberry','botella'],['Buchanans','botella'],['Chivas 12','botella'],
    ['Old Parr 12','botella'],['Monkey Shoulder','botella'],['Glenfiddich 12','botella'],
    ['Woodford Reserve','botella'],['Jameson','botella'],
    // Gin
    ['Gin Beefeater','botella'],['Gin Beefeater Pink','botella'],['Gin Tanqueray','botella'],
    ['Gin Tanqueray Ten','botella'],['Gin Hendricks','botella'],['Gin Monkey 47','botella'],
    ['Gin Bombay','botella'],['Gin Bulldog','botella'],['Gin Mare','botella'],
    // Vodka
    ['Vodka Stolichnaya','botella'],['Vodka Absolut','botella'],['Vodka Grey Goose','botella'],
    ['Vodka Puklaro','botella'],
    // Ron y cachaça
    ['Bacardí Carta Blanca','botella'],['Havana Club blanco','botella'],['Havana 7','botella'],
    ['Malibú','botella'],['Cachaça 51','botella'],['Diplomático Reserva','botella'],
    // Tequila
    ['Tequila Herradura Ultra','botella'],['Tequila Olmeca','botella'],['Don Julio blanco','botella'],
    ['Don Julio reposado','botella'],
    // Pisco y destilados de uva
    ['Alto del Carmen 40','botella'],['Mistral Nobel','botella'],['Mistral Apple','botella'],
    ['Tololo Blue','botella'],['Tololo transparente 40','botella'],['Norterra 40','botella'],
    ['Pisco Waqar','botella'],['Viñas de Oro acholado','botella'],['El Gobernador','botella'],
    // Licores y aperitivos
    ['Aperol','botella'],['Campari','botella'],['Ramazzotti','botella'],['Cointreau','botella'],
    ['Triple sec','botella'],['St Germain','botella'],['Chambord','botella'],['Disaronno','botella'],
    ['Frangelico','botella'],['Kahlúa','botella'],['Baileys','botella'],['Drambuie','botella'],
    ['Fernet Branca','botella'],['Jägermeister 1,75 L','botella'],['Cinzano Rosso','botella'],
    ['Cinzano Bianco','botella'],['Vermouth 1757','botella'],['Martini Dry','botella'],
    ['Amargo de Angostura','botella'],
  ],
  '🍺 Cervezas': [
    ['Austral Lager','un'],['Austral Calafate','un'],['Kunstmann Torobayo','un'],
    ['Kunstmann Lager','un'],['Peroni','un'],['Peroni 0.0','un'],['Asahi','un'],['Heineken 0.0','un'],
  ],
  '🍷 Vinos y Espumantes': [
    ['TH Chardonnay Limarí','botella'],['TH Sauvignon Blanc Limarí','botella'],
    ['TH Syrah Limarí','botella'],['TH Carmenere Peumo','botella'],
    ['TH Cabernet Sauvignon Alto Maipo','botella'],['TH Pinot Noir Malleco','botella'],
    ['Tabalí Cabernet Sauvignon','botella'],['Tabalí Carmenere','botella'],
    ['Las Mulas Sauvignon Blanc','botella'],['Casa Marín Riesling','botella'],
    ['Espumante Undurraga Brut','botella'],['Riccadonna','botella'],['Vino sin alcohol','botella'],
  ],
  '🥤 Bebidas y Aguas': [
    ['Coca-Cola normal','un'],['Coca-Cola Zero','un'],['Pepsi','un'],['Pepsi Zero','un'],
    ['Sprite','un'],['Sprite Zero','un'],['Fanta','un'],['Kem Piña','un'],['Limón soda','un'],
    ['Canada Dry Ginger Ale','un'],['Ginger Ale Zero','un'],['Schweppes Tónica','un'],
    ['Schweppes Tónica Zero','un'],['Schweppes Tónica Pink','un'],['Fentimans Ginger Beer','un'],
    ['Fentimans Rose Lemonade','un'],['Fentimans Tonic Light','un'],['Fentimans Indian Tonic','un'],
    ['Red Bull tradicional','un'],['Red Bull sin azúcar','un'],['Red Bull maracuyá','un'],
    ['Agua Puyehue con gas','un'],['Agua Puyehue sin gas','un'],['Agua gasificada 1,5 L','un'],
  ],
  '🧊 Coctelería e Insumos': [
    ['Hielo cubo','kg'],['Hielo frappé','kg'],['Hielo premium','bolsa'],['Hielo bolita','paquete'],
    ['Pulpa de maracuyá sin pepas','caja'],['Pulpa de mango','caja'],['Pulpa de frambuesa','caja'],
    ['Moras congeladas','kg'],['Jugo cranberry','botella'],['Limón amarillo','malla'],
    ['Limón sutil suelto','kg'],['Naranja','kg'],['Pomelo','kg'],['Manzana verde','kg'],
    ['Piña','un'],['Guindas (cherry)','kg'],['Menta','kg'],['Pepino','un'],['Albúmina','kg'],
    ['Café Kimbo','kg'],['Té Earl Grey','caja'],['Té Twinings Breakfast','caja'],['Tabasco','un'],
    ['Tajín','un'],['Sal de mar','kg'],['Aceto balsámico','litro'],['Coco laminado','bolsa'],
    ['Lecitina de soya','gr'],['Goma xantana','gr'],['Metilcelulosa','gr'],['Ácido cítrico','bolsa'],
    ['Endulzante en gotas','un'],['Flores de decoración','ramo'],['Bombillas','paquete'],
  ],
  '📦 Papelería y Envases': [
    ['Bolsas de arranque','rollo'],['Bolsas al vacío 1 kg','paquete'],['Bolsas al vacío 2 kg','paquete'],
    ['Bolsas al vacío 150x300','paquete'],['Bolsas al vacío 200x300','paquete'],
    ['Bolsas de basura grandes','rollo'],['Bolsas de basura medianas','rollo'],['Papel film','un'],
    ['Papel aluminio','rollo'],['Papel mantequilla','rollo'],['Willpall','rollo'],
    ['Papel toalla Nova','paquete'],['Guantes talla S','caja'],['Guantes talla M','caja'],
    ['Guantes talla L','caja'],['Cofias blancas','caja'],['Tocas blancas','paquete'],
    ['Cubre calzado','paquete'],['Pechera / mandil','un'],['Palitos de sushi','caja'],
    ['Palos de brocheta','paquete'],['Pinchos de bambú','paquete'],['Taper (indicar litros)','un'],
    ['Mamilas','un'],['Cambro','un'],['Cinta para rotular','un'],['Plumones / marcadores','un'],
    ['Pilas AAA','par'],['Encendedores','un'],['Gas para soplete','un'],['Mangas pasteleras','paquete'],
  ],
  '🍳 Utensilios': [
    ['Espátula de goma','un'],['Espátula de acero (emplatar)','un'],['Colador','un'],
    ['Exprimidor de limón','un'],['Pelador','un'],['Batidor','un'],['Temporizador','un'],
    ['Gramera','un'],['Tabla blanca','un'],['Escobilla de fierro (parrilla)','un'],
    ['Abridor de latas','un'],['Rallador','un'],['Condimentero','un'],
    ['Barra magnética cuchillos','un'],['Moldes para postres','un'],
  ],
  '🧴 Limpieza': [
    ['Lavalozas','un'],['Cloro','galón'],['Desengrasante','un'],['Limpia pisos','un'],
    ['Limpia vidrios','un'],['Cif crema','un'],['Esponjas amarillas','un'],['Esponjas de colores','un'],
    ['Virutilla (esponja de fierro)','un'],['Paños microfibra','un'],['Trapeadores','un'],
    ['Escoba','un'],['Recogedor','un'],['Jalador de piso','un'],['Alcohol líquido','litro'],
    ['Atomizador','un'],
  ],
};
const CATALOGO_BASE = [];
Object.entries(BASE).forEach(([categoria, prods]) =>
  prods.forEach(([nombre, unidad]) => CATALOGO_BASE.push({ nombre, unidad, categoria })));

// ── Estado ──────────────────────────────────────────────────────────────────
let usuario  = null;   // { area, rol }
let catalogo = [];     // productos de Firestore
let pedidos  = [];     // pedidos de los últimos 14 días (en vivo)
let carrito  = {};     // key -> { nombre, categoria, cantidad, unidad }
let inventarios = {};  // slug(area) -> { area, items: { key: {nombre, unidad, cantidad, f} } }
let registro = [];     // log de movimientos (solo lo carga el admin)
let tabActiva = '';
let seedIntentado = false;

// Registro de auditoría: cada movimiento queda escrito (no se puede borrar desde la app)
function log(accion, detalle){
  addDoc(collection(db, 'pedidosLog'), {
    ts: serverTimestamp(), area: usuario ? usuario.area : '?', accion, detalle
  }).catch(e => console.warn('[PEDIDOS] log:', e));
}

const AREAS_INVENTARIO = ['Chef Frío', 'Chef Caliente', 'Barra', 'Administración'];

const $ = (id) => document.getElementById(id);
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const keyDe = (nombre, unidad) => slug(nombre) + '|' + unidad;

function hoyStr(d = new Date()){
  const p = (n) => String(n).padStart(2,'0');
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
}
function etiquetaDia(diaStr){
  const hoy = hoyStr();
  const ayer = hoyStr(new Date(Date.now() - 864e5));
  if (diaStr === hoy)  return 'Hoy';
  if (diaStr === ayer) return 'Ayer';
  const [y,m,d] = diaStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
}
function fmtCant(n){ return Number.isInteger(n) ? String(n) : String(n).replace('.', ','); }
const fmtCLP = (n) => '$' + Math.round(n).toLocaleString('es-CL');
// Categorías fijas + cualquier otra que venga en los datos (por si se agregan después)
function categoriasCon(lista){
  const extras = new Set(lista.filter(c => c && !CATEGORIAS.includes(c)));
  return CATEGORIAS.concat([...extras]);
}
function esc(s){ const d = document.createElement('div'); d.textContent = s; return d.innerHTML.replace(/"/g,'&quot;'); }

let toastTimer = null;
function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2200);
}

// ── Sesión ──────────────────────────────────────────────────────────────────
function intentarLogin(pin){
  const u = USUARIOS[pin];
  if (!u) { $('pinErr').textContent = 'PIN incorrecto'; $('pinInput').value = ''; return; }
  localStorage.setItem('umiPedidosPin', pin);
  entrar(u);
}
function entrar(u){
  usuario = u;
  $('gate').style.display = 'none';
  $('app').style.display = 'block';
  $('tbArea').textContent = u.area;
  $('tbFecha').textContent = new Date().toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
  carrito = JSON.parse(localStorage.getItem('umiCarrito_' + u.area) || '{}');
  montarTabs();
  conectarFirestore();
}
$('pinBtn').addEventListener('click', () => intentarLogin($('pinInput').value.trim()));
$('pinInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarLogin($('pinInput').value.trim()); });
$('btnSalir').addEventListener('click', () => {
  localStorage.removeItem('umiPedidosPin');
  location.reload();
});

// ── Tabs ────────────────────────────────────────────────────────────────────
function montarTabs(){
  let defs;
  if (usuario.rol === 'admin')
    defs = [ ['compras','🛒 Compras'], ['inventario','📦 Inventario'], ['catalogo','📋 Catálogo'], ['registro','📜 Registro'], ['clientes','👥 Clientes'] ];
  else if (usuario.rol === 'comprador')
    defs = [ ['compras','🛒 Por comprar'], ['inventario','📦 Inventario'], ['catalogo','📋 Catálogo'] ];
  else
    defs = [ ['pedir','📝 Pedir'], ['enviados','📤 Enviados'], ['inventario','📦 Inventario'] ];
  $('tabs').innerHTML = defs.map(([id, txt]) =>
    `<button class="tab" data-tab="${id}" id="tab-${id}">${txt}</button>`).join('');
  defs.forEach(([id]) => $('tab-' + id).addEventListener('click', () => activarTab(id)));
  activarTab(defs[0][0]);
}
function activarTab(id){
  tabActiva = id;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('activa', t.dataset.tab === id));
  const vistas = { pedir:'vistaPedir', enviados:'vistaEnviados', compras:'vistaCompras', catalogo:'vistaCatalogo', inventario:'vistaInventario', registro:'vistaRegistro', clientes:'vistaClientes' };
  Object.entries(vistas).forEach(([k, vid]) => $(vid).style.display = (k === id) ? 'block' : 'none');
  $('carritoBar').style.display = 'none';
  renderTodo();
}

// ── Firestore en vivo ───────────────────────────────────────────────────────
function conectarFirestore(){
  onSnapshot(collection(db, 'pedidosCatalogo'), (snap) => {
    catalogo = snap.docs.map(d => Object.assign({ _id: d.id }, d.data()))
      .filter(p => p.activo !== false)
      .sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (!snap.size && !seedIntentado) { seedIntentado = true; cargarCatalogoBase(); }
    renderTodo();
  }, (e) => console.error('[PEDIDOS] catálogo:', e));

  const corte = hoyStr(new Date(Date.now() - 13 * 864e5));
  onSnapshot(query(collection(db, 'pedidosCompras'), where('dia', '>=', corte)), (snap) => {
    pedidos = snap.docs.map(d => Object.assign({ _id: d.id }, d.data()));
    pedidos.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderTodo();
  }, (e) => console.error('[PEDIDOS] pedidos:', e));

  onSnapshot(collection(db, 'pedidosInventario'), (snap) => {
    inventarios = {};
    snap.docs.forEach(d => { inventarios[d.id] = d.data(); });
    renderTodo();
  }, (e) => console.error('[PEDIDOS] inventario:', e));

  // El registro de movimientos solo lo carga el administrador
  if (usuario.rol === 'admin'){
    onSnapshot(query(collection(db, 'pedidosLog'), orderBy('ts', 'desc'), limit(300)), (snap) => {
      registro = snap.docs.map(d => d.data());
      renderTodo();
    }, (e) => console.error('[PEDIDOS] log:', e));
  }
}

async function cargarCatalogoBase(){
  try {
    const batch = writeBatch(db);
    CATALOGO_BASE.forEach(p => {
      batch.set(doc(db, 'pedidosCatalogo', slug(p.nombre)), {
        nombre: p.nombre, categoria: p.categoria, unidad: p.unidad, activo: true
      });
    });
    await batch.commit();
    console.log('[PEDIDOS] catálogo base cargado');
  } catch(e){ console.error('[PEDIDOS] seed:', e); }
}

function renderTodo(){
  if (!usuario) return;
  if (tabActiva === 'pedir')    { renderCatalogo(); renderCarritoBar(); }
  if (tabActiva === 'enviados')   renderEnviados();
  if (tabActiva === 'compras')    renderCompras();
  if (tabActiva === 'catalogo')   renderCatalogoAdmin();
  if (tabActiva === 'inventario') renderInventario();
  if (tabActiva === 'registro')   renderRegistro();
  if (tabActiva === 'clientes')   renderClientes();
  renderBadges();
}

// ── Vista PEDIR ─────────────────────────────────────────────────────────────
let catSeleccionada = null;

function renderCatalogo(){
  // Se busca sin acentos (slug), para que "camaron" encuentre "Camarón"
  const filtro = slug($('buscador').value || '');
  const cont = $('listaCatalogo');

  // Sin búsqueda ni categoría elegida: menú de categorías
  if (!filtro && !catSeleccionada){
    const tarjetas = categoriasCon(catalogo.map(p => p.categoria)).map(cat => {
      const n = catalogo.filter(p => p.categoria === cat).length;
      if (!n) return '';
      const enCarro = Object.values(carrito).filter(i => i.categoria === cat).length;
      const partes = cat.split(' ');
      const emoji = partes.shift();
      return `<button class="cat-card" data-cat="${esc(cat)}">
        <span class="emoji">${emoji}</span>
        <span>${esc(partes.join(' '))}</span>
        <span class="cuenta">${n} productos</span>
        ${enCarro ? `<span class="encarro">${enCarro}</span>` : ''}
      </button>`;
    }).join('');
    cont.innerHTML = `<div class="cat-grid">${tarjetas}</div>`;
    cont.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
      catSeleccionada = b.dataset.cat;
      renderCatalogo();
      window.scrollTo({ top: 0 });
    }));
    return;
  }

  // Con búsqueda: se busca en TODAS las categorías; con categoría elegida: solo esa
  const catsAMostrar = filtro ? categoriasCon(catalogo.map(p => p.categoria)) : [catSeleccionada];
  let html = filtro ? '' : `<button class="cat-volver" id="btnVolverCats">‹ Todas las categorías</button>`;
  catsAMostrar.forEach(cat => {
    const prods = catalogo.filter(p => p.categoria === cat &&
      (!filtro || slug(p.nombre).includes(filtro)));
    if (!prods.length) return;
    html += `<div class="cat-titulo">${esc(cat)}</div>`;
    prods.forEach(p => {
      const k = keyDe(p.nombre, p.unidad);
      const enCarro = carrito[k];
      html += `<div class="prod ${enCarro ? 'en-carro' : ''}" data-key="${k}">
        <div class="prod-nombre">${esc(p.nombre)} <span class="prod-unidad">(${esc(p.unidad)})</span></div>
        ${enCarro
          ? `<div class="stepper">
               <button data-menos="${k}">−</button>
               <input type="number" inputmode="decimal" step="0.5" min="0" value="${enCarro.cantidad}" data-cant="${k}">
               <button data-mas="${k}">＋</button>
             </div>`
          : `<button class="prod-add" data-add="${k}" data-n="${esc(p.nombre)}" data-c="${esc(p.categoria)}" data-u="${esc(p.unidad)}">＋</button>`}
      </div>`;
    });
  });
  cont.innerHTML = html || '<div class="vacio">No hay productos que coincidan.</div>';

  const volver = $('btnVolverCats');
  if (volver) volver.addEventListener('click', () => { catSeleccionada = null; renderCatalogo(); });
  cont.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    carrito[b.dataset.add] = { nombre: b.dataset.n, categoria: b.dataset.c, unidad: b.dataset.u, cantidad: 1 };
    guardarCarrito(); renderCatalogo(); renderCarritoBar();
  }));
  cont.querySelectorAll('[data-mas]').forEach(b => b.addEventListener('click', () => cambiarCant(b.dataset.mas, +1)));
  cont.querySelectorAll('[data-menos]').forEach(b => b.addEventListener('click', () => cambiarCant(b.dataset.menos, -1)));
  cont.querySelectorAll('[data-cant]').forEach(inp => inp.addEventListener('change', () => {
    const v = parseFloat(inp.value);
    if (!v || v <= 0) delete carrito[inp.dataset.cant];
    else carrito[inp.dataset.cant].cantidad = v;
    guardarCarrito(); renderCatalogo(); renderCarritoBar();
  }));
}
function cambiarCant(k, delta){
  if (!carrito[k]) return;
  const nueva = Math.round((carrito[k].cantidad + delta) * 100) / 100;
  if (nueva <= 0) delete carrito[k];
  else carrito[k].cantidad = nueva;
  guardarCarrito(); renderCatalogo(); renderCarritoBar();
}
function guardarCarrito(){ localStorage.setItem('umiCarrito_' + usuario.area, JSON.stringify(carrito)); }

$('buscador').addEventListener('input', renderCatalogo);
$('buscadorCompras').addEventListener('input', renderCompras);
$('buscadorCatalogo').addEventListener('input', renderCatalogoAdmin);
$('buscadorInv').addEventListener('input', () => renderInventario());
$('buscadorReg').addEventListener('input', () => renderRegistro());
$('buscadorClientes').addEventListener('input', pintarClientes);

// ══════════ CLIENTES (solo admin, con login real de Google) ══════════
// Las reglas de Firestore ya permiten que 'adnanrisache@gmail.com' lea toda la
// colección 'clientes'. El PIN no basta (no autentica), por eso aquí usamos Auth.
const gauth = getAuth(app);
const gprov = new GoogleAuthProvider();
const ADMIN_EMAILS = ['adnanrisache@gmail.com'];
let adminUser = null;
let clientesCache = null;
onAuthStateChanged(gauth, (u) => { adminUser = u; if (tabActiva === 'clientes') renderClientes(); });

window.__signInAdmin  = () => signInWithPopup(gauth, gprov).catch(e => { toast('No se pudo iniciar sesión'); console.error('[CLIENTES] signin', e); });
window.__signOutAdmin = () => signOut(gauth);
window.__recargarClientes = async () => { clientesCache = null; await renderClientes(); };

async function loadClientes(){
  const snap = await getDocs(collection(db, 'clientes'));
  clientesCache = snap.docs.map(d => Object.assign({ _id: d.id }, d.data()));
  clientesCache.sort((a,b) => (b.points||0) - (a.points||0));
}

async function renderClientes(){
  const authBox = $('clientesAuth'), buscarWrap = $('clientesBuscarWrap'),
        resumen = $('clientesResumen'), lista = $('listaClientes');
  const isAdmin = adminUser && ADMIN_EMAILS.includes((adminUser.email||'').toLowerCase());
  if (!adminUser){
    buscarWrap.style.display='none'; resumen.innerHTML=''; lista.innerHTML='';
    authBox.innerHTML = `<div class="clientes-login"><p>Para ver los clientes registrados, inicia sesión con tu cuenta de <b>administrador</b> (Google).</p><button class="btn-primary" onclick="__signInAdmin()">Iniciar sesión con Google</button></div>`;
    return;
  }
  if (!isAdmin){
    buscarWrap.style.display='none'; resumen.innerHTML=''; lista.innerHTML='';
    authBox.innerHTML = `<div class="clientes-login"><p>La cuenta <b>${esc(adminUser.email)}</b> no tiene permisos de administrador.</p><button class="btn-sec" onclick="__signOutAdmin()">Cerrar sesión</button></div>`;
    return;
  }
  authBox.innerHTML = `<div class="clientes-adminbar">👤 <b>${esc(adminUser.email)}</b> · <button class="link-btn" onclick="__recargarClientes()">recargar</button> · <button class="link-btn" onclick="__signOutAdmin()">salir</button></div>`;
  if (!clientesCache){
    lista.innerHTML = '<div class="vacio">Cargando clientes…</div>';
    try { await loadClientes(); }
    catch(e){ console.error('[CLIENTES] load', e); lista.innerHTML = '<div class="vacio">No se pudieron cargar los clientes.<br>Verifica que iniciaste sesión con la cuenta de administrador.</div>'; return; }
  }
  buscarWrap.style.display='block';
  pintarClientes();
}

function pintarClientes(){
  if (!clientesCache) return;
  const resumen = $('clientesResumen'), lista = $('listaClientes');
  const norm = s => (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const q = norm($('buscadorClientes').value);
  const arr = clientesCache.filter(c => !q || norm(c.name).includes(q) || norm(c.email).includes(q) || norm(c.whatsapp).includes(q));
  const promos = clientesCache.filter(c => c.acceptsPromos).length;
  const conPedidos = clientesCache.filter(c => (c.numCompras||0) > 0).length;
  resumen.innerHTML = `<b>${clientesCache.length}</b> clientes registrados${q?` · ${arr.length} en la búsqueda`:''} · ${promos} aceptan promos · ${conPedidos} con pedidos registrados`;
  if (!arr.length){ lista.innerHTML = '<div class="vacio">Sin resultados.</div>'; return; }
  lista.innerHTML = arr.map(c => {
    const nc = c.numCompras || 0;
    const compraTxt = nc>0 ? `🛒 ${nc} pedido${nc>1?'s':''}` : '🕐 sin pedidos registrados aún';
    const wa = (c.whatsapp||'').replace(/\D/g,'');
    return `<div class="cliente-card">
      <div class="cli-top"><span class="cli-nombre">${esc(c.name||'(sin nombre)')}</span><span class="cli-pts">★ ${(c.points||0).toLocaleString('es-CL')}</span></div>
      <div class="cli-row"><a href="mailto:${esc(c.email||'')}">${esc(c.email||'')}</a></div>
      <div class="cli-row">📱 <a href="https://wa.me/${wa}" target="_blank">${esc(c.whatsapp||'')}</a>${c.acceptsPromos?' · ✅ promos':''}${c.birthday?` · 🎂 ${esc(c.birthday)}`:''}</div>
      <div class="cli-row cli-meta">${compraTxt}${c.totalGastado?` · $${Number(c.totalGastado).toLocaleString('es-CL')} gastado`:''}${c.ultimaCompra?` · última: ${esc(fmtFechaCli(c.ultimaCompra))}`:''}</div>
      <button class="link-btn cli-vp" onclick="__verPedidos('${c._id}')">ver pedidos ▾</button>
      <div class="cli-pedidos" id="ped_${c._id}" style="display:none"></div>
    </div>`;
  }).join('');
}
function fmtFechaCli(ts){ try{ const d = ts && ts.seconds ? new Date(ts.seconds*1000) : new Date(ts); return d.toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ''; } }

// Detalle de pedidos de un cliente (subcolección clientes/{uid}/pedidos).
// Requiere publicar la regla de lectura del subcolección; si no está, avisa.
window.__verPedidos = async function(uid){
  const box = document.getElementById('ped_' + uid);
  if (!box) return;
  if (box.style.display === 'block'){ box.style.display = 'none'; return; }
  box.style.display = 'block';
  if (box.dataset.loaded === '1') return;
  box.innerHTML = '<div class="ped-vacio">Cargando pedidos…</div>';
  try {
    const snap = await getDocs(query(collection(db, 'clientes', uid, 'pedidos'), orderBy('createdAt', 'desc')));
    if (snap.empty){
      box.innerHTML = '<div class="ped-vacio">Sin pedidos guardados todavía. El historial se registra desde ahora (los pedidos anteriores están solo en Spleat).</div>';
      box.dataset.loaded = '1'; return;
    }
    box.innerHTML = snap.docs.map(d => { const o = d.data();
      const items = (o.items||[]).map(i => `${esc(i.n)} x${i.qty}`).join(', ');
      return `<div class="ped-item"><span class="ped-head"><b>${esc(fmtFechaCli(o.createdAt))}</b> · $${Number(o.total||0).toLocaleString('es-CL')}${o.entrega?` · ${esc(o.entrega)}`:''}</span><br><span class="ped-items">${items}</span></div>`;
    }).join('');
    box.dataset.loaded = '1';
  } catch(e){
    console.error('[CLIENTES] pedidos', e);
    box.innerHTML = '<div class="ped-vacio">No se pudo cargar el detalle. Falta publicar la regla de <code>clientes/{uid}/pedidos</code> en Firestore (te paso el texto).</div>';
  }
};

function renderCarritoBar(){
  const items = Object.values(carrito);
  const bar = $('carritoBar');
  if (tabActiva !== 'pedir' || !items.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  $('cbInfo').textContent = items.length + (items.length === 1 ? ' producto' : ' productos');
}

// Enviar pedido
$('btnEnviar').addEventListener('click', () => {
  const items = Object.values(carrito);
  if (!items.length) return;
  $('resumenPedido').innerHTML = items.map(i => {
    const k = keyDe(i.nombre, i.unidad);
    return `<div class="pedido-item"><span class="cant">${fmtCant(i.cantidad)} ${esc(i.unidad)}</span><span class="nombre">${esc(i.nombre)}</span></div>
      <input class="obs-input" data-obs="${k}" value="${esc(i.nota || '')}" placeholder="Observación (opcional), ej: 2 ramos, bien maduras…" autocomplete="off">`;
  }).join('');
  // La observación se guarda en el carrito al escribirla (sobrevive si cierran el modal)
  $('resumenPedido').querySelectorAll('[data-obs]').forEach(inp => inp.addEventListener('input', () => {
    if (carrito[inp.dataset.obs]) { carrito[inp.dataset.obs].nota = inp.value.trim(); guardarCarrito(); }
  }));
  $('notaPedido').value = '';
  abrirModal('modalEnviar');
});
$('btnConfirmarEnvio').addEventListener('click', async () => {
  const items = Object.values(carrito);
  if (!items.length) return;
  const btn = $('btnConfirmarEnvio'); btn.disabled = true;
  try {
    await addDoc(collection(db, 'pedidosCompras'), {
      dia: hoyStr(),
      area: usuario.area,
      nota: $('notaPedido').value.trim(),
      createdAt: serverTimestamp(),
      items: items.map(i => ({ nombre: i.nombre, categoria: i.categoria, cantidad: i.cantidad, unidad: i.unidad, nota: i.nota || '', comprado: false })),
    });
    carrito = {}; guardarCarrito();
    log('pedido', 'envió pedido con ' + items.length + ' producto' + (items.length === 1 ? '' : 's') + ': ' + items.map(i => i.nombre).join(', ').slice(0, 200));
    cerrarModales();
    toast('✓ Pedido enviado');
    activarTab('enviados');
  } catch(e){
    console.error('[PEDIDOS] enviar:', e);
    toast('Error al enviar, intenta de nuevo');
  } finally { btn.disabled = false; }
});

// ── Vista ENVIADOS (pedidor) ────────────────────────────────────────────────
function renderEnviados(){
  const mios = pedidos.filter(p => p.area === usuario.area);
  const cont = $('listaEnviados');
  if (!mios.length) { cont.innerHTML = '<div class="vacio">Aún no has enviado pedidos.<br>Arma tu pedido en la pestaña 📝 Pedir.</div>'; return; }
  const porDia = agruparPorDia(mios);
  cont.innerHTML = Object.keys(porDia).sort().reverse().map(dia =>
    `<div class="dia-bloque">
       <div class="dia-head"><span>${esc(etiquetaDia(dia))}</span></div>
       ${porDia[dia].map(p => cardPedido(p, dia === hoyStr())).join('')}
     </div>`
  ).join('');
  cont.querySelectorAll('[data-borrar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este pedido?')) return;
    try {
      await deleteDoc(doc(db, 'pedidosCompras', b.dataset.borrar));
      log('pedido', 'eliminó su pedido del día');
      toast('Pedido eliminado');
    }
    catch(e){ console.error(e); toast('No se pudo eliminar'); }
  }));
  cont.querySelectorAll('[data-recibir]').forEach(b => b.addEventListener('click', () => {
    const [id, idx] = b.dataset.recibir.split('|');
    marcarRecibido(id, parseInt(idx, 10));
  }));
}
async function marcarRecibido(pedidoId, idx){
  const p = pedidos.find(x => x._id === pedidoId);
  if (!p) return;
  const nuevo = !p.items[idx].recibido;
  const items = p.items.map((it, i) => i === idx ? Object.assign({}, it, { recibido: nuevo }) : it);
  try {
    await updateDoc(doc(db, 'pedidosCompras', pedidoId), { items });
    log('recepcion', (nuevo ? 'marcó recibido' : 'desmarcó recibido') + ' "' + p.items[idx].nombre + '"');
  }
  catch(e){ console.error('[PEDIDOS] recibir:', e); toast('No se pudo guardar'); }
}
function cardPedido(p, esHoy){
  const hora = p.createdAt?.seconds
    ? new Date(p.createdAt.seconds * 1000).toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }) : '';
  const nadaComprado = p.items.every(i => !i.comprado);
  return `<div class="pedido-card">
    <div class="pedido-head"><span class="pedido-area">${esc(p.area)}</span><span class="pedido-hora">${hora}</span></div>
    ${p.nota ? `<div class="pedido-nota">“${esc(p.nota)}”</div>` : ''}
    ${p.items.map((i, idx) =>
      `<div class="pedido-item ${i.comprado ? 'comprado' : ''}">
         <span class="cant">${fmtCant(i.cantidad)} ${esc(i.unidad)}</span>
         <span class="nombre">${esc(i.nombre)}</span>
         ${i.nota ? `<span class="obs">· ${esc(i.nota)}</span>` : ''}
         ${i.comprado ? `<button class="btn-recibir ${i.recibido ? 'ok' : ''}" data-recibir="${p._id}|${idx}" title="Marcar como recibido en el local">${i.recibido ? '📦 recibido' : '📦 ¿llegó?'}</button>` : ''}
       </div>`).join('')}
    ${esHoy && nadaComprado ? `<button class="pedido-borrar" data-borrar="${p._id}">Eliminar pedido</button>` : ''}
  </div>`;
}

// ── Vista COMPRAS (comprador) ───────────────────────────────────────────────
function agruparPorDia(lista){
  const g = {};
  lista.forEach(p => { (g[p.dia] = g[p.dia] || []).push(p); });
  return g;
}
function consolidarDia(pedidosDia){
  // Junta ítems iguales (mismo producto + unidad) de todas las áreas
  const map = {};
  pedidosDia.forEach(p => {
    p.items.forEach((it, idx) => {
      const k = keyDe(it.nombre, it.unidad);
      if (!map[k]) map[k] = { nombre: it.nombre, categoria: it.categoria, unidad: it.unidad, total: 0, fuentes: [], comprado: true };
      map[k].total = Math.round((map[k].total + it.cantidad) * 100) / 100;
      map[k].fuentes.push({ area: p.area, cantidad: it.cantidad, nota: it.nota || '', recibido: !!it.recibido });
      if (!it.comprado) map[k].comprado = false;
    });
  });
  return map;
}
function renderCompras(){
  const cont = $('listaCompras');
  if (!pedidos.length) { cont.innerHTML = '<div class="vacio">No hay pedidos todavía.<br>Cuando cocina, sushi o barra envíen su pedido, aparecerá aquí.</div>'; return; }
  const filtro = slug($('buscadorCompras').value || '');
  // Costo y proveedor vienen del catálogo (solo Compras y Administrador ven esta vista)
  const infoProd = {};
  catalogo.forEach(p => { infoProd[slug(p.nombre)] = p; });
  const porDia = agruparPorDia(pedidos);
  cont.innerHTML = Object.keys(porDia).sort().reverse().map(dia => {
    const cons = consolidarDia(porDia[dia]);
    const items = Object.entries(cons);
    const visibles = items.filter(([,v]) => !filtro || slug(v.nombre).includes(filtro));
    if (filtro && !visibles.length) return '';
    const listos = items.filter(([,v]) => v.comprado).length;
    const completo = listos === items.length;
    let totalDia = 0, sinCosto = 0;
    items.forEach(([k, v]) => {
      const prod = infoProd[k.split('|')[0]];
      if (prod && prod.costo) totalDia += prod.costo * v.total; else sinCosto++;
    });
    const notas = filtro ? '' : porDia[dia].filter(p => p.nota)
      .map(p => `<div class="pedido-nota">📌 ${esc(p.area)}: “${esc(p.nota)}”</div>`).join('');
    let cuerpo = '';
    categoriasCon(visibles.map(([,v]) => v.categoria)).forEach(cat => {
      const deCat = visibles.filter(([,v]) => v.categoria === cat);
      if (!deCat.length) return;
      cuerpo += `<div class="cat-titulo">${esc(cat)}</div>`;
      deCat.forEach(([k, v]) => {
        const detalle = v.fuentes.length > 1
          ? v.fuentes.map(f => `${esc(f.area)} ${fmtCant(f.cantidad)}${f.nota ? ' («' + esc(f.nota) + '»)' : ''}${f.recibido ? ' 📦' : ''}`).join(' + ')
          : esc(v.fuentes[0].area) + (v.fuentes[0].nota ? ' · «' + esc(v.fuentes[0].nota) + '»' : '') + (v.fuentes[0].recibido ? ' 📦' : '');
        const prod = infoProd[k.split('|')[0]];
        const costoLinea = prod && (prod.costo || prod.proveedor)
          ? `<div class="comp-costo">${prod.costo ? fmtCLP(prod.costo) + ' /' + esc(prod.unidad) + (prod.costo ? ' · ' + fmtCLP(prod.costo * v.total) : '') : ''}${prod.costo && prod.proveedor ? ' · ' : ''}${prod.proveedor ? '🏪 ' + esc(prod.proveedor) : ''}</div>`
          : '';
        cuerpo += `<div class="comp-item ${v.comprado ? 'comprado' : ''}">
          <input type="checkbox" class="comp-check" data-dia="${dia}" data-key="${k}" ${v.comprado ? 'checked' : ''}>
          <div class="comp-info">
            <span class="comp-nombre">${esc(v.nombre)}</span> · <span class="comp-total">${fmtCant(v.total)} ${esc(v.unidad)}</span>
            <div class="comp-detalle">${detalle}</div>
            ${costoLinea}
          </div>
          <button class="comp-borrar" data-bdia="${dia}" data-bkey="${k}" data-bnombre="${esc(v.nombre)}" title="Eliminar de los pedidos">🗑</button>
        </div>`;
      });
    });
    return `<div class="dia-bloque">
      <div class="dia-head">
        <span>${esc(etiquetaDia(dia))}</span>
        <span class="estado ${completo ? 'completo' : 'pendiente'}">${completo ? '✓ Todo comprado' : listos + '/' + items.length + ' comprados'}</span>
      </div>
      <div class="progreso"><div style="width:${items.length ? Math.round(listos/items.length*100) : 0}%"></div></div>
      ${totalDia ? `<div class="dia-total">💰 Compra estimada: ${fmtCLP(totalDia)}${sinCosto ? ' <span class="sin">(' + sinCosto + ' sin costo)</span>' : ''}</div>` : ''}
      ${notas}${cuerpo}
    </div>`;
  }).join('');

  cont.querySelectorAll('.comp-check').forEach(ch => ch.addEventListener('change', () =>
    marcarComprado(ch.dataset.dia, ch.dataset.key, ch.checked)));
  cont.querySelectorAll('.comp-borrar').forEach(b => b.addEventListener('click', () => {
    if (!confirm('¿Eliminar "' + b.dataset.bnombre + '" de los pedidos de ese día?')) return;
    eliminarItem(b.dataset.bdia, b.dataset.bkey);
    log('compras', 'eliminó "' + b.dataset.bnombre + '" de los pedidos del ' + b.dataset.bdia);
  }));
}
async function eliminarItem(dia, key){
  try {
    const batch = writeBatch(db);
    pedidos.filter(p => p.dia === dia).forEach(p => {
      if (!p.items.some(it => keyDe(it.nombre, it.unidad) === key)) return;
      const items = p.items.filter(it => keyDe(it.nombre, it.unidad) !== key);
      if (items.length) batch.update(doc(db, 'pedidosCompras', p._id), { items });
      else batch.delete(doc(db, 'pedidosCompras', p._id));
    });
    await batch.commit();
    toast('Producto eliminado');
  } catch(e){ console.error('[PEDIDOS] eliminar:', e); toast('No se pudo eliminar'); }
}
async function marcarComprado(dia, key, comprado){
  try {
    const batch = writeBatch(db);
    pedidos.filter(p => p.dia === dia).forEach(p => {
      if (!p.items.some(it => keyDe(it.nombre, it.unidad) === key)) return;
      const items = p.items.map(it => keyDe(it.nombre, it.unidad) === key ? Object.assign({}, it, { comprado }) : it);
      batch.update(doc(db, 'pedidosCompras', p._id), { items });
    });
    await batch.commit();
  } catch(e){ console.error('[PEDIDOS] marcar:', e); toast('No se pudo guardar'); }
}

// ── Vista CATÁLOGO (comprador) ──────────────────────────────────────────────
let soloSinCosto = false;
$('btnSinCosto').addEventListener('click', () => {
  soloSinCosto = !soloSinCosto;
  renderCatalogoAdmin();
});

function renderCatalogoAdmin(){
  const cont = $('listaCatalogoAdmin');
  const filtro = slug($('buscadorCatalogo').value || '');
  // Checklist: contador en vivo de productos sin costo o sin proveedor
  const faltantes = catalogo.filter(p => !p.costo || !p.proveedor).length;
  const btnF = $('btnSinCosto');
  btnF.textContent = soloSinCosto
    ? '✓ Mostrando solo sin costo (' + faltantes + ') — tocar para ver todo'
    : '⚠️ Solo sin costo (' + faltantes + ')';
  btnF.classList.toggle('activo', soloSinCosto);
  let html = '';
  categoriasCon(catalogo.map(p => p.categoria)).forEach(cat => {
    const prods = catalogo.filter(p => p.categoria === cat &&
      (!filtro || slug(p.nombre).includes(filtro)) &&
      (!soloSinCosto || !p.costo || !p.proveedor));
    if (!prods.length) return;
    html += `<div class="cat-titulo">${esc(cat)}</div>`;
    prods.forEach(p => {
      const costoTxt = p.costo || p.proveedor
        ? `${p.costo ? fmtCLP(p.costo) + ' /' + esc(p.unidad) : ''}${p.costo && p.proveedor ? ' · ' : ''}${p.proveedor ? '🏪 ' + esc(p.proveedor) : ''}`
        : '<span class="sin">sin costo ni proveedor</span>';
      html += `<div class="cata-item">
        <div class="cata-info">
          <span>${esc(p.nombre)} <span class="u">(${esc(p.unidad)})</span></span>
          <div class="cata-costo">${costoTxt}</div>
        </div>
        <button class="cata-editar" data-editar="${p._id}" title="Editar costo y proveedor">✏️</button>
        <button class="cata-quitar" data-quitar="${p._id}" title="Quitar del catálogo">🗑</button>
      </div>`;
    });
  });
  cont.innerHTML = html || '<div class="vacio">Catálogo vacío.</div>';
  cont.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('¿Quitar este producto del catálogo?')) return;
    const prod = catalogo.find(x => x._id === b.dataset.quitar);
    try {
      await deleteDoc(doc(db, 'pedidosCatalogo', b.dataset.quitar));
      log('catalogo', 'quitó "' + (prod ? prod.nombre : b.dataset.quitar) + '" del catálogo');
      toast('Producto quitado');
    }
    catch(e){ console.error(e); toast('No se pudo quitar'); }
  }));
  cont.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => {
    const p = catalogo.find(x => x._id === b.dataset.editar);
    if (p) abrirModalCosto(p);
  }));
}

// ── Costo y proveedor de un producto ────────────────────────────────────────
let costoEditandoId = null;
function abrirModalCosto(p){
  costoEditandoId = p._id;
  $('costoProducto').textContent = p.nombre + ' (' + p.unidad + ')';
  $('costoValor').value = p.costo || '';
  $('costoProveedor').value = p.proveedor || '';
  $('costoMinimo').value = p.minimo || '';
  $('costoUnidadInv').innerHTML = '<option value="">(la misma: ' + esc(p.unidad) + ')</option>' +
    UNIDADES.filter(u => u !== p.unidad).map(u => `<option value="${esc(u)}" ${p.unidadInv === u ? 'selected' : ''}>${esc(u)}</option>`).join('');
  $('costoErr').textContent = '';
  abrirModal('modalCosto');
}
$('btnGuardarCosto').addEventListener('click', async () => {
  if (!costoEditandoId) return;
  const btn = $('btnGuardarCosto'); btn.disabled = true;
  const costo = parseFloat($('costoValor').value) || 0;
  const proveedor = $('costoProveedor').value.trim();
  const minimo = parseFloat($('costoMinimo').value) || 0;
  const unidadInv = $('costoUnidadInv').value;
  try {
    await updateDoc(doc(db, 'pedidosCatalogo', costoEditandoId), { costo, proveedor, minimo, unidadInv });
    log('catalogo', 'editó "' + $('costoProducto').textContent + '": costo ' + fmtCLP(costo) +
      (proveedor ? ', proveedor ' + proveedor : '') + (minimo ? ', mínimo ' + fmtCant(minimo) + ' ' + (unidadInv || '') : '') );
    cerrarModales();
    toast('✓ Guardado');
  } catch(e){ console.error('[PEDIDOS] costo:', e); $('costoErr').textContent = 'No se pudo guardar, intenta de nuevo'; }
  finally { btn.disabled = false; }
});

// ── Vista INVENTARIO ────────────────────────────────────────────────────────
let invCatSel = null;    // categoría elegida (pedidor)
let invAreaSel = '';     // área elegida (comprador/admin); '' = resumen

function fechaRelativa(ms){
  if (!ms) return 'sin contar';
  const dias = Math.floor((Date.now() - ms) / 864e5);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return 'hace ' + dias + ' días';
}
function invDe(area){ return (inventarios[slug(area)] && inventarios[slug(area)].items) || {}; }

// Productos bajo mínimo para un área: [{key, nombre, unidad, hay, minimo, pedir}]
// El mínimo y el conteo van en la unidad de conteo (unidadInv); el pedido va en la de compra.
function bajoMinimo(area){
  const items = invDe(area);
  const lista = [];
  catalogo.forEach(p => {
    if (!p.minimo) return;
    const k = keyDe(p.nombre, p.unidad);
    const reg = items[k];
    if (!reg) return;                       // sin conteo no se sugiere
    if (reg.cantidad < p.minimo) {
      const distinta = p.unidadInv && p.unidadInv !== p.unidad;
      lista.push({ key: k, nombre: p.nombre, categoria: p.categoria, unidad: p.unidad,
        uCuenta: p.unidadInv || p.unidad, hay: reg.cantidad, minimo: p.minimo,
        // Si se cuenta en otra unidad (porciones), se agrega 1 unidad de compra y el chef ajusta
        pedir: distinta ? 1 : Math.round((p.minimo - reg.cantidad) * 100) / 100 });
    }
  });
  return lista;
}

function renderInventario(){
  if (esComprador()) { renderInventarioComprador(); return; }
  const sug = $('invSugerido');

  // Sugerido para pedir (bajo mínimo)
  const faltan = bajoMinimo(usuario.area);
  sug.innerHTML = faltan.length ? `
    <div class="sug-box">
      <div class="sug-titulo">⚠️ Bajo el mínimo (${faltan.length})</div>
      ${faltan.map(f => `<div class="sug-item"><span>${esc(f.nombre)}</span><span class="sug-det">hay ${fmtCant(f.hay)} ${esc(f.uCuenta)}, mín ${fmtCant(f.minimo)} → pedir ${fmtCant(f.pedir)} ${esc(f.unidad)}${f.uCuenta !== f.unidad ? ' (ajustar)' : ''}</span></div>`).join('')}
      <button class="btn-primary sug-btn" id="btnSugeridos">➕ Agregar todo al pedido</button>
    </div>` : '';
  const btnSug = $('btnSugeridos');
  if (btnSug) btnSug.addEventListener('click', () => {
    faltan.forEach(f => { carrito[f.key] = { nombre: f.nombre, categoria: f.categoria, unidad: f.unidad, cantidad: f.pedir }; });
    guardarCarrito();
    toast('✓ ' + faltan.length + ' productos al pedido');
    activarTab('pedir');
  });

  renderConteoEn($('listaInventario'), usuario.area);
}

// Conteo editable de un área: los pedidores cuentan la suya; el administrador corrige cualquiera
function renderConteoEn(cont, area){
  const items = invDe(area);
  const filtro = slug($('buscadorInv').value || '');
  if (!filtro && !invCatSel){
    const tarjetas = categoriasCon(catalogo.map(p => p.categoria)).map(cat => {
      const prods = catalogo.filter(p => p.categoria === cat);
      if (!prods.length) return '';
      const contados = prods.filter(p => items[keyDe(p.nombre, p.unidad)]).length;
      const partes = cat.split(' '); const emoji = partes.shift();
      return `<button class="cat-card" data-invcat="${esc(cat)}">
        <span class="emoji">${emoji}</span><span>${esc(partes.join(' '))}</span>
        <span class="cuenta">${contados}/${prods.length} contados</span>
      </button>`;
    }).join('');
    cont.innerHTML = `<div class="cat-grid">${tarjetas}</div>`;
    cont.querySelectorAll('[data-invcat]').forEach(b => b.addEventListener('click', () => {
      invCatSel = b.dataset.invcat; renderInventario(); window.scrollTo({ top: 0 });
    }));
    return;
  }

  const cats = filtro ? categoriasCon(catalogo.map(p => p.categoria)) : [invCatSel];
  let html = filtro ? '' : `<button class="cat-volver" id="btnVolverInv">‹ Todas las categorías</button>`;
  cats.forEach(cat => {
    const prods = catalogo.filter(p => p.categoria === cat && (!filtro || slug(p.nombre).includes(filtro)));
    if (!prods.length) return;
    html += `<div class="cat-titulo">${esc(cat)}</div>`;
    prods.forEach(p => {
      const k = keyDe(p.nombre, p.unidad);
      const reg = items[k];
      const uCuenta = p.unidadInv || p.unidad;
      html += `<div class="prod ${reg ? 'contado' : ''}">
        <div class="prod-nombre">${esc(p.nombre)} <span class="prod-unidad">(se cuenta en ${esc(uCuenta)})</span>
          <div class="inv-fecha">${reg ? '✓ ' + fechaRelativa(reg.f) : 'sin contar'}</div>
        </div>
        <input type="number" class="inv-input" inputmode="decimal" step="0.5" min="0"
          placeholder="¿hay?" value="${reg ? reg.cantidad : ''}" data-inv="${k}">
      </div>`;
    });
  });
  cont.innerHTML = html || '<div class="vacio">No hay productos que coincidan.</div>';
  const volver = $('btnVolverInv');
  if (volver) volver.addEventListener('click', () => { invCatSel = null; renderInventario(); });
  cont.querySelectorAll('[data-inv]').forEach(inp => inp.addEventListener('change', () =>
    guardarInventario(inp.dataset.inv, inp.value, area)));
}

async function guardarInventario(key, valor, area){
  area = area || usuario.area;
  const areaId = slug(area);
  const inv = inventarios[areaId] || { area, items: {} };
  if (!inv.items) inv.items = {};
  const p = catalogo.find(x => keyDe(x.nombre, x.unidad) === key);
  if (!p) return;
  const uCuenta = p.unidadInv || p.unidad;
  const antes = inv.items[key] ? fmtCant(inv.items[key].cantidad) : 'sin conteo';
  const n = parseFloat(valor);
  if (valor === '' || isNaN(n)) delete inv.items[key];
  else inv.items[key] = { nombre: p.nombre, categoria: p.categoria, unidad: uCuenta, cantidad: n, f: Date.now() };
  inventarios[areaId] = inv;
  const cambio = antes + ' → ' + (valor === '' || isNaN(n) ? 'borrado' : fmtCant(n)) + ' ' + uCuenta;
  try {
    await setDoc(doc(db, 'pedidosInventario', areaId), { area, items: inv.items });
    log('inventario', area === usuario.area
      ? 'contó "' + p.nombre + '": ' + cambio
      : 'corrigió "' + p.nombre + '" del inventario de ' + area + ': ' + cambio);
  } catch(e){ console.error('[PEDIDOS] inv guardar:', e); toast('No se pudo guardar'); }
}

// Vista del comprador/admin: todas las áreas + valorización
function renderInventarioComprador(){
  const cont = $('listaInventario');
  const sug = $('invSugerido');
  const filtro = slug($('buscadorInv').value || '');
  const costoDe = {};
  // Si se cuenta en otra unidad (porciones), el costo por unidad de compra no aplica al conteo
  catalogo.forEach(p => { costoDe[keyDe(p.nombre, p.unidad)] = (p.unidadInv && p.unidadInv !== p.unidad) ? 0 : (p.costo || 0); });
  const valorArea = (area) => {
    let v = 0; Object.entries(invDe(area)).forEach(([k, it]) => { v += (costoDe[k] || 0) * it.cantidad; });
    return v;
  };

  // Chips de áreas
  const chips = ['', ...AREAS_INVENTARIO].map(a =>
    `<button class="chip ${invAreaSel === a ? 'activo' : ''}" data-area="${esc(a)}">${a === '' ? '📊 Resumen' : esc(a)}</button>`).join('');
  let html = `<div class="chips">${chips}</div>`;

  if (!invAreaSel){
    // Resumen: valor por área + bajo mínimo global
    let total = 0;
    html += AREAS_INVENTARIO.map(a => {
      const v = valorArea(a); total += v;
      const n = Object.keys(invDe(a)).length;
      return `<div class="comp-item"><div class="comp-info">
        <span class="comp-nombre">${esc(a)}</span> · <span class="comp-total">${n} productos contados</span>
        <div class="comp-detalle">Valor: ${fmtCLP(v)}</div>
      </div></div>`;
    }).join('');
    html += `<div class="dia-total" style="margin-top:.6rem">💰 Valor total del inventario: ${fmtCLP(total)}</div>`;
    const faltanTodo = AREAS_INVENTARIO.flatMap(a => bajoMinimo(a).map(f => Object.assign({ area: a }, f)));
    if (faltanTodo.length){
      html += `<div class="sug-box"><div class="sug-titulo">⚠️ Bajo el mínimo en el local (${faltanTodo.length})</div>` +
        faltanTodo.map(f => `<div class="sug-item"><span>${esc(f.nombre)} <span class="prod-unidad">(${esc(f.area)})</span></span><span class="sug-det">hay ${fmtCant(f.hay)}, mín ${fmtCant(f.minimo)}</span></div>`).join('') + '</div>';
    }
  } else if (usuario.rol === 'admin'){
    // El administrador puede corregir, agregar y borrar conteos de cualquier área
    html += `<div class="dia-total">Valor del área: ${fmtCLP(valorArea(invAreaSel))} <span class="sin">· puedes corregir los conteos</span></div>
      <div id="conteoAdmin"></div>`;
  } else {
    const items = invDe(invAreaSel);
    const entradas = Object.entries(items).filter(([k, it]) => !filtro || slug(it.nombre).includes(filtro));
    html += `<div class="dia-total">Valor del área: ${fmtCLP(valorArea(invAreaSel))}</div>`;
    if (!entradas.length) html += '<div class="vacio">Esta área aún no cuenta nada.</div>';
    else categoriasCon(entradas.map(([,it]) => it.categoria)).forEach(cat => {
      const deCat = entradas.filter(([,it]) => it.categoria === cat);
      if (!deCat.length) return;
      html += `<div class="cat-titulo">${esc(cat)}</div>`;
      deCat.forEach(([k, it]) => {
        const val = (costoDe[k] || 0) * it.cantidad;
        html += `<div class="comp-item"><div class="comp-info">
          <span class="comp-nombre">${esc(it.nombre)}</span> · <span class="comp-total">${fmtCant(it.cantidad)} ${esc(it.unidad)}</span>
          <div class="comp-detalle">${fechaRelativa(it.f)}${val ? ' · ' + fmtCLP(val) : ''}</div>
        </div></div>`;
      });
    });
  }
  sug.innerHTML = '';
  cont.innerHTML = html;
  if (invAreaSel && usuario.rol === 'admin'){
    renderConteoEn(document.getElementById('conteoAdmin'), invAreaSel);
  }
  cont.querySelectorAll('[data-area]').forEach(b => b.addEventListener('click', () => {
    invAreaSel = b.dataset.area; invCatSel = null; renderInventario();
  }));
}

// ── Vista REGISTRO (solo administrador) ─────────────────────────────────────
const ICONO_ACCION = { inventario:'📦', pedido:'📤', compras:'🛒', catalogo:'📋', recepcion:'📥' };
function renderRegistro(){
  const cont = $('listaRegistro');
  const filtro = slug($('buscadorReg').value || '');
  const filas = registro.filter(r => !filtro || slug(r.area + ' ' + r.detalle).includes(filtro));
  if (!filas.length){ cont.innerHTML = '<div class="vacio">Sin movimientos registrados todavía.</div>'; return; }
  let diaAnt = '';
  cont.innerHTML = filas.map(r => {
    const d = r.ts && r.ts.seconds ? new Date(r.ts.seconds * 1000) : new Date();
    const dia = hoyStr(d);
    const cab = dia !== diaAnt ? `<div class="cat-titulo">${esc(etiquetaDia(dia))}</div>` : '';
    diaAnt = dia;
    const hora = d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });
    return `${cab}<div class="log-item">
      <span class="log-hora">${hora}</span>
      <span class="log-icono">${ICONO_ACCION[r.accion] || '•'}</span>
      <span class="log-texto"><b>${esc(r.area)}</b> ${esc(r.detalle)}</span>
    </div>`;
  }).join('');
}

// ── Badges en tabs ──────────────────────────────────────────────────────────
function renderBadges(){
  if (!esComprador()) return;
  const tab = $('tab-compras'); if (!tab) return;
  let pendientes = 0;
  Object.values(consolidarDia(pedidos.filter(p => p.dia === hoyStr()))).forEach(v => { if (!v.comprado) pendientes++; });
  tab.querySelector('.badge')?.remove();
  if (pendientes) tab.insertAdjacentHTML('beforeend', `<span class="badge">${pendientes}</span>`);
}

// ── Nuevo producto ──────────────────────────────────────────────────────────
function abrirModalProducto(){
  $('npNombre').value = ''; $('npErr').textContent = '';
  $('npCategoria').innerHTML = CATEGORIAS.map(c => `<option>${esc(c)}</option>`).join('');
  $('npUnidad').innerHTML = UNIDADES.map(u => `<option>${esc(u)}</option>`).join('');
  abrirModal('modalProducto');
}
$('btnNuevoProd').addEventListener('click', abrirModalProducto);
$('btnNuevoProd2').addEventListener('click', abrirModalProducto);
$('btnGuardarProd').addEventListener('click', async () => {
  const nombre = $('npNombre').value.trim();
  const categoria = $('npCategoria').value;
  const unidad = $('npUnidad').value;
  if (!nombre) { $('npErr').textContent = 'Escribe el nombre del producto'; return; }
  const btn = $('btnGuardarProd'); btn.disabled = true;
  try {
    await setDoc(doc(db, 'pedidosCatalogo', slug(nombre)), { nombre, categoria, unidad, activo: true });
    log('catalogo', 'agregó "' + nombre + '" (' + categoria + ', ' + unidad + ') al catálogo');
    // Si lo agrega alguien que está pidiendo, va directo a su pedido
    if (usuario.rol === 'pedidor') {
      carrito[keyDe(nombre, unidad)] = { nombre, categoria, unidad, cantidad: 1 };
      guardarCarrito();
    }
    cerrarModales();
    toast('✓ Producto agregado');
  } catch(e){ console.error(e); $('npErr').textContent = 'No se pudo guardar, intenta de nuevo'; }
  finally { btn.disabled = false; }
});

// ── Modales ─────────────────────────────────────────────────────────────────
function abrirModal(id){ $(id).classList.add('abierto'); }
function cerrarModales(){ document.querySelectorAll('.modal').forEach(m => m.classList.remove('abierto')); }
document.querySelectorAll('[data-cerrar]').forEach(el => el.addEventListener('click', cerrarModales));

// ── Hook de prueba (solo funciona en localhost, en producción no existe) ────
if (location.hostname === 'localhost') {
  window.__umiTest = {
    setCatalogo(c){ catalogo = c; renderTodo(); },
    setPedidos(p){ pedidos = p; renderTodo(); },
    base(){ return CATALOGO_BASE; },
    estado(){ return { catalogo, pedidos, carrito, usuario, tabActiva }; },
  };
}

// ── Arranque ────────────────────────────────────────────────────────────────
const pinGuardado = localStorage.getItem('umiPedidosPin');
if (pinGuardado && USUARIOS[pinGuardado]) entrar(USUARIOS[pinGuardado]);
else $('pinInput').focus();
