# 📊 TRACKING.md — Sistema de medición Meta (Pixel + Conversions API)

> Fase 1 del sistema de marketing de UMI Nikkei Bar. Implementado 2026-07-22.
> Pixel/Dataset ID: `1824016048566069` · Dataset "Umi web" · Portfolio "UMI Nikkei Bar"

---

## Arquitectura en una frase

El **Meta Pixel** (navegador) mide el recorrido del cliente, y la **Conversions API**
(servidor, Vercel) reporta lo crítico — la **compra** — desde `api/process-payment.js`
cuando Mercado Pago aprueba el pago, con **deduplicación por `event_id`** para que
Meta nunca cuente doble.

```
Navegador                              Servidor (Vercel)
─────────                              ─────────────────
fbq PageView/ViewContent/AddToCart…
fbq Purchase (event_id: X) ──┐
                             ├─ Meta deduplica por event_id
POST /api/process-payment ───┘
  · MP aprueba el pago
  · CAPI Purchase (event_id: X)  ← nunca depende del navegador
```

## Mapa de eventos

| Evento | Dónde se dispara | Vía | Parámetros clave |
|---|---|---|---|
| `PageView` | `index.html` (head) | Pixel | — |
| `ViewContent` | `script.js → openProductModal()` | Pixel | content_ids, value, currency |
| `AddToCart` | `script.js → addToCart()` (menú, buscador, modal, chatbot) | Pixel | content_ids, contents, value |
| `InitiateCheckout` | `script.js → openCheckout()` | Pixel | value, num_items, contents |
| `AddPaymentInfo` | `script.js → renderCardBrick()` callback `onReady` | Pixel | value |
| `Purchase` ⭐ | `api/process-payment.js` cuando MP responde `approved` | **CAPI (servidor)** + Pixel espejo | value NETO, order_id (id de pago MP), contents |
| `CompleteRegistration` | `auth.js → umiCompleteProfile()` (solo registro nuevo) | Pixel | content_name: umi_rewards |
| `Lead` | Click en links de WhatsApp con texto "reservar" | Pixel + CAPI | content_name: reserva_whatsapp |
| `Contact` | Click en links wa.me de pedido + `sendOrder()` (pedidos efectivo/transferencia) | Pixel + CAPI | content_name: pedido_whatsapp, value |

**No tienen pixel** (a propósito, para no contaminar audiencias): `panel.html` (admin),
`pedidos/` (app interna del personal), `qr.html`.

## Decisiones documentadas

1. **Valor del Purchase = total real cobrado (neto)**: después de cupones y canje de
   puntos, incluyendo el costo de envío. Es la plata que efectivamente entra, así el
   ROAS que reporta Meta es ROAS de verdad. (Campo `order.total` que ya calculaba la web.)
2. **`content_ids` = slug del nombre del plato** (`umiSlug()` en script.js ≡
   `slugProducto()` en api/_meta.js). Ej: "Pulpo nikkei" → `pulpo-nikkei`. Los ids del
   feed de catálogo (Fase 2) DEBEN usar la misma función.
3. **Purchase jamás se acepta desde el navegador** en `/api/meta-capi` — solo lo envía
   el servidor tras la aprobación real de Mercado Pago. Anti-fraude de datos.
4. **`payer.email` placeholder** (`cliente@uminikkeibar.cl`) se descarta antes de hashear.
   El email real sale del perfil UMI (registro obligatorio en el checkout).
5. **Pagos `in_process`/`pending`** que MP aprueba después de forma asíncrona hoy NO
   generan Purchase (no hay webhook de MP). Pendiente documentado; es una fracción menor.
6. **Consentimiento (Ley 19.628)**: banner propio. El pixel parte con
   `fbq('consent','revoke')` — los eventos quedan en cola local y solo se envían si el
   visitante acepta. El Purchase por CAPI se envía siempre (dato transaccional, base de
   licitud: ejecución del contrato de compra). GA4 quedó como estaba (fuera de alcance).

## Deduplicación (cómo funciona)

1. Al enviar el formulario de tarjeta (`onSubmit` del Brick), el front genera
   `metaEventId = crypto.randomUUID()`.
