// Lee estadísticas de Google Analytics (GA4 Data API) con la cuenta de servicio.
// Las credenciales viven solo en el servidor (env vars de Vercel), nunca en el navegador.
const crypto = require('crypto');

const PROPERTY_ID = process.env.GA_PROPERTY_ID;

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJWT(sa) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const input = header + '.' + claims;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(input);
  const sig = signer.sign(sa.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return input + '.' + sig;
}

async function getAccessToken(sa) {
  const jwt = signJWT(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('token: ' + JSON.stringify(data).slice(0, 200));
  return data.access_token;
}

module.exports = async function handler(req, res) {
  try {
    if (!PROPERTY_ID || !process.env.GA_SA_JSON) {
      return res.status(500).json({ error: 'Analytics no configurado' });
    }
    let sa;
    try { sa = JSON.parse(process.env.GA_SA_JSON); }
    catch (e) { return res.status(500).json({ error: 'GA_SA_JSON inválido (no es JSON completo)' }); }
    if (!sa.client_email || !sa.private_key) {
      return res.status(500).json({ error: 'GA_SA_JSON sin client_email/private_key' });
    }

    const token = await getAccessToken(sa);

    const range = [{ startDate: '30daysAgo', endDate: 'today' }];
    const body = {
      requests: [
        // 0) Resumen 30 días
        { dateRanges: range, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] },
        // 1) Usuarios por día
        { dateRanges: range, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 40 },
        // 2) De dónde entran (canal)
        { dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
        // 3) Dispositivos
        { dateRanges: range, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 5 },
        // 4) Ciudades
        { dateRanges: range, dimensions: [{ name: 'city' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 6 }
      ]
    };

    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:batchRunReports`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: 'GA API', detail: data });

    const reps = data.reports || [];
    const num = (v) => Math.round(Number(v) || 0);

    // 0) Resumen
    const sumRow = (reps[0].rows && reps[0].rows[0]) ? reps[0].rows[0].metricValues : [];
    const summary = {
      users: num(sumRow[0] && sumRow[0].value),
      sessions: num(sumRow[1] && sumRow[1].value),
      views: num(sumRow[2] && sumRow[2].value)
    };

    // 1) Por día
    const byDate = (reps[1].rows || []).map(row => ({
      date: row.dimensionValues[0].value,        // YYYYMMDD
      users: num(row.metricValues[0].value)
    }));

    // helper dimensión->valor
    const mapRows = (rep) => (rep.rows || []).map(row => ({
      label: row.dimensionValues[0].value || '(sin dato)',
      value: num(row.metricValues[0].value)
    }));

    const channels = mapRows(reps[2]);
    const devices = mapRows(reps[3]);
    const cities = mapRows(reps[4]).filter(c => c.label && c.label !== '(not set)');

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ summary, byDate, channels, devices, cities });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
