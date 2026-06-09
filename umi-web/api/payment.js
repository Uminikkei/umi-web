const https = require('https');

const ACCESS_TOKEN = 'APP_USR-4798756519847293-060820-25839129f3280e0df182b99373fcd527-3458884731';
const MP_API_URL = 'https://api.mercadopago.com';

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { monto, nombre, telefono, direccion, notas } = req.body;

    // Validar datos
    if (!monto || !nombre || !telefono) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Crear preference en Mercado Pago
    const preference = {
      items: [
        {
          title: `Pedido de ${nombre}`,
          description: notas || 'Pedido de Umi Nikkei Bar',
          quantity: 1,
          unit_price: parseInt(monto),
          currency_id: 'CLP'
        }
      ],
      payer: {
        name: nombre,
        phone: {
          area_code: '+56',
          number: telefono
        },
        address: {
          street_name: direccion || 'No especificado'
        }
      },
      back_urls: {
        success: 'https://uminikkeibar.cl',
        failure: 'https://uminikkeibar.cl',
        pending: 'https://uminikkeibar.cl'
      },
      auto_return: 'approved',
      notification_url: 'https://uminikkeibar.cl/webhook',
      external_reference: `${Date.now()}-${nombre}`,
      expires: false
    };

    // Enviar a Mercado Pago
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: '/checkout/preferences',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    };

    return new Promise((resolve, reject) => {
      const mpReq = https.request(options, (mpRes) => {
        let data = '';

        mpRes.on('data', (chunk) => {
          data += chunk;
        });

        mpRes.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.init_point) {
              // Éxito
              resolve(res.status(200).json({
                success: true,
                url: response.init_point,
                id: response.id
              }));
            } else {
              // Error de Mercado Pago
              resolve(res.status(400).json({
                success: false,
                error: response.message || 'Error al crear el pago'
              }));
            }
          } catch (e) {
            resolve(res.status(500).json({
              success: false,
              error: 'Error procesando respuesta'
            }));
          }
        });
      });

      mpReq.on('error', (error) => {
        resolve(res.status(500).json({
          success: false,
          error: error.message
        }));
      });

      mpReq.write(JSON.stringify(preference));
      mpReq.end();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
