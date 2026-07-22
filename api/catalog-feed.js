// Feed de catálogo Meta (CSV) — Fase 2 del sistema de marketing.
// Se sirve en /catalog/umi-feed.csv (rewrite en vercel.json → esta función).
//
// Fuente de verdad: el script.js DESPLEGADO en producción. Esta función lo
// descarga, extrae MENU / SPLEAT_PHOTOS / PHOTO_OVERRIDES / SPLEAT_DESC y arma
// el CSV al vuelo → el feed SIEMPRE refleja el menú vigente, sin regenerar nada
// a mano. Meta lo descarga en forma programada (diaria) desde Commerce Manager.
//
// Los `id` del feed usan slugProducto() — la MISMA función que usa el pixel
// para content_ids (umiSlug en script.js). Si no coinciden, el retargeting
// dinámico no funciona.

const { slugProducto } = require('./_meta.js');

const SITIO = 'https://www.uminikkeibar.cl';

// Categorías que NO van al catálogo:
// - Alcohol: la web ya no lo vende online (script.js los elimina del MENU web),
//   y además los anuncios de alcohol tienen restricciones de política en Meta.
// - Adicionales: son agregados (salsas, arroz extra), no productos anunciables.
// Mantener en sincronía con la lista de exclusión de script.js (~línea 224).
const CATEGORIAS_EXCLUIDAS = new Set([
  'Coctelería Clásica', 'Coctelería de Autor', 'Mundo Mojito',
  'Piscos', 'Whisky', 'Gin', 'Ron', 'Vodka', 'Tequila',
  'Licores', 'Vinos', 'Vermut', 'Espumantes', 'Cervezas',
  'Adicionales'
]);
const PLATOS_EXCLUIDOS = new Set(['Niku ramen']); // fuera de carta web (script.js ~línea 228)

// Extrae un objeto literal `const NOMBRE = {...}` del texto de script.js,
// balanceando llaves y respetando strings (los valores traen { } a veces no,
// pero mejor prevenir).
function extraerObjeto(texto, nombreConst) {
  const marca = 'const ' + nombreConst + ' = {';
  const inicio = texto.indexOf(marca);
  if (inicio === -1) return null;
  let i = inicio + marca.length - 1; // apunta a la "{"
  let nivel = 0, enString = false, escape = false, comilla = '';
  for (; i < texto.length; i++) {
    const c = texto[i];
    if (enString) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === comilla) enString = false;
      continue;
    }
    if (c === '"' || c === "'") { enString = true; comilla = c; continue; }
    if (c === '{') nivel++;
    else if (c === '}') { nivel--; if (nivel === 0) break; }
  }
  return texto.slice(inicio + marca.length - 1, i + 1);
}

// Título visible: mismas reglas que dishName() en script.js
const SUFIJOS = { 'Chicken Katsu': ' (Pollo)', 'Sakana Furai': ' (Pescado)' };
function titulo(nombre) {
  const tc = String(nombre).replace(/(^|[\s(])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase());
  return tc.replace(/\bpzs\b/gi, 'uds') + (SUFIJOS[nombre] || '');
}

// Campo CSV escapado (comillas, comas y saltos de línea)
function campo(v) {
  v = String(v == null ? '' : v).replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

module.exports = async function handler(req, res) {
  try {
    const r = await fetch(SITIO + '/script.js', { headers: { 'User-Agent': 'umi-feed-builder' } });
    if (!r.ok) throw new Error('No se pudo leer script.js: ' + r.status);
    const js = await r.text();

    const MENU = JSON.parse(extraerObjeto(js, 'MENU'));
    const FOTOS = JSON.parse(extraerObjeto(js, 'SPLEAT_PHOTOS') || '{}');
    const DESC = JSON.parse(extraerObjeto(js, 'SPLEAT_DESC') || '{}');
    // PHOTO_OVERRIDES usa comillas simples y comentarios → extraer pares con regex
    const OVERRIDES = {};
    const bloqueOv = extraerObjeto(js, 'PHOTO_OVERRIDES') || '';
    for (const m of bloqueOv.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) OVERRIDES[m[1]] = m[2];

    const encabezado = ['id','title','description','availability','condition','price','link','image_link','brand','product_type','google_product_category'];
    const filas = [encabezado.join(',')];
    let incluidos = 0, sinFoto = 0;

    for (const [cat, items] of Object.entries(MENU)) {
      if (CATEGORIAS_EXCLUIDAS.has(cat)) continue;
      const esBebida = (cat === 'Bebidas' || cat === 'Café & Calientes');
      const gcat = esBebida
        ? 'Food, Beverages & Tobacco > Beverages'
        : 'Food, Beverages & Tobacco > Food Items > Prepared Foods';
      for (const item of items) {
        if (PLATOS_EXCLUIDOS.has(item.n)) continue;
        // Foto: primero la local optimizada, si no la de SPLEAT; sin foto no
        // se puede anunciar → el ítem se omite del feed (Meta lo rechazaría igual)
        let img = OVERRIDES[item.n]
          ? SITIO + '/' + OVERRIDES[item.n]
          : (FOTOS[item.n] || null);
        if (img && /\.mp4(\?|$)/.test(img)) img = null; // un video no sirve como imagen
        if (!img) { sinFoto++; continue; }

        const id = slugProducto(item.n);
        const desc = (DESC[item.n] || `${titulo(item.n)} — cocina Nikkei de UMI, frente al mar de Coquimbo.`);
        // Deep link: abre la ficha del plato en la web + UTM para atribución
        const link = `${SITIO}/?plato=${encodeURIComponent(id)}&utm_source=facebook&utm_medium=catalogo&utm_campaign=catalog_ads`;

        filas.push([
          campo(id), campo(titulo(item.n)), campo(desc),
          'in stock', 'new', campo(Math.round(item.p) + ' CLP'),
          campo(link), campo(img), campo('UMI Nikkei Bar'),
          campo(cat), campo(gcat)
        ].join(','));
        incluidos++;
      }
    }

    console.log(`[FEED] generado: ${incluidos} productos, ${sinFoto} omitidos por falta de foto`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    // Cache en el edge de Vercel: 1 hora fresco + 1 día sirviendo mientras revalida
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(filas.join('\r\n'));
  } catch (e) {
    console.log('[FEED] error:', e.message);
    return res.status(500).send('error generando feed');
  }
};
