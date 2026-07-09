// UMI Pedidos — app interna de compras (chefs y encargados)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, deleteDoc, getDocs,
  onSnapshot, query, where, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

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
  '1111': { area: 'Cocina',         rol: 'pedidor' },
  '2222': { area: 'Sushi',          rol: 'pedidor' },
  '3333': { area: 'Barra',          rol: 'pedidor' },
  '4444': { area: 'Administración', rol: 'pedidor' },
  '9999': { area: 'Compras',        rol: 'comprador' },
};

const CATEGORIAS = [
  '🥑 Verduras y Frutas',
  '🐟 Proteínas',
  '🍚 Abarrotes',
  '🍹 Bebidas y Licores',
  '📦 Papelería y Envases',
  '🧴 Limpieza',
];
const UNIDADES = ['kg','g','un','caja','pack','bandeja','botella','litro','saco','rollo','bolsa','paquete'];

// Catálogo base: se carga a Firestore la primera vez (después se edita desde la app)
const CATALOGO_BASE = [
  // Verduras y Frutas
  ['Palta','kg'],['Limón','kg'],['Limón de pica','kg'],['Cebolla morada','kg'],['Cebollín','paquete'],
  ['Ciboulette','paquete'],['Cilantro','paquete'],['Jengibre','kg'],['Pepino','kg'],['Lechuga','un'],
  ['Tomate','kg'],['Zanahoria','kg'],['Champiñón','kg'],['Choclo','kg'],['Camote','kg'],['Papa','kg'],
  ['Ají verde','kg'],['Mango','un'],['Maracuyá','kg'],['Naranja','kg'],['Frutilla','kg'],
  ['Menta','paquete'],['Albahaca','paquete'],
  // Proteínas
  ['Salmón','kg'],['Atún','kg'],['Reineta','kg'],['Congrio','kg'],['Camarón','kg'],['Pulpo','kg'],
  ['Calamar','kg'],['Ostión','kg'],['Kanikama','caja'],['Pollo','kg'],['Lomo de res','kg'],
  ['Tocino','kg'],['Huevos','bandeja'],
  // Abarrotes
  ['Arroz de sushi','saco'],['Alga nori','caja'],['Sésamo','kg'],['Panko','kg'],['Salsa de soya','litro'],
  ['Mirin','litro'],['Vinagre de arroz','litro'],['Wasabi','un'],['Pasta ají amarillo','kg'],
  ['Queso crema','kg'],['Mayonesa','kg'],['Leche condensada','un'],['Harina','kg'],['Harina tempura','kg'],
  ['Aceite','litro'],['Aceite de sésamo','botella'],['Salsa anguila','botella'],['Salsa teriyaki','botella'],
  ['Sal','kg'],['Azúcar','kg'],['Merkén','kg'],
  // Bebidas y Licores
  ['Pisco','botella'],['Ron','botella'],['Vodka','botella'],['Gin','botella'],['Sake','botella'],
  ['Vino blanco','botella'],['Espumante','botella'],['Cerveza','caja'],['Coca-Cola','caja'],
  ['Bebidas variadas','caja'],['Agua con gas','caja'],['Agua sin gas','caja'],['Tónica','caja'],
  ['Ginger ale','caja'],['Red Bull','caja'],['Jugo de piña','litro'],['Jugo de arándano','litro'],
  ['Granadina','botella'],['Hielo','bolsa'],
  // Papelería y Envases
  ['Cajas delivery','pack'],['Bolsas kraft','pack'],['Bolsas plásticas','pack'],['Palitos chinos','pack'],
  ['Servilletas','pack'],['Rollos de boleta','pack'],['Papel film','rollo'],['Papel aluminio','rollo'],
  ['Guantes nitrilo','caja'],['Papel absorbente','pack'],['Vasos desechables','pack'],
  ['Contenedor de salsas','pack'],
  // Limpieza
  ['Cloro','litro'],['Lavalozas','litro'],['Desengrasante','litro'],['Esponjas','pack'],['Paños','pack'],
  ['Bolsas de basura','pack'],['Jabón de manos','litro'],['Alcohol','litro'],['Toalla de papel','pack'],
].map((p, i) => {
  // La categoría se deduce por posición según los bloques de arriba
  const cortes = [23, 36, 57, 76, 88, 97];
  const cat = CATEGORIAS[cortes.findIndex(c => i < c)];
  return { nombre: p[0], unidad: p[1], categoria: cat };
});

// ── Estado ──────────────────────────────────────────────────────────────────
let usuario  = null;   // { area, rol }
let catalogo = [];     // productos de Firestore
let pedidos  = [];     // pedidos de los últimos 14 días (en vivo)
let carrito  = {};     // key -> { nombre, categoria, cantidad, unidad }
let tabActiva = '';
let seedIntentado = false;

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
  const defs = usuario.rol === 'comprador'
    ? [ ['compras','🛒 Por comprar'], ['catalogo','📋 Catálogo'] ]
    : [ ['pedir','📝 Pedir'], ['enviados','📤 Enviados'] ];
  $('tabs').innerHTML = defs.map(([id, txt]) =>
    `<button class="tab" data-tab="${id}" id="tab-${id}">${txt}</button>`).join('');
  defs.forEach(([id]) => $('tab-' + id).addEventListener('click', () => activarTab(id)));
  activarTab(defs[0][0]);
}
function activarTab(id){
  tabActiva = id;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('activa', t.dataset.tab === id));
  const vistas = { pedir:'vistaPedir', enviados:'vistaEnviados', compras:'vistaCompras', catalogo:'vistaCatalogo' };
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
  renderBadges();
}

