#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// umi-ads — herramienta de operación de campañas Meta para UMI Nikkei Bar
//
// REGLAS DE SEGURIDAD (no negociables, ver docs/ADS-TOOL.md):
//  1. TODO lo que crea nace en estado PAUSED. Nada gasta sin aprobación
//     manual en el Administrador de Anuncios.
//  2. Tope diario hardcodeado en lib/config.js (TOPE_DIARIO_CLP). Si una
//     operación lo superaría, la herramienta aborta.
//  3. Modo DRY-RUN por defecto: imprime lo que haría. Solo --ejecutar envía.
//  4. Token solo en .env (ignorado por git). Log local de toda operación.
//
// Uso:
//   node umi-ads.js audit
//   node umi-ads.js create --template prospeccion [--ejecutar]
//   node umi-ads.js audiences sync [--csv clientes.csv] [--ejecutar]
//   node umi-ads.js report --days 7
//   node umi-ads.js rules apply [--ejecutar]
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('./lib/config');
const api = require('./lib/api');
const { registrar } = require('./lib/log');

const args = process.argv.slice(2);
const comando = args[0] || 'ayuda';
const flag = (n) => args.includes('--' + n);
const opcion = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };

if (flag('ejecutar')) api.activarModoReal();

const HOY = new Date().toISOString().slice(0, 10).replace(/-/g, '');

