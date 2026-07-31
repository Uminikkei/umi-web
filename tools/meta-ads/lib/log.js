// Registro local de toda operación ejecutada, con timestamp.
// Los archivos quedan en tools/meta-ads/logs/ (ignorado por git).

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'logs');

function registrar(tipo, detalle) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  const fecha = new Date();
  const archivo = path.join(DIR, fecha.toISOString().slice(0, 10) + '.log');
  const linea = `[${fecha.toISOString()}] ${tipo}: ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}\n`;
  fs.appendFileSync(archivo, linea);
}

module.exports = { registrar };