// ── Vista PEDIR ─────────────────────────────────────────────────────────────
function renderCatalogo(){
  const filtro = ($('buscador').value || '').toLowerCase();
  const cont = $('listaCatalogo');
  let html = '';
  CATEGORIAS.forEach(cat => {
    const prods = catalogo.filter(p => p.categoria === cat &&
      (!filtro || p.nombre.toLowerCase().includes(filtro)));
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
  $('resumenPedido').innerHTML = items.map(i =>
    `<div class="pedido-item"><span class="cant">${fmtCant(i.cantidad)} ${esc(i.unidad)}</span><span class="nombre">${esc(i.nombre)}</span></div>`
  ).join('');
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
      items: items.map(i => ({ nombre: i.nombre, categoria: i.categoria, cantidad: i.cantidad, unidad: i.unidad, comprado: false })),
    });
    carrito = {}; guardarCarrito();
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
    try { await deleteDoc(doc(db, 'pedidosCompras', b.dataset.borrar)); toast('Pedido eliminado'); }
    catch(e){ console.error(e); toast('No se pudo eliminar'); }
  }));
}
function cardPedido(p, esHoy){
  const hora = p.createdAt?.seconds
    ? new Date(p.createdAt.seconds * 1000).toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }) : '';
  const nadaComprado = p.items.every(i => !i.comprado);
  return `<div class="pedido-card">
    <div class="pedido-head"><span class="pedido-area">${esc(p.area)}</span><span class="pedido-hora">${hora}</span></div>
    ${p.nota ? `<div class="pedido-nota">“${esc(p.nota)}”</div>` : ''}
    ${p.items.map(i =>
      `<div class="pedido-item ${i.comprado ? 'comprado' : ''}">
         <span class="cant">${fmtCant(i.cantidad)} ${esc(i.unidad)}</span>
         <span class="nombre">${esc(i.nombre)}</span>
         ${i.comprado ? '<span style="margin-left:auto">✅</span>' : ''}
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
      map[k].fuentes.push({ area: p.area, cantidad: it.cantidad });
      if (!it.comprado) map[k].comprado = false;
    });
  });
  return map;
}
function renderCompras(){
  const cont = $('listaCompras');
  if (!pedidos.length) { cont.innerHTML = '<div class="vacio">No hay pedidos todavía.<br>Cuando cocina, sushi o barra envíen su pedido, aparecerá aquí.</div>'; return; }
  const porDia = agruparPorDia(pedidos);
  cont.innerHTML = Object.keys(porDia).sort().reverse().map(dia => {
    const cons = consolidarDia(porDia[dia]);
    const items = Object.entries(cons);
    const listos = items.filter(([,v]) => v.comprado).length;
    const completo = listos === items.length;
    const notas = porDia[dia].filter(p => p.nota)
      .map(p => `<div class="pedido-nota">📌 ${esc(p.area)}: “${esc(p.nota)}”</div>`).join('');
    let cuerpo = '';
    CATEGORIAS.forEach(cat => {
      const deCat = items.filter(([,v]) => v.categoria === cat);
      if (!deCat.length) return;
      cuerpo += `<div class="cat-titulo">${esc(cat)}</div>`;
      deCat.forEach(([k, v]) => {
        const detalle = v.fuentes.map(f => `${esc(f.area)} ${fmtCant(f.cantidad)}`).join(' + ');
        cuerpo += `<div class="comp-item ${v.comprado ? 'comprado' : ''}">
          <input type="checkbox" class="comp-check" data-dia="${dia}" data-key="${k}" ${v.comprado ? 'checked' : ''}>
          <div class="comp-info">
            <span class="comp-nombre">${esc(v.nombre)}</span> · <span class="comp-total">${fmtCant(v.total)} ${esc(v.unidad)}</span>
            ${v.fuentes.length > 1 ? `<div class="comp-detalle">${detalle}</div>` : `<div class="comp-detalle">${esc(v.fuentes[0].area)}</div>`}
          </div>
        </div>`;
      });
    });
    return `<div class="dia-bloque">
      <div class="dia-head">
        <span>${esc(etiquetaDia(dia))}</span>
        <span class="estado ${completo ? 'completo' : 'pendiente'}">${completo ? '✓ Todo comprado' : listos + '/' + items.length + ' comprados'}</span>
      </div>
      <div class="progreso"><div style="width:${items.length ? Math.round(listos/items.length*100) : 0}%"></div></div>
      ${notas}${cuerpo}
    </div>`;
  }).join('');

  cont.querySelectorAll('.comp-check').forEach(ch => ch.addEventListener('change', () =>
    marcarComprado(ch.dataset.dia, ch.dataset.key, ch.checked)));
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
function renderCatalogoAdmin(){
  const cont = $('listaCatalogoAdmin');
  let html = '';
  CATEGORIAS.forEach(cat => {
    const prods = catalogo.filter(p => p.categoria === cat);
    if (!prods.length) return;
    html += `<div class="cat-titulo">${esc(cat)}</div>`;
    prods.forEach(p => {
      html += `<div class="cata-item">
        <span>${esc(p.nombre)} <span class="u">(${esc(p.unidad)})</span></span>
        <button class="cata-quitar" data-quitar="${p._id}" title="Quitar del catálogo">🗑</button>
      </div>`;
    });
  });
  cont.innerHTML = html || '<div class="vacio">Catálogo vacío.</div>';
  cont.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('¿Quitar este producto del catálogo?')) return;
    try { await deleteDoc(doc(db, 'pedidosCatalogo', b.dataset.quitar)); toast('Producto quitado'); }
    catch(e){ console.error(e); toast('No se pudo quitar'); }
  }));
}

// ── Badges en tabs ──────────────────────────────────────────────────────────
function renderBadges(){
  if (usuario.rol !== 'comprador') return;
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
