// Función serverless de Vercel para crear pagos con Mercado Pago.
// Se ejecuta en el servidor (NO en el navegador), por eso el token está seguro aquí.

// El token se lee SOLO desde la variable de entorno de Vercel (MP_ACCESS_TOKEN).
// Nunca se escribe en el código porque el repositorio es público.
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  if (!ACCESS_TOKEN) {
    return res.status(500).json({ success: false, error: 'Configuración de pago no disponible' });
  }

  try {
    const { monto, nombre, telefono, direccion, notas } = req.body || {};

    if (!monto || !nombre || !telefono) {
      return res.status(400).json({ success: false, error: 'Faltan datos del pedido' });
    }

    const origin = `https://${req.headers.host}`;

    const preference = {
      items: [{
        title: `Pedido Umi - ${nombre}`,
        description: notas || 'Pedido Umi Nikkei Bar',
        quantity: 1,
        unit_price: Math.round(Number(monto)),
        currency_id: 'CLP'
      }],
      payer: {
        name: nombre,
        phone: { area_code: '56', number: String(telefono) },
        address: { street_name: direccion || 'Retiro en local' }
      },
      back_urls: {
        success: `${origin}/?pago=ok`,
        failure: `${origin}/?pago=error`,
        pending: `${origin}/?pago=pendiente`
      },
      auto_return: 'approved',
      external_reference: `${Date.now()}-${nombre}`
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(preference)
    });

    const data = await mpRes.json();

    if (data.init_point) {
      return res.status(200).json({ success: true, url: data.init_point, id: data.id });
    }

    return res.status(400).json({
      success: false,
      error: data.message || 'No se pudo crear el pago'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