2. Ese UUID viaja al servidor en `body.meta.event_id` junto con `fbp`, `fbc`, email y
   uid del perfil.
3. Si MP aprueba: el servidor envía `Purchase` por CAPI con `event_id = ese UUID`.
4. El navegador (si sigue vivo) dispara `fbq('track','Purchase', …, {eventID: mismo UUID})`.
5. Meta ve dos eventos con el mismo `event_name` + `event_id` → cuenta UNO.
6. Si el navegador se cerró antes: solo llega el de CAPI → la compra igual se cuenta. ✅

## Atribución

- `index.html` captura `utm_*` y `fbclid` de la URL en la primera visita y los guarda
  90 días en `localStorage.umiAttrib` (+ copia de sesión).
- Si viene `fbclid` y no existe cookie `_fbc`, se crea en formato oficial
  (`fb.1.<timestamp>.<fbclid>`, 90 días).
- `_fbp`/`_fbc` se envían con cada evento CAPI (sin hashear, así lo pide Meta).

## Variables de entorno (Vercel)

| Variable | Contenido |
|---|---|
| `meta_pixel_ID` (o `META_PIXEL_ID`) | 1824016048566069 |
| `meta_capi_token` (o `META_CAPI_TOKEN`) | Token de acceso de la Conversions API |

El código acepta ambas grafías (`api/_meta.js`). **Nunca** commitear el token.

## ✅ Checklist de QA (hacer después de cada deploy relevante)

Herramienta: **Events Manager → dataset "Umi web" → pestaña "Probar eventos"**.
En el navegador: abrir uminikkeibar.cl con `Ctrl+Shift+R`.

1. **Consentimiento**: en ventana de incógnito debe aparecer el banner de cookies.
   Antes de aceptar → en "Probar eventos" NO deben llegar eventos del navegador.
   Al tocar "Aceptar" → llega `PageView`.
2. **ViewContent**: abrir la ficha de un plato (ej. Pulpo Nikkei) → debe llegar
   `ViewContent` con `content_ids: ["pulpo-nikkei"]` y su precio.
3. **AddToCart**: agregar el plato → `AddToCart` con contents correctos.
4. **InitiateCheckout**: abrir "Pedir" con sesión iniciada → `InitiateCheckout`
   con value = total del carrito.
5. **AddPaymentInfo**: elegir pago con tarjeta → al cargar el formulario llega
   `AddPaymentInfo`.
6. **Purchase (el importante)**: hacer un pago real de bajo monto (recordar: no se
   puede pagar con la tarjeta del dueño de la cuenta MP). En "Probar eventos" deben
   aparecer **DOS filas Purchase con el mismo ID de evento** — una "Navegador" y una
   "Servidor" — marcadas como deduplicadas. El value debe ser el total neto cobrado.
7. **Lead/Contact**: click en "RESERVAR MESA" → `Lead` (navegador + servidor).
   Click en la pestaña lateral de WhatsApp → `Contact`.
8. **CompleteRegistration**: registrar una cuenta Google nueva → evento con
   `content_name: umi_rewards`.
9. **Logs del servidor**: en Vercel → Logs, buscar líneas `[META]` — deben mostrar
   `→ 200` y `events_received: 1`. Nunca debe aparecer un email o teléfono en claro.

### Event Match Quality esperado
Con email + teléfono + nombre + external_id + fbp/fbc + IP + user-agent en el
Purchase por CAPI, el EMQ debería estabilizarse en **7–9/10** ("Bueno"–"Excelente")
después de ~20-30 compras. Si baja de 6, revisar que el perfil UMI esté llegando
en `body.meta` (puede ser caché de script.js viejo → subir el `?v=` en index.html).

## Gotchas

- **Caché**: cualquier cambio en `script.js`/`auth.js` requiere subir el `?v=` en
  `index.html` o los clientes seguirán con el tracking viejo.
- Bloqueadores de anuncios matan el pixel (por eso el Purchase va por CAPI).
- El evento del pixel queda "en cola" si el usuario no ha aceptado cookies: no es un
  bug que no aparezca en Test Events sin aceptar el banner.
