// Endpoint público que recibe eventos del navegador y los reenvía a la
// Conversions API de Meta con la PII hasheada (ver api/_meta.js).
//
// IMPORTANTE: "Purchase" NO se acepta por esta vía. La compra solo la envía
// el servidor desde api/process-payment.js cuando Mercado Pago aprueba el
// pago — así nadie puede fabricar compras falsas llamando a este endpoint.

const { construirUserData, enviarEventoMeta } = require('./_meta.js');

// Eventos que el navegador tiene permitido reportar
const EVENTOS_PERMITIDOS = new Set([
  'Lead', 'Contact', 'ViewContent', 'AddToCart',
  'InitiateCheckout', 'AddPaymentInfo', 'CompleteRegistration', 'Schedule'
]);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const b = req.body || {};
    const nombre = String(b.event_name || '');
    if (!EVENTOS_PERMITIDOS.has(nombre)) {
      // Respondemos 200 igual para no dar pistas a bots
      return res.status(200).json({ ok: true });
    }

    // custom_data saneado: solo campos conocidos, tipos correctos
    const cd = b.custom_data || {};
    const custom = {};
    if (cd.value != null && isFinite(Number(cd.value))) custom.value = Math.round(Number(cd.value));
    custom.currency = 'CLP';
    if (cd.content_name) custom.content_name = String(cd.content_name).slice(0, 120);
    if (cd.content_category) custom.content_category = String(cd.content_category).slice(0, 120);
    if (cd.content_type) custom.content_type = String(cd.content_type).slice(0, 40);
    if (Array.isArray(cd.content_ids)) custom.content_ids = cd.content_ids.slice(0, 50).map(String);
    if (Array.isArray(cd.contents)) {
      custom.contents = cd.contents.slice(0, 50).map(c => ({
        id: String(c.id || ''), quantity: Number(c.quantity) || 1, item_price: Number(c.item_price) || 0
      }));
    }
    if (cd.num_items != null) custom.num_items = Number(cd.num_items) || 0;
    if (cd.status != null) custom.status = !!cd.status;

    const u = b.user_data || {};
    const evento = {
      event_name: nombre,
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(b.event_id || '').slice(0, 64) || undefined,
      action_source: 'website',
      event_source_url: String(b.event_source_url || 'https://uminikkeibar.cl/').slice(0, 500),
      user_data: construirUserData({
        email: u.email, phone: u.phone, name: u.name, external_id: u.external_id,
        fbp: b.fbp, fbc: b.fbc
      }, req),
      custom_data: custom
    };

    await enviarEventoMeta(evento);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.log('[META] meta-capi error:', e.message);
    return res.status(200).json({ ok: true }); // nunca romper la web por tracking
  }
};
