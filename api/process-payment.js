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

    // Si el pago fue aprobado, avisar a Umi por WhatsApp AUTOMÁTICAMENTE (CallMeBot)
    if (data.status === 'approved') {
      try { await avisarWhatsApp(req.body.order); } catch (e) { console.log('[WA] error:', e.message); }
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
