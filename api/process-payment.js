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
