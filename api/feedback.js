// Recibe comentarios y reclamos del formulario web y los envía por email
// al correo de Umi usando Resend (misma API key de los avisos de pedidos).

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const APIKEY = process.env.RESEND_API_KEY;
  if (!APIKEY) {
    return res.status(500).json({ error: 'Servicio de correo no configurado' });
  }

  try {
    const body = req.body || {};
    const nombre = String(body.nombre || '').trim().slice(0, 80);
    const correo = String(body.correo || '').trim().slice(0, 120);
    const mensaje = String(body.mensaje || '').trim().slice(0, 500);

    if (!nombre || !correo || !mensaje) {
      return res.status(400).json({ error: 'Completa nombre, correo y mensaje' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f7f9fc;font-family:Arial,sans-serif">
  <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:#0d1b3e;padding:24px 32px;text-align:center">
      <h1 style="margin:0;color:#62CAE3;font-size:28px;letter-spacing:4px">UMI</h1>
      <p style="margin:4px 0 0;color:#f0ebe0;font-size:13px">NIKKEI BAR · COQUIMBO</p>
    </div>
    <div style="background:#62CAE3;padding:14px 32px;text-align:center">
      <h2 style="margin:0;color:#0d1b3e;font-size:18px">💬 Comentario / Reclamo desde la web</h2>
    </div>
    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:90px">Nombre</td>
          <td style="padding:6px 0;font-weight:bold;font-size:15px">${esc(nombre)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px">Correo</td>
          <td style="padding:6px 0;font-size:15px"><a href="mailto:${esc(correo)}" style="color:#0d1b3e;font-weight:bold">${esc(correo)}</a></td>
        </tr>
      </table>
      <h3 style="margin:0 0 10px;color:#0d1b3e;font-size:15px;border-bottom:2px solid #62CAE3;padding-bottom:6px">Mensaje</h3>
      <p style="font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap">${esc(mensaje)}</p>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        Enviado desde el formulario de comentarios · uminikkeibar.cl
      </p>
    </div>
  </div>
</body>
</html>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIKEY}`
      },
      body: JSON.stringify({
        from: 'Umi Web <pedidos@uminikkeibar.cl>',
        to: ['umirestaurantcl@gmail.com'],
        reply_to: correo,
        subject: `💬 Comentario/Reclamo — ${nombre}`,
        html
      })
    });

    const data = await r.json();
    console.log('[FEEDBACK] Resend respondió:', JSON.stringify(data).slice(0, 200));
    if (!r.ok) {
      return res.status(500).json({ error: 'No se pudo enviar el mensaje' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[FEEDBACK] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
