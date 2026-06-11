// Procesa el pago de tarjeta enviado por el formulario (Mercado Pago Brick).
// El formulario tokeniza la tarjeta en el navegador; aquí solo recibimos el token
// (nunca el número real) y creamos el pago con el Access Token de producción.

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

    // Si el pago fue aprobado, avisar a Umi por WhatsApp (CallMeBot) y por Email
    if (data.status === 'approved') {
      try { await avisarWhatsApp(req.body.order); } catch (e) { console.log('[WA] error:', e.message); }
      try { await avisarEmail(req.body.order); }    catch (e) { console.log('[EMAIL] error:', e.message); }
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

  let t = '*NUEVO PEDIDO - Umi*\n\n*PAGADO CON TARJETA*\n\n*Detalle:*\n';
  items.forEach((r) => { t += `- ${r.n} x${r.qty} = ${fmt(r.p * r.qty)}\n`; });
  if (order.entregaMode === 'delivery' && order.deliveryFee > 0) {
    const sub = items.reduce((s, r) => s + r.p * r.qty, 0);
    t += `\nSubtotal: ${fmt(sub)}\nEnvio (${order.deliveryKm} km): ${fmt(order.deliveryFee)}\n*Total: ${fmt(order.total)}*\n\n`;
  } else {
    t += `\n*Total: ${fmt(order.total)}*\n\n`;
  }
  t += `*Cliente:* ${order.name || ''}\n*Tel:* ${order.phone || ''}\n*Entrega:* ${entregaLabel}\n`;
  if (order.entregaMode === 'delivery' && order.addr) {
    t += `*Direccion:* ${order.addr}\n*Maps:* https://maps.google.com/?q=${encodeURIComponent(order.addr + ', Coquimbo, Chile')}\n`;
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

  // Filas de la tabla de productos
  const filasProductos = items.map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${r.n}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${r.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(r.p * r.qty)}</td>
    </tr>`).join('');

  const mapsUrl = order.entregaMode === 'delivery' && order.addr
    ? `https://maps.google.com/?q=${encodeURIComponent(order.addr + ', Coquimbo, Chile')}`
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
        ${order.entregaMode === 'delivery' && order.deliveryFee > 0 ? `
        <tr>
          <td style="padding:6px 12px;color:#64748b">Subtotal</td>
          <td style="padding:6px 12px;text-align:right">${fmt(sub)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#64748b">Envío (${order.deliveryKm} km)</td>
          <td style="padding:6px 12px;text-align:right">${fmt(order.deliveryFee)}</td>
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
      from: 'Umi Pedidos <onboarding@resend.dev>',
      to: ['umirestaurantcl@gmail.com'],
      subject: `🛎️ Nuevo pedido — ${order.name || 'Cliente'} · ${fmt(order.total)}`,
      html
    })
  });

  const data = await res.json();
  console.log('[EMAIL] Resend respondió:', JSON.stringify(data).slice(0, 200));
}
