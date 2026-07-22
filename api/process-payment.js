// Procesa el pago de tarjeta enviado por el formulario (Mercado Pago Brick).
// El formulario tokeniza la tarjeta en el navegador; aquí solo recibimos el token
// (nunca el número real) y creamos el pago con el Access Token de producción.

import { construirUserData, enviarEventoMeta, slugProducto } from './_meta.js';

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Configuración de pago no disponible' });
  }

  try {
    const { token, payment_method_id, issuer_id, installments, payer, monto, descripcion } = req.body || {};

    if (!token || !monto) {
      return res.status(400).json({ error: 'Datos de pago incompletos' });
    }

    const body = {
      transaction_amount: Math.round(Number(monto)),
      token,
      description: descripcion || 'Pedido Umi Nikkei Bar',
      installments: Number(installments) || 1,
      payment_method_id,
      payer: {
        email: (payer && payer.email) || 'cliente@uminikkeibar.cl'
      }
    };
    if (issuer_id) body.issuer_id = issuer_id;
    if (payer && payer.identification && payer.identification.number) {
      body.payer.identification = payer.identification;
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}`
      },
      body: JSON.stringify(body)
    });

    const data = await mpRes.json();
    console.log('[PAGO] status=', data.status, 'detail=', data.status_detail);

    // Si el pago fue aprobado, avisar a Umi por Telegram (instantáneo), WhatsApp (CallMeBot) y Email
    if (data.status === 'approved') {
      console.log('[ORDER] recibido:', JSON.stringify(req.body.order || {}).slice(0, 500));
      try { await avisarTelegram(req.body.order); } catch (e) { console.log('[TG] error:', e.message); }
      try { await avisarWhatsApp(req.body.order); } catch (e) { console.log('[WA] error:', e.message); }
      try { await avisarEmail(req.body.order); }    catch (e) { console.log('[EMAIL] error:', e.message); }
      // Meta Conversions API: la compra se reporta DESDE EL SERVIDOR (no depende
      // del navegador del cliente). Deduplica con el pixel vía meta.event_id.
      try { await avisarMetaPurchase(req, data); } catch (e) { console.log('[META] error:', e.message); }
    }

    return res.status(200).json({
      status: data.status,
      status_detail: data.status_detail,
      id: data.id,
      error: data.message
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ── Meta Conversions API: evento Purchase server-side ───────────────────────────
// Se dispara SOLO cuando Mercado Pago aprueba el pago. El valor reportado es el
// TOTAL REAL COBRADO (neto: después de cupones y puntos, incluye envío), porque
// es la plata que efectivamente entra — así el ROAS de Meta refleja ingresos reales.
async function avisarMetaPurchase(req, mpData) {
  const order = req.body.order || {};
  const meta = req.body.meta || {}; // atribución que manda el navegador (event_id, fbp, fbc, email, uid)
  const items = Array.isArray(order.items) ? order.items : [];

  const evento = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    // Mismo event_id que usa el pixel en el navegador → Meta deduplica.
    // Respaldo: si el front no mandó uno (caché vieja), usamos el id del pago.
    event_id: String(meta.event_id || ('mp-' + mpData.id)),
    action_source: 'website',
    event_source_url: String(meta.event_source_url || 'https://uminikkeibar.cl/'),
    user_data: construirUserData({
      email: meta.email || (req.body.payer && req.body.payer.email),
      phone: order.phone,
      name: order.name,
      external_id: meta.uid,
      fbp: meta.fbp,
      fbc: meta.fbc
    }, req),
    custom_data: {
      value: Math.max(0, Math.round(Number(order.total) || 0)),
      currency: 'CLP',
      order_id: String(mpData.id || ''),
      content_type: 'product',
      contents: items.map(i => ({ id: slugProducto(i.n), quantity: Number(i.qty) || 1, item_price: Number(i.p) || 0 })),
      num_items: items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
    }
  };
  await enviarEventoMeta(evento);
}

// ── Aviso automático a Umi por Telegram (instantáneo y gratis) ──────────────────
async function avisarTelegram(order) {
  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  console.log('[TG] token?', !!TOKEN, 'chat?', !!CHAT_ID, 'order?', !!order);
  if (!TOKEN || !CHAT_ID || !order) return; // si no está configurado, no hace nada

  const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  // Escapar caracteres que rompen el HTML de Telegram (parse_mode=HTML)
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const entregaLabel = order.entregaMode === 'delivery' ? '🛵 Delivery' : '🏠 Retiro en local';
  const items = Array.isArray(order.items) ? order.items : [];

  const sub = items.reduce((s, r) => s + r.p * r.qty, 0);
  const hasDelivery = order.entregaMode === 'delivery' && order.deliveryFee > 0;
  const pts  = Number(order.puntosCanjeados) || 0;
  const cuponPct = Number(order.cuponPct) || 0;
  // Descuento: usar el que manda la web; si no vino (script viejo en cache),
  // deducirlo de la diferencia entre subtotal+envio y el total cobrado
  const esperado = sub + (hasDelivery ? (Number(order.deliveryFee) || 0) : 0);
  const desc = (Number(order.descuento) || 0) > 0
    ? Number(order.descuento)
    : Math.max(0, esperado - (Number(order.total) || 0) - pts);

  let t = '🛎️ <b>NUEVO PEDIDO — Umi</b>\n💳 <b>PAGADO CON TARJETA</b>\n\n<b>Detalle:</b>\n';
  items.forEach((r) => { t += `• ${esc(r.n)} x${r.qty} = ${fmt(r.p * r.qty)}\n`; });
  if (hasDelivery || desc > 0 || pts > 0) {
    t += `\nSubtotal: ${fmt(sub)}\n`;
    if (hasDelivery) t += `Envío (${esc(order.deliveryKm)} km): ${fmt(order.deliveryFee)}\n`;
    if (desc > 0)    t += `🏷️ Descuento${cuponPct ? ` (${cuponPct}%)` : ''}: -${fmt(desc)}\n`;
    if (pts > 0)     t += `★ Puntos canjeados: -${fmt(pts)}\n`;
    t += `<b>Total: ${fmt(order.total)}</b>\n\n`;
  } else {
    t += `\n<b>Total: ${fmt(order.total)}</b>\n\n`;
  }
  t += `👤 <b>Cliente:</b> ${esc(order.name)}\n📞 <b>Tel:</b> ${esc(order.phone)}\n📦 <b>Entrega:</b> ${entregaLabel}\n`;
  if (order.entregaMode === 'delivery' && order.addr) {
    const mapsLink = (order.lat && order.lng)
      ? `https://maps.google.com/?q=${order.lat},${order.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(order.addr + ', Coquimbo, Chile')}`;
    t += `📍 <b>Dirección:</b> ${esc(order.addr)}\n🗺️ <a href="${mapsLink}">Ver en Google Maps</a>\n`;
  }
  if (order.notes) t += `📝 <b>Notas:</b> ${esc(order.notes)}\n`;

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: t,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  const body = await r.text();
  console.log('[TG] Telegram respondió:', body.slice(0, 200));
}

