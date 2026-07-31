// Cliente mínimo de la Marketing API de Meta (Graph API), sin dependencias.
// MODO DRY-RUN POR DEFECTO: imprime el payload que enviaría, no envía nada.
// Solo con la bandera --ejecutar se hacen llamadas reales.

const { API_VERSION, TOKEN } = require('./config');
const { registrar } = require('./log');

const BASE = 'https://graph.facebook.com/' + API_VERSION;

// estado global del modo (lo fija el CLI según las banderas)
let MODO_REAL = false;
function activarModoReal() { MODO_REAL = true; }
function esModoReal() { return MODO_REAL; }

function exigirToken() {
  if (!TOKEN) {
    console.error('\n❌ Falta META_ADS_TOKEN en tools/meta-ads/.env');
    console.error('   Genera el token del usuario del sistema "umi-ads bot" en');
    console.error('   Configuración del negocio → Usuarios del sistema → Generar token.');
    process.exit(1);
  }
}

// GET real (lecturas: audit/report necesitan datos reales incluso en dry-run)
async function get(ruta, params = {}) {
  exigirToken();
  const url = new URL(BASE + '/' + ruta);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  url.searchParams.set('access_token', TOKEN);
  const r = await fetch(url);
  const data = await r.json();
  if (data.error) throw new Error(`GET ${ruta}: ${data.error.message} (code ${data.error.code})`);
  return data;
}

// POST: en dry-run solo imprime; en modo real envía y registra en el log
async function post(ruta, body, descripcion) {
  if (!MODO_REAL) {
    console.log(`\n─── [DRY-RUN] ${descripcion}`);
    console.log(`POST ${BASE}/${ruta}`);
    console.log(JSON.stringify(body, null, 2));
    registrar('DRY-RUN', { ruta, descripcion });
    return { dryRun: true, id: '(simulado)' };
  }
  exigirToken();
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  form.set('access_token', TOKEN);
  const r = await fetch(BASE + '/' + ruta, { method: 'POST', body: form });
  const data = await r.json();
  registrar(data.error ? 'ERROR' : 'POST', { ruta, descripcion, respuesta: data });
  if (data.error) throw new Error(`POST ${ruta}: ${data.error.message} (code ${data.error.code})`);
  console.log(`   ✅ ${descripcion} → id ${data.id || JSON.stringify(data)}`);
  return data;
}

module.exports = { get, post, activarModoReal, esModoReal };
