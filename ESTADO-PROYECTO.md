# 🍣 UMI NIKKEI BAR — Estado del proyecto (handoff)

> **PALABRA CLAVE PARA RETOMAR: `HOPLIX`**
> Si el usuario escribe "HOPLIX", lee este archivo completo y continúa desde aquí.
> Idioma del usuario: español (Chile). Explicar simple, no técnico.

Última actualización: 2026-06-10

---

## ✅ LO QUE YA FUNCIONA (en producción, vendiendo de verdad)

- **Web:** https://uminikkeibar.cl (y www.uminikkeibar.cl)
- **Carrito de compras** + pestaña lateral "Mi Pedido" (se abre sola al agregar productos).
- **Pago con tarjeta EMBEBIDO en la web** (Mercado Pago Brick): el cliente paga
  con su tarjeta dentro de uminikkeibar.cl, **sin login ni redirección**. Dinero REAL.
- **Aviso automático a WhatsApp de Umi** al aprobarse el pago (vía CallMeBot, server-side).
- **Registro automático del pedido en SPLEAT** (Firestore / sistema POS del restaurante).
- Pantalla "✅ ¡Pago recibido!" al cliente tras pagar.

---

## 🏗️ ARQUITECTURA

- **Repositorio (fuente de la verdad):** GitHub `Uminikkei/umi-web`
  - En este equipo está en: `~/Desktop/UMI-PARA-LAPTOP/GITHUB`
  - ⚠️ Los archivos REALES que sirve la web están en la RAÍZ: `index.html`, `script.js`, `styles.css`, carpeta `api/`.
  - ⚠️ La carpeta `umi-web/` es una versión VIEJA, NO se usa. No editar ahí.
- **Hosting:** Vercel (proyecto `umi-web`, equipo `adnan-s-projects25`).
  - Deploy automático: cada `git push` a `main` → Vercel redepliega solo.
- **Dominio:** comprado en NIC Chile, DNS gestionado en **Cloudflare**, apuntando a Vercel
  (registros CNAME a `...vercel-dns-017.com`, Proxy DNS only).
- **Backend (serverless en Vercel):**
  - `api/process-payment.js` → procesa el pago de tarjeta (Brick) y, si se aprueba,
    avisa por WhatsApp (CallMeBot) — ESTE es el que se usa.
  - `api/payment.js` → versión vieja de Checkout Pro (redirección). Ya NO se usa.

### Variables de entorno en Vercel (Settings → Environment Variables)
- `MP_ACCESS_TOKEN` = Access Token de PRODUCCIÓN de Mercado Pago (secreto, ya configurado).
- `CALLMEBOT_APIKEY` = `4370819` (apikey de CallMeBot para el WhatsApp de Umi).
- `CALLMEBOT_PHONE` (opcional) = `56961551728` (si no está, el código usa este por defecto).
- **Public Key de Mercado Pago** (producción) está en `script.js` (constante `MP_PUBLIC_KEY`),
  es pública, no es secreto.

### Datos del negocio
- WhatsApp Umi: +56 9 6155 1728 (constante `WA = 56961551728`).
- Local: Av. Costanera 5633, Coquimbo.

---

## 🔧 CÓMO TRABAJAMOS (flujo de cambios)
1. Editar los archivos en la RAÍZ del repo (`index.html`, `script.js`, `styles.css`, `api/`).
2. `git add -A && git commit -m "..." && git push origin main`
3. Vercel redepliega solo en ~1-2 min.
4. Probar en uminikkeibar.cl con **Ctrl+Shift+R** (forzar recarga, evitar caché).

---

## ⏳ PENDIENTES / PRÓXIMOS PASOS

1. **WhatsApp instantáneo y confiable** ⚠️ (lo más importante)
   - CallMeBot SÍ entrega, pero el plan gratis tiene **RETRASO de varios minutos** (~9 min observado).
   - Para un aviso INSTANTÁNEO y 100% confiable → migrar a la **API oficial de WhatsApp (Meta / Cloud API)**.
   - Requiere: un **número de teléfono dedicado** (distinto al de la app de WhatsApp de Umi) + setup en Meta.
   - Mientras tanto, el pedido llega INSTANTÁNEO a SPLEAT, así que no se pierde ninguna orden.

2. **SEGURIDAD — Rotar el Access Token de Mercado Pago** 🔒
   - El token de producción pasó por el chat. Conviene regenerarlo en Mercado Pago
     (Credenciales de producción) y actualizar `MP_ACCESS_TOKEN` en Vercel.

3. (Opcional) **Cache-busting** de `script.js` para que los clientes siempre carguen la última versión.

4. (Opcional) **Apagar GitHub Pages** (el dominio ya está en Vercel; limpieza para que no choque).

---

## 🐛 NOTAS TÉCNICAS / GOTCHAS
- **CallMeBot no acepta emojis ni acentos** → el mensaje se limpia a ASCII en `avisarWhatsApp()`.
- **CallMeBot interpreta `$3`, `$2`… como códigos** → el precio se formatea con `"$ "` (con espacio)
  para que no se coma el signo y el dígito.
- El pago con tarjeta **no se puede probar con la propia cuenta** de Mercado Pago del dueño
  ("no puedes pagarte a ti mismo") → probar con otra persona/tarjeta.
- Logs del servidor: https://vercel.com/adnan-s-projects25/umi-web/logs

---

## 📌 RESUMEN PARA RETOMAR
La web vende y cobra con tarjeta perfecto. El WhatsApp automático funciona pero con retraso (CallMeBot gratis).
El siguiente gran paso, cuando el usuario quiera, es el **WhatsApp oficial instantáneo** (necesita número dedicado),
y por seguridad **rotar el token de Mercado Pago**.