// ── Aviso automático a Umi por WhatsApp (CallMeBot) ─────────────────────────────
async function avisarWhatsApp(order) {
  const APIKEY = process.env.CALLMEBOT_APIKEY;
  const PHONE  = process.env.CALLMEBOT_PHONE || '56961551728';
  console.log('[WA] apikey?', !!APIKEY, 'order?', !!order);
  if (!APIKEY || !order) return; // si no está configurado, no hace nada

  // Nota: se usa "$ " con espacio porque CallMeBot interpreta "$3" como un código y borra el "$" + dígito
  const fmt = (n) => '$ ' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const entregaLabel = order.entregaMode === 'delivery' ? 'Delivery' : 'Retiro en local';
  const items = Array.isArray(order.items) ? order.items : [];

  const sub = items.reduce((s, r) => s + r.p * r.qty, 0);
  const hasDelivery = order.entregaMode === 'delivery' && order.deliveryFee > 0;
  const pts  = Number(order.puntosCanjeados) || 0;
  const cuponPct = Number(order.cuponPct) || 0;
  // Descuento: usar el que manda la web; si no vino (script viejo en cache),
  // deducirlo de la diferencia entre subtotal+envio y el total cobrado
  const esperado = sub + (hasDelivery ? (Number(order.deliveryFee) || 0) : 0);
  const desc = (Number(order.descuento) || 0) > 0
    ? Number(order.descuento)
    : Math.max(0, esperado - (Number(order.total) || 0) - pts);

  let t = '*NUEVO PEDIDO - Umi*\n\n*PAGADO CON TARJETA*\n\n*Detalle:*\n';
  items.forEach((r) => { t += `- ${r.n} x${r.qty} = ${fmt(r.p * r.qty)}\n`; });
  if (hasDelivery || desc > 0 || pts > 0) {
    t += `\nSubtotal: ${fmt(sub)}\n`;
    if (hasDelivery) t += `Envio (${order.deliveryKm} km): ${fmt(order.deliveryFee)}\n`;
    if (desc > 0)    t += `Descuento${cuponPct ? ` (${cuponPct}%)` : ''}: -${fmt(desc)}\n`;
    if (pts > 0)     t += `Puntos canjeados: -${fmt(pts)}\n`;
    t += `*Total: ${fmt(order.total)}*\n\n`;
  } else {
    t += `\n*Total: ${fmt(order.total)}*\n\n`;
  }
  t += `*Cliente:* ${order.name || ''}\n*Tel:* ${order.phone || ''}\n*Entrega:* ${entregaLabel}\n`;
  if (order.entregaMode === 'delivery' && order.addr) {
    const mapsLink = (order.lat && order.lng)
      ? `https://maps.google.com/?q=${order.lat},${order.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(order.addr + ', Coquimbo, Chile')}`;
    t += `*Direccion:* ${order.addr}\n*Maps:* ${mapsLink}\n`;
  }
  t += `*Pago:* Tarjeta (pagado online)\n`;
  if (order.notes) t += `*Notas:* ${order.notes}\n`;

  // CallMeBot no acepta emojis ni acentos: limpiar a ASCII para que SIEMPRE llegue
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x00-\x7F]/g, '');

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(PHONE)}&text=${encodeURIComponent(t)}&apikey=${encodeURIComponent(APIKEY)}`;
  const r = await fetch(url);
  const body = await r.text();
  console.log('[WA] CallMeBot respondió:', body.slice(0, 200));
}

// ── Aviso automático a Umi por Email (Resend) ────────────────────────────────
async function avisarEmail(order) {
  const APIKEY = process.env.RESEND_API_KEY;
  if (!APIKEY || !order) return;

  const fmt = (n) => '$ ' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const entregaLabel = order.entregaMode === 'delivery' ? '🛵 Delivery' : '🏠 Retiro en local';
  const items = Array.isArray(order.items) ? order.items : [];
  const sub = items.reduce((s, r) => s + r.p * r.qty, 0);
  const hasDelivery = order.entregaMode === 'delivery' && order.deliveryFee > 0;
  const pts  = Number(order.puntosCanjeados) || 0;
  const cuponPct = Number(order.cuponPct) || 0;
  // Descuento: usar el que manda la web; si no vino (script viejo en cache),
  // deducirlo de la diferencia entre subtotal+envio y el total cobrado
  const esperado = sub + (hasDelivery ? (Number(order.deliveryFee) || 0) : 0);
  const desc = (Number(order.descuento) || 0) > 0
    ? Number(order.descuento)
    : Math.max(0, esperado - (Number(order.total) || 0) - pts);

  // Filas de la tabla de productos
  const filasProductos = items.map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${r.n}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${r.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(r.p * r.qty)}</td>
    </tr>`).join('');

  // Si hay coordenadas GPS exactas las usamos, si no usamos la dirección de texto
  const mapsUrl = order.entregaMode === 'delivery'
    ? (order.lat && order.lng
        ? `https://maps.google.com/?q=${order.lat},${order.lng}`
        : order.addr ? `https://maps.google.com/?q=${encodeURIComponent(order.addr + ', Coquimbo, Chile')}` : null)
    : null;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f7f9fc;font-family:Arial,sans-serif">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:#0d1b3e;padding:24px 32px;text-align:center">
      <h1 style="margin:0;color:#62CAE3;font-size:28px;letter-spacing:4px">UMI</h1>
      <p style="margin:4px 0 0;color:#f0ebe0;font-size:13px">NIKKEI BAR · COQUIMBO</p>
    </div>

    <!-- Titulo -->
    <div style="background:#62CAE3;padding:14px 32px;text-align:center">
      <h2 style="margin:0;color:#0d1b3e;font-size:18px">🛎️ NUEVO PEDIDO — PAGO CON TARJETA ✅</h2>
    </div>

    <div style="padding:28px 32px">

      <!-- Cliente -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:110px">Cliente</td>
          <td style="padding:6px 0;font-weight:bold;font-size:15px">${order.name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px">Teléfono</td>
          <td style="padding:6px 0;font-size:15px">
            <a href="tel:${order.phone || ''}" style="color:#0d1b3e;text-decoration:none;font-weight:bold">${order.phone || '—'}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px">Entrega</td>
          <td style="padding:6px 0;font-size:15px;font-weight:bold">${entregaLabel}</td>
        </tr>
        ${order.entregaMode === 'delivery' && order.addr ? `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top">Dirección</td>
          <td style="padding:6px 0;font-size:15px;font-weight:bold">${order.addr}</td>
        </tr>` : ''}
        ${order.notes ? `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top">Notas</td>
          <td style="padding:6px 0;font-size:14px;color:#dc2626">${order.notes}</td>
        </tr>` : ''}
      </table>

      ${mapsUrl ? `
      <!-- Botón Google Maps -->
      <div style="text-align:center;margin-bottom:24px">
        <a href="${mapsUrl}" target="_blank"
           style="display:inline-block;background:#34a853;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold">
          📍 Ver en Google Maps
        </a>
      </div>` : ''}

      <!-- Productos -->
      <h3 style="margin:0 0 10px;color:#0d1b3e;font-size:15px;border-bottom:2px solid #62CAE3;padding-bottom:6px">Detalle del pedido</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px 12px;text-align:left;color:#64748b">Producto</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b">Cant.</th>
            <th style="padding:8px 12px;text-align:right;color:#64748b">Precio</th>
          </tr>
        </thead>
        <tbody>${filasProductos}</tbody>
      </table>

      <!-- Totales -->
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px">
        ${(hasDelivery || desc > 0 || pts > 0) ? `
        <tr>
          <td style="padding:6px 12px;color:#64748b">Subtotal</td>
          <td style="padding:6px 12px;text-align:right">${fmt(sub)}</td>
        </tr>` : ''}
        ${hasDelivery ? `
        <tr>
          <td style="padding:6px 12px;color:#64748b">Envío (${order.deliveryKm} km)</td>
          <td style="padding:6px 12px;text-align:right">${fmt(order.deliveryFee)}</td>
        </tr>` : ''}
        ${desc > 0 ? `
        <tr>
          <td style="padding:6px 12px;color:#16a34a">🏷️ Descuento${cuponPct ? ` (${cuponPct}%)` : ''}</td>
          <td style="padding:6px 12px;text-align:right;color:#16a34a">-${fmt(desc)}</td>
        </tr>` : ''}
        ${pts > 0 ? `
        <tr>
          <td style="padding:6px 12px;color:#16a34a">★ Puntos canjeados</td>
          <td style="padding:6px 12px;text-align:right;color:#16a34a">-${fmt(pts)}</td>
        </tr>` : ''}
        <tr style="background:#0d1b3e;color:#62CAE3">
          <td style="padding:10px 12px;font-weight:bold;font-size:16px;border-radius:6px 0 0 6px">TOTAL PAGADO</td>
          <td style="padding:10px 12px;text-align:right;font-weight:bold;font-size:16px;border-radius:0 6px 6px 0">${fmt(order.total)}</td>
        </tr>
      </table>

      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        Pago procesado con tarjeta · Mercado Pago · uminikkeibar.cl
      </p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIKEY}`
    },
    body: JSON.stringify({
      from: 'Umi Pedidos <pedidos@uminikkeibar.cl>',
      to: ['umirestaurantcl@gmail.com'],
      subject: `🛎️ Nuevo pedido — ${order.name || 'Cliente'} · ${fmt(order.total)}`,
      html
    })
  });

  const data = await res.json();
  console.log('[EMAIL] Resend respondió:', JSON.stringify(data).slice(0, 200));
}
