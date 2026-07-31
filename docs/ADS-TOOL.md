# 🛠️ ADS-TOOL.md — Herramienta de campañas `umi-ads` (Fase 3)

> Carpeta: `tools/meta-ads/` · Requiere Node (ya instalado en este equipo)

## Reglas de seguridad (grabadas en el código)

1. **Todo nace EN PAUSA.** Ninguna campaña/adset creada por la herramienta gasta
   un peso hasta que Adnan la active a mano en el Administrador de Anuncios.
2. **Tope diario: $15.000 CLP** (decidido 2026-07-31, hardcodeado en
   `lib/config.js` → `TOPE_DIARIO_CLP`). Si crear algo superaría ese total
   (sumando lo ya activo en la cuenta), la herramienta **aborta**.
3. **Dry-run por defecto.** Sin la bandera `--ejecutar`, todo comando solo
   imprime lo que haría. Nada sale a Meta.
4. **Token solo en `.env`** (git-ignorado). Log local de cada operación en
   `tools/meta-ads/logs/` (también git-ignorado).
5. La PII de clientes se **hashea SHA-256 en memoria** antes de subir audiencias;
   solo se exportan clientes con `acceptsPromos = true` (Ley 19.628).

## Puesta en marcha (una sola vez)

1. Generar el token del usuario del sistema **umi-ads bot** (pendiente: requiere
   crear la app `UMI Ads Tool` cuando Meta desbloquee la cuenta de desarrollador).
2. Pegar el token en `tools/meta-ads/.env` → `META_ADS_TOKEN=...`
   (los demás IDs ya están precargados en ese archivo).

## Comandos

```bash
cd "C:\Users\pc gamer\Desktop\UMI-PARA-LAPTOP\GITHUB\tools\meta-ads"

node umi-ads.js audit                          # estado de cuenta, campañas, ROAS 7d
node umi-ads.js create --template prospeccion  # simula la creación (dry-run)
node umi-ads.js create --template prospeccion --ejecutar   # crea DE VERDAD (en pausa)
node umi-ads.js audiences sync                 # audiencias de pixel (dry-run)
node umi-ads.js audiences sync --csv clientes.csv --ejecutar
node umi-ads.js report --days 7                # rendimiento por campaña
node umi-ads.js rules apply --ejecutar         # reglas de protección dentro de Meta
```

## Las 4 plantillas (presupuestos suman el tope de $15.000/día)

| Plantilla | Qué hace | CLP/día |
|---|---|---|
| `prospeccion` | Ventas a público nuevo, radio 12 km, 22-55 años, Advantage+ | 5.000 |
| `retargeting` | Catálogo dinámico: carrito 14d / checkout 7d / vistos 30d sin comprar | 4.000 |
| `retencion` | Base propia (lista hasheada con opt-in) + lookalike 1% | 3.000 |
| `reservas` | Click a WhatsApp, radio 5 km, horario valle de semana | 3.000 |

## Flujo recomendado para el lanzamiento (cuando esté el token)

1. `audit` — confirmar cuenta activa y sin nada raro.
2. `audiences sync --ejecutar` — crear audiencias de pixel (las lookalike pueden
   fallar hasta tener ≥100 compradores; se reintenta después).
3. `rules apply --ejecutar` — poner los frenos automáticos dentro de Meta.
4. `create --template prospeccion --ejecutar` — revisar en el Administrador,
   subir creativos (reels/carrusel), y **activar a mano**.
5. Esperar 5-7 días de datos → `report` → decidir la siguiente campaña.
   Recomendación: partir solo con `prospeccion` + `retargeting` (9.000/día)
   y sumar las otras cuando el pixel tenga más compras acumuladas.

## Pendientes conocidos

- El adset de retargeting usa `{{PRODUCT_SET_ID}}` como marcador: al activar por
  primera vez hay que crear/usar el conjunto "Todos los productos" del catálogo
  (Commerce Manager → Conjuntos) y reemplazar el ID. Se automatizará si se repite.
- La exclusión "compradores últimos 14 días" en prospección se asigna al activar
  (audiencia "UMI Compradores 14d" creada por `audiences sync`).
- Regla "subir presupuesto 20% si ROAS>3" quedó como **notificación** (no
  auto-ejecuta): la subida la aprueba Adnan y el tope diario siempre manda.
