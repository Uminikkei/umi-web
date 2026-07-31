// Configuración de la herramienta umi-ads.
// Las credenciales viven SOLO en tools/meta-ads/.env (ignorado por git).

const fs = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════════════════════════
// FRENO DE SEGURIDAD — decidido por Adnan el 2026-07-31.
// Suma de presupuestos diarios de TODO lo que la herramienta cree o modifique.
// Si una operación lo superaría, la herramienta ABORTA. Para cambiarlo se
// edita esta línea a mano (a propósito: ningún comando puede subirlo).
const TOPE_DIARIO_CLP = 15000;
// ══════════════════════════════════════════════════════════════════════════

// Carga .env sin dependencias externas (formato CLAVE=valor, # comentarios)
function cargarEnv() {
  const ruta = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(ruta)) return {};
  const env = {};
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !linea.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = cargarEnv();

module.exports = {
  TOPE_DIARIO_CLP,
  API_VERSION: 'v21.0',
  // Credenciales y IDs (desde .env — nunca hardcodeados aquí)
  TOKEN: env.META_ADS_TOKEN || '',
  AD_ACCOUNT: env.META_AD_ACCOUNT_ID ? 'act_' + String(env.META_AD_ACCOUNT_ID).replace(/^act_/, '') : '',
  PIXEL_ID: env.META_PIXEL_ID || '',
  CATALOG_ID: env.META_CATALOG_ID || '',
  PAGE_ID: env.META_PAGE_ID || '',
  IG_ID: env.META_IG_ID || '',
  BUSINESS_ID: env.META_BUSINESS_ID || '',
  // Geo del local: Av. Costanera 5633, Coquimbo (aprox; verificar en el mapa
  // del Administrador de Anuncios al activar)
  GEO: { lat: -29.9590, lng: -71.3390 },
  MONEDA: 'CLP'
};