// ── helpers ────────────────────────────────────────────────────────────────
function clpACentavos(clp) { return Math.round(clp * 100); } // la API usa la unidad mínima ×100
function cargarTemplate(clave) {
  const ruta = path.join(__dirname, 'templates', clave + '.json');
  if (!fs.existsSync(ruta)) {
    const disponibles = fs.readdirSync(path.join(__dirname, 'templates')).map(f => f.replace('.json', ''));
    console.error(`❌ Plantilla "${clave}" no existe. Disponibles: ${disponibles.join(', ')}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '')); // tolerar BOM
}

// Segmentación geográfica común: radio alrededor del local
function targetingGeo(radioKm) {
  return {
    geo_locations: {
      custom_locations: [{
        latitude: cfg.GEO.lat, longitude: cfg.GEO.lng,
        radius: radioKm, distance_unit: 'kilometer'
      }]
    }
  };
}

// ── FRENO DE PRESUPUESTO ───────────────────────────────────────────────────
// Suma lo activo hoy en la cuenta + lo que se quiere crear; si supera el
// tope, aborta. En dry-run sin token solo valida la plantilla contra el tope.
async function verificarTope(nuevoDiarioCLP) {
  let activoCLP = 0;
  if (cfg.TOKEN) {
    try {
      const r = await api.get(`${cfg.AD_ACCOUNT}/campaigns`, {
        fields: 'name,status,daily_budget,effective_status',
        limit: 100
      });
      for (const c of r.data || []) {
        if (c.effective_status === 'ACTIVE' && c.daily_budget) activoCLP += Number(c.daily_budget) / 100;
      }
    } catch (e) { console.warn('⚠️  No se pudo leer el gasto activo actual:', e.message); }
  }
  const total = activoCLP + nuevoDiarioCLP;
  console.log(`\n💰 Freno de presupuesto: activo ${activoCLP} + nuevo ${nuevoDiarioCLP} = ${total} CLP/día (tope ${cfg.TOPE_DIARIO_CLP})`);
  if (total > cfg.TOPE_DIARIO_CLP) {
    console.error(`\n🛑 ABORTADO: la operación superaría el tope diario de ${cfg.TOPE_DIARIO_CLP} CLP.`);
    console.error('   Pausa o baja el presupuesto de otras campañas primero.');
    registrar('ABORTADO-TOPE', { activoCLP, nuevoDiarioCLP });
    process.exit(1);
  }
}

// ── comando: audit ─────────────────────────────────────────────────────────
async function cmdAudit() {
  console.log('🔎 Auditoría de la cuenta publicitaria\n');
  const cuenta = await api.get(cfg.AD_ACCOUNT, { fields: 'name,currency,account_status,amount_spent,timezone_name' });
  console.log(`Cuenta: ${cuenta.name} · Moneda ${cuenta.currency} · TZ ${cuenta.timezone_name} · Estado ${cuenta.account_status === 1 ? 'ACTIVA' : cuenta.account_status}`);
  console.log(`Gasto histórico total: ${Number(cuenta.amount_spent) / 100} ${cuenta.currency}`);

  const camps = await api.get(`${cfg.AD_ACCOUNT}/campaigns`, {
    fields: 'name,objective,effective_status,daily_budget,created_time', limit: 100
  });
  if (!camps.data || !camps.data.length) { console.log('\nSin campañas creadas todavía.'); return; }
  console.log('\nCampañas:');
  let totalActivo = 0;
  for (const c of camps.data) {
    const diario = c.daily_budget ? Number(c.daily_budget) / 100 : 0;
    if (c.effective_status === 'ACTIVE') totalActivo += diario;
    console.log(`  · ${c.name} [${c.effective_status}] ${diario ? diario + ' CLP/día' : ''}`);
  }
  console.log(`\nPresupuesto diario ACTIVO total: ${totalActivo} / ${cfg.TOPE_DIARIO_CLP} CLP (tope)`);

  // Rendimiento últimos 7 días
  try {
    const ins = await api.get(`${cfg.AD_ACCOUNT}/insights`, {
      date_preset: 'last_7d', level: 'campaign',
      fields: 'campaign_name,spend,impressions,actions,action_values'
    });
    if (ins.data && ins.data.length) {
      console.log('\nÚltimos 7 días:');
      for (const i of ins.data) {
        const compras = (i.actions || []).find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
        const valor = (i.action_values || []).find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
        const roas = valor && i.spend > 0 ? (Number(valor.value) / Number(i.spend)).toFixed(2) : '—';
        console.log(`  · ${i.campaign_name}: gasto ${i.spend} · compras ${compras ? compras.value : 0} · ROAS ${roas}`);
      }
    }
  } catch (e) { /* cuenta nueva sin insights: normal */ }
}

// ── comando: create --template X ───────────────────────────────────────────
async function cmdCreate() {
  const clave = opcion('template');
  if (!clave) { console.error('❌ Falta --template <prospeccion|retargeting|retencion|reservas>'); process.exit(1); }
  const t = cargarTemplate(clave);
  console.log(`\n📦 Plantilla: ${t.descripcion}`);
  console.log(api.esModoReal() ? '⚡ MODO REAL (--ejecutar): se crearán objetos EN PAUSA' : '🧪 DRY-RUN: solo se muestra lo que se haría');

  await verificarTope(t.presupuesto_diario_clp);

  const nombreCampana = `${t.nombre_base}_${HOY}`;
  // 1) Campaña — SIEMPRE nace PAUSED
  const campBody = {
    name: nombreCampana,
    objective: t.objetivo,
    status: 'PAUSED',
    special_ad_categories: [],
    daily_budget: clpACentavos(t.presupuesto_diario_clp) // CBO: presupuesto a nivel campaña
  };
  if (t.usa_catalogo) {
    if (!cfg.CATALOG_ID) { console.error('❌ Falta META_CATALOG_ID en .env'); process.exit(1); }
    campBody.promoted_object = { product_catalog_id: cfg.CATALOG_ID };
  }
  const camp = await api.post(`${cfg.AD_ACCOUNT}/campaigns`, campBody, `Campaña ${nombreCampana}`);

  // 2) Conjuntos de anuncios — SIEMPRE PAUSED
  for (const ad of t.adsets) {
    const body = {
      name: `${nombreCampana}__${ad.nombre}`,
      campaign_id: camp.id,
      status: 'PAUSED',
      optimization_goal: ad.optimization_goal,
      billing_event: ad.billing_event,
      targeting: {}
    };
    if (ad.evento_pixel) {
      body.promoted_object = { pixel_id: cfg.PIXEL_ID, custom_event_type: ad.evento_pixel };
    }
    if (t.destino === 'WHATSAPP') {
      body.destination_type = 'WHATSAPP';
      body.promoted_object = { page_id: cfg.PAGE_ID };
    }
    if (ad.segmentacion) {
      const s = ad.segmentacion;
      body.targeting = {
        ...targetingGeo(s.radio_km || 12),
        age_min: s.edad_min || 22,
        age_max: s.edad_max || 55
      };
      if (s.advantage_audience) body.targeting_automation = { advantage_audience: 1 };
      if (s.excluir_compradores_dias) {
        body._nota = `Excluir compradores ${s.excluir_compradores_dias}d: se aplica con la audiencia "UMI Compradores ${s.excluir_compradores_dias}d" (crear con audiences sync) como exclusión al activar.`;
      }
      if (s.horario) body._nota_horario = JSON.stringify(s.horario);
    }
    if (ad.audiencia_dinamica) {
      const d = ad.audiencia_dinamica;
      // Audiencia dinámica de producto (retargeting de catálogo)
      body.targeting = {
        ...targetingGeo(12),
        product_audience_specs: [{
          product_set_id: '{{PRODUCT_SET_ID}}', // se completa al activar (conjunto "Todos los productos" del catálogo)
          inclusions: [{ retention_seconds: d.dias * 86400, rule: { event: { eq: d.evento } } }],
          exclusions: [{ retention_seconds: d.excluir_dias * 86400, rule: { event: { eq: d.excluir_evento } } }]
        }]
      };
    }
    if (ad.audiencia_nombre) {
      body._nota = `Requiere audiencia "${ad.audiencia_nombre}" (crear con: umi-ads audiences sync). Asignar al activar.`;
    }
    await api.post(`${cfg.AD_ACCOUNT}/adsets`, body, `Adset ${ad.nombre}`);
  }

  console.log(`\n📝 Creativos: ${t.creativos}`);
  console.log('\n✋ Recuerda: todo quedó EN PAUSA. Revisar y activar a mano en el Administrador de Anuncios.');
}

// ── comando: audiences sync ────────────────────────────────────────────────
// Crea las audiencias del sitio (pixel) y, si se pasa --csv, sube la lista de
// clientes HASHEADA con SHA-256 (solo quienes dieron opt-in de marketing).
async function cmdAudiences() {
  console.log('👥 Sincronización de audiencias\n');

  // 1) Audiencias del sitio web (pixel)
  const webAudiences = [
    { name: 'UMI Compradores 14d', evento: 'Purchase', dias: 14 },
    { name: 'UMI Compradores 180d', evento: 'Purchase', dias: 180 },
    { name: 'UMI Carrito 14d', evento: 'AddToCart', dias: 14 },
    { name: 'UMI Checkout 7d', evento: 'InitiateCheckout', dias: 7 },
    { name: 'UMI Vistos 30d', evento: 'ViewContent', dias: 30 }
  ];
  for (const a of webAudiences) {
    await api.post(`${cfg.AD_ACCOUNT}/customaudiences`, {
      name: a.name,
      subtype: 'WEBSITE',
      retention_days: a.dias,
      rule: JSON.stringify({
        inclusions: { operator: 'or', rules: [{ event_sources: [{ id: cfg.PIXEL_ID, type: 'pixel' }], retention_seconds: a.dias * 86400, filter: { operator: 'and', filters: [{ field: 'event', operator: 'eq', value: a.evento }] } }] }
      })
    }, `Audiencia web "${a.name}"`);
  }

  // 2) Lista de clientes desde CSV (email,phone,name) — SIEMPRE hasheada
  const rutaCsv = opcion('csv');
  if (rutaCsv) {
    if (!fs.existsSync(rutaCsv)) { console.error(`❌ No existe el archivo ${rutaCsv}`); process.exit(1); }
    const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
    const filas = fs.readFileSync(rutaCsv, 'utf8').split(/\r?\n/).filter(Boolean).slice(1); // sin encabezado
    const schema = ['EMAIL', 'PHONE'];
    const data = filas.map(l => {
      const [email, phone] = l.split(',');
      const em = String(email || '').trim().toLowerCase();
      let ph = String(phone || '').replace(/\D/g, '');
      if (ph.length === 9 && ph.startsWith('9')) ph = '56' + ph;
      return [em ? sha(em) : '', ph ? sha(ph) : ''];
    }).filter(r => r[0] || r[1]);
    console.log(`\n📇 ${data.length} clientes en el CSV (ya hasheados en memoria, nunca se envían en claro)`);
    const aud = await api.post(`${cfg.AD_ACCOUNT}/customaudiences`, {
      name: 'UMI Clientes Registrados (optin)',
      subtype: 'CUSTOM',
      customer_file_source: 'USER_PROVIDED_ONLY',
      description: 'Clientes registrados en la web con opt-in de marketing (Ley 19.628)'
    }, 'Audiencia "UMI Clientes Registrados (optin)"');
    if (api.esModoReal() && aud.id) {
      await api.post(`${aud.id}/users`, {
        payload: { schema, data }
      }, `Subida hasheada de ${data.length} clientes`);
    }
    console.log('ℹ️  Exporta el CSV SOLO con clientes acceptsPromos=true (desde el panel de clientes).');
  } else {
    console.log('\nℹ️  Sin --csv: solo audiencias de pixel. Para la lista de clientes:');
    console.log('   node umi-ads.js audiences sync --csv clientes.csv  (columnas: email,phone)');
  }

  // 3) Lookalikes (requieren la audiencia de compradores con >100 personas)
  for (const ratio of [0.01, 0.03]) {
    await api.post(`${cfg.AD_ACCOUNT}/customaudiences`, {
      name: `UMI Lookalike ${ratio * 100}% Compradores`,
      subtype: 'LOOKALIKE',
      origin_audience_name: 'UMI Compradores 180d',
      lookalike_spec: JSON.stringify({ type: 'similarity', ratio, country: 'CL' }),
      _nota: 'Requiere que "UMI Compradores 180d" tenga ≥100 personas; si falla, reintentar cuando la base crezca'
    }, `Lookalike ${ratio * 100}%`);
  }
}

// ── comando: report --days N ───────────────────────────────────────────────
async function cmdReport() {
  const dias = Number(opcion('days')) || 7;
  console.log(`📊 Reporte de los últimos ${dias} días\n`);
  const ins = await api.get(`${cfg.AD_ACCOUNT}/insights`, {
    time_range: { since: new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10), until: new Date().toISOString().slice(0, 10) },
    level: 'campaign',
    fields: 'campaign_name,spend,impressions,clicks,ctr,cpm,actions,action_values,frequency'
  });
  if (!ins.data || !ins.data.length) { console.log('Sin datos en el período (¿campañas pausadas o recién creadas?)'); return; }
  let gastoTotal = 0, valorTotal = 0;
  for (const i of ins.data) {
    const compras = (i.actions || []).find(a => a.action_type === 'omni_purchase' || a.action_type === 'purchase');
    const valor = (i.action_values || []).find(a => a.action_type === 'omni_purchase' || a.action_type === 'purchase');
    const nCompras = compras ? Number(compras.value) : 0;
    const vCompras = valor ? Number(valor.value) : 0;
    gastoTotal += Number(i.spend); valorTotal += vCompras;
    console.log(`▸ ${i.campaign_name}`);
    console.log(`   Gasto ${i.spend} · Impresiones ${i.impressions} · CTR ${i.ctr}% · CPM ${i.cpm} · Frecuencia ${i.frequency}`);
    console.log(`   Compras ${nCompras} · Valor ${vCompras} · CPA ${nCompras ? (i.spend / nCompras).toFixed(0) : '—'} · ROAS ${i.spend > 0 ? (vCompras / i.spend).toFixed(2) : '—'}\n`);
  }
  console.log(`TOTAL: gasto ${gastoTotal.toFixed(0)} CLP · valor compras ${valorTotal.toFixed(0)} CLP · ROAS ${gastoTotal ? (valorTotal / gastoTotal).toFixed(2) : '—'}`);
  console.log('\n⚠️  El ROAS de Meta es ATRIBUIDO. La verdad está en los pedidos reales (Fase 4).');
}

// ── comando: rules apply ───────────────────────────────────────────────────
// Crea reglas automáticas DENTRO de Meta (las ejecuta Meta, no un cron nuestro)
async function cmdRules() {
  console.log('⚙️  Reglas automáticas de protección\n');
  const TICKET_PROMEDIO = 25000; // CLP, punto medio del ticket 18-35k
  const reglas = [
    {
      name: 'UMI Pausar adset sin conversiones (gasto > 3x ticket)',
      evaluation_spec: {
        evaluation_type: 'SCHEDULE',
        filters: [
          { field: 'entity_type', value: 'ADSET', operator: 'EQUAL' },
          { field: 'time_preset', value: 'LIFETIME', operator: 'EQUAL' },
          { field: 'spent', value: TICKET_PROMEDIO * 3 * 100, operator: 'GREATER_THAN' },
          { field: 'results', value: 1, operator: 'LESS_THAN' }
        ]
      },
      execution_spec: { execution_type: 'PAUSE' },
      schedule_spec: { schedule_type: 'SEMI_HOURLY' }
    },
    {
      name: 'UMI Pausar anuncio con CPM disparado (>50% sobre promedio 3d)',
      evaluation_spec: {
        evaluation_type: 'SCHEDULE',
        filters: [
          { field: 'entity_type', value: 'AD', operator: 'EQUAL' },
          { field: 'time_preset', value: 'LAST_3_DAYS', operator: 'EQUAL' },
          { field: 'cpm', value: 6000 * 100, operator: 'GREATER_THAN' } // ~techo razonable CLP; ajustar con datos reales
        ]
      },
      execution_spec: { execution_type: 'PAUSE' },
      schedule_spec: { schedule_type: 'DAILY' }
    },
    {
      name: 'UMI Avisar si ROAS > 3 por 3 días (candidata a subir 20%)',
      evaluation_spec: {
        evaluation_type: 'SCHEDULE',
        filters: [
          { field: 'entity_type', value: 'CAMPAIGN', operator: 'EQUAL' },
          { field: 'time_preset', value: 'LAST_3_DAYS', operator: 'EQUAL' },
          { field: 'website_purchase_roas', value: 3, operator: 'GREATER_THAN' }
        ]
      },
      // Solo NOTIFICA: la subida de presupuesto la aprueba Adnan (y el tope manda)
      execution_spec: { execution_type: 'NOTIFICATION' },
      schedule_spec: { schedule_type: 'DAILY' }
    },
    {
      name: 'UMI Avisar frecuencia > 3 en retargeting',
      evaluation_spec: {
        evaluation_type: 'SCHEDULE',
        filters: [
          { field: 'entity_type', value: 'ADSET', operator: 'EQUAL' },
          { field: 'time_preset', value: 'LAST_7_DAYS', operator: 'EQUAL' },
          { field: 'frequency', value: 3, operator: 'GREATER_THAN' }
        ]
      },
      execution_spec: { execution_type: 'NOTIFICATION' },
      schedule_spec: { schedule_type: 'DAILY' }
    }
  ];
  for (const r of reglas) {
    await api.post(`${cfg.AD_ACCOUNT}/adrules_library`, {
      name: r.name,
      evaluation_spec: r.evaluation_spec,
      execution_spec: r.execution_spec,
      schedule_spec: r.schedule_spec,
      status: 'ENABLED'
    }, `Regla "${r.name}"`);
  }
  console.log('\nLas reglas corren DENTRO de Meta (no dependen de este computador).');
}

// ── ayuda ──────────────────────────────────────────────────────────────────
function ayuda() {
  console.log(`
umi-ads — campañas Meta de UMI Nikkei Bar (tope: ${cfg.TOPE_DIARIO_CLP} CLP/día)

  node umi-ads.js audit                        Estado de la cuenta y campañas
  node umi-ads.js create --template <clave>    Crea estructura EN PAUSA (dry-run por defecto)
                                               claves: prospeccion, retargeting, retencion, reservas
  node umi-ads.js audiences sync [--csv f.csv] Audiencias de pixel + lista hasheada
  node umi-ads.js report --days 7              Rendimiento por campaña
  node umi-ads.js rules apply                  Reglas de protección dentro de Meta

  --ejecutar    Envía de verdad (sin esta bandera, todo es simulación)
`);
}

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    if (comando === 'audit') await cmdAudit();
    else if (comando === 'create') await cmdCreate();
    else if (comando === 'audiences') await cmdAudiences();
    else if (comando === 'report') await cmdReport();
    else if (comando === 'rules') await cmdRules();
    else ayuda();
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    registrar('ERROR-CLI', e.message);
    process.exit(1);
  }
})();
