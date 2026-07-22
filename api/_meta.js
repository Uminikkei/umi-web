// Utilidades compartidas para la Conversions API de Meta (server-side).
// Este archivo empieza con "_" para que Vercel NO lo exponga como endpoint.
//
// Reglas de oro:
//  - Toda la PII (email, teléfono, nombre) se NORMALIZA y se HASHEA con SHA-256
//    antes de salir del servidor. Nunca se envía ni se loguea en claro.
//  - Los tokens viven solo en variables de entorno de Vercel.

const crypto = require('crypto');

// Se aceptan ambas formas (mayúscula/minúscula) porque así quedaron creadas en Vercel
const PIXEL_ID = process.env.META_PIXEL_ID || process.env.meta_pixel_ID || process.env.meta_pixel_id || '';
const TOKEN = process.env.META_CAPI_TOKEN || process.env.meta_capi_token || '';
const API_VERSION = 'v21.0';

function sha256(v) {
  return crypto.createHash('sha256').update(String(v)).digest('hex');
}

// Email: minúsculas + trim. Se descarta el placeholder que usa el checkout
// cuando el Brick no entrega correo (jamás hashear un email falso).
function normalizarEmail(e) {
  e = String(e || '').trim().toLowerCase();
  if (!e || !e.includes('@')) return null;
  if (e === 'cliente@uminikkeibar.cl') return null;
  return e;
}

// Teléfono: formato E.164 sin "+" (Chile). "9 1234 5678" → "56912345678".
function normalizarTelefono(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('56') && d.length >= 11) return d;
  if (d.length === 9 && d.startsWith('9')) return '56' + d;
  if (d.length === 8) return '569' + d;
  return '56' + d;
}

// ID de producto estable a partir del nombre del plato.
// DEBE ser idéntico a umiSlug() en script.js y a los ids del catálogo (Fase 2).
function slugProducto(n) {
  return String(n || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Construye el user_data hasheado que exige Meta.
// u = { email, phone, name, external_id, fbp, fbc } (en claro, solo en memoria)
// req = request de Vercel (para IP y user-agent del cliente)
function construirUserData(u, req) {
  u = u || {};
  const ud = {};
  const em = normalizarEmail(u.email);
  if (em) ud.em = [sha256(em)];
  const ph = normalizarTelefono(u.phone);
  if (ph) ud.ph = [sha256(ph)];
  const nombre = String(u.name || '').trim().toLowerCase();
  if (nombre) {
    const partes = nombre.split(/\s+/);
    ud.fn = [sha256(partes[0])];
    if (partes.length > 1) ud.ln = [sha256(partes[partes.length - 1])];
  }
  if (u.external_id) ud.external_id = [sha256(String(u.external_id))];
  // Geo fija del negocio: mejora el match sin pedir datos extra al cliente
  ud.ct = [sha256('coquimbo')];
  ud.st = [sha256('coquimbo')];
  ud.country = [sha256('cl')];
  // Cookies de Meta: van SIN hashear (así lo pide la API)
  if (u.fbp) ud.fbp = String(u.fbp);
  if (u.fbc) ud.fbc = String(u.fbc);
  if (req && req.headers) {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || String(req.headers['x-real-ip'] || '').trim();
    if (ip) ud.client_ip_address = ip;
    if (req.headers['user-agent']) ud.client_user_agent = req.headers['user-agent'];
  }
  return ud;
}

// Envía UN evento a la Conversions API. Nunca lanza excepción hacia arriba
// con datos sensibles; loguea solo nombre de evento y respuesta de Meta.
async function enviarEventoMeta(evento) {
  if (!PIXEL_ID || !TOKEN) {
    console.log('[META] CAPI no configurada (faltan META_PIXEL_ID / META_CAPI_TOKEN)');
    return { skipped: true };
  }
  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [evento] })
  });
  const out = await r.json();
  console.log('[META]', evento.event_name, 'id=', evento.event_id, '→', r.status, JSON.stringify(out).slice(0, 200));
  return out;
}

module.exports = { construirUserData, enviarEventoMeta, slugProducto, sha256 };
