# 🗂️ CATALOG.md — Catálogo de productos Meta (Fase 2)

> Implementado 2026-07-22. Feed en vivo: **https://www.uminikkeibar.cl/catalog/umi-feed.csv**

## Cómo funciona

- El feed CSV se genera **al vuelo** en `api/catalog-feed.js`: descarga el `script.js`
  desplegado, extrae `MENU`, fotos y descripciones, y arma el CSV. **Nunca se regenera
  a mano** — si cambia el menú de la web, el feed cambia solo (cache de 1 hora).
- `/catalog/umi-feed.csv` → rewrite en `vercel.json` → `/api/catalog-feed`.
- Los `id` del feed usan la misma función de slug que los `content_ids` del pixel
  (`umiSlug` ≡ `slugProducto`). Ej: "Pulpo nikkei" → `pulpo-nikkei`. **Esto es lo que
  hace funcionar el retargeting dinámico** ("viste este plato → te muestro este plato").
- Cada `link` del feed apunta a `uminikkeibar.cl/?plato=<slug>&utm_...` — la web abre
  automáticamente la ficha de ese plato al llegar (deep link implementado en script.js).

## Qué incluye / excluye

- ✅ 98 productos con foto (comida, postres, ensaladas, bebidas, cafés).
- ❌ Alcohol (la web no lo vende online + restricciones de política publicitaria de Meta).
- ❌ "Adicionales" (salsas, arroz extra — no son productos anunciables).
- ❌ Platos sin foto (9 al momento de implementar — Meta los rechazaría). Para sumarlos:
  agregarles foto en SPLEAT_PHOTOS o PHOTO_OVERRIDES de script.js y listo, entran solos.

## 📋 PASOS PARA CONECTARLO EN META (hacer una sola vez, ~5 min)

1. Ir a **Commerce Manager**: business.facebook.com/commerce
   (o Events Manager → menú ☰ → "Catálogos").
2. **Agregar catálogo** → tipo **"Comercio electrónico"** → nombre: `UMI Menú`.
   Propiedad: portfolio **UMI Nikkei Bar**.
3. Dentro del catálogo → **Orígenes de datos** (Data sources) → **Agregar productos**
   → **"Usar fuente de datos"** / **"Carga programada"** (Scheduled feed).
4. Pegar la URL del feed: `https://www.uminikkeibar.cl/catalog/umi-feed.csv`
5. Programación: **Diaria** (cualquier hora de madrugada, ej. 4:00).
6. Sin usuario/contraseña (el feed es público). Moneda: ya viene en el archivo (CLP).
7. Al terminar la primera carga, revisar "Problemas" — deberían entrar ~98 productos.
8. **Conectar el pixel al catálogo**: dentro del catálogo → Configuración →
   **Orígenes de eventos** → asociar el dataset **"Umi web"** (1824016048566069).
   Esto une "lo que la gente ve en la web" con "los productos del catálogo".

Con eso queda habilitado **Advantage+ Catalog Ads** (retargeting dinámico) para la Fase 3.

## Verificación rápida del feed

- Abrir https://www.uminikkeibar.cl/catalog/umi-feed.csv en el navegador → debe
  descargar/mostrar un CSV con encabezado `id,title,description,...` y ~99 líneas.
- En Vercel → Logs, buscar `[FEED]` → muestra cuántos productos generó y cuántos
  quedaron fuera por falta de foto.
