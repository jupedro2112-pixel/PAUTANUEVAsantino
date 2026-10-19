# RÉPLICA — REFERIDOS 2.0 (paquete portable para otro repo 1girox)

> Origen: **PAUTANUEVAsantino**, WORKLOG **#307, #308, #308b, #308c, #314, #317, #318, #319**
> (commits `c46a8c9 610eb04 6debd9c e87d761 86c4ff6 71c15ed abf37fa 97545cf`).
> Generado el 2026-10-19 (#334). Destino: un repo "gemelo" sobre 1girox que todavía
> tiene los referidos VIEJOS (modal con `/api/referrals/me` + `/history` + `/summary`,
> % hardcodeado 8%, sin popup, sin niveles, sin pago automático).
>
> Cómo usarlo en el otro repo: abrir una sesión del asistente en ese repo y decirle
> "aplicá `docs/replicas/referidos-2.0/` de PAUTANUEVAsantino, bloque por bloque".
> Los `.patch` son la verdad (diff real con contexto); `files/` son copias COMPLETAS de
> los archivos del backend que son casi 100% de referidos (se pueden pisar enteros si el
> destino no los tocó); `snippets/` son los bloques grandes del front ya extraídos del
> estado FINAL, para pegar sin tener que reconstruirlos sumando hunks.

## Qué hace (lo que el owner ve)

1. **Pago automático** de comisiones el día 1 de cada mes, hora AR, por el mes anterior
   (cron idempotente multi-instancia). % plano editable desde COMANDOS
   (`/sys_referidos_pct`, default 3). (#307)
2. **Tarjeta "🤝 Invitá y ganá"** en el hub PREMIOS + **banner** en el inicio del
   asistente + flujo "Invitá amigos" (copiar link / WhatsApp / otras apps / ver referidos).
   Mensaje de WhatsApp editable en COMANDOS (`/sys_referidos_compartir`, variables
   `{link} {codigo} {pct} {username}`). (#308, #308b, #308c)
3. **Copy**: "comisión por la ACTIVIDAD de tus referidos", nunca "de lo que pierdan"
   (decisión del owner: queda chocante). Sin número hardcodeado en HTML. (#314)
4. **Referidos 2.0** (#317, réplica del #168-#175 del gemelo JUGAYGANA, adaptada a 1girox):
   - **Niveles de %** por referidos ACTIVOS (`Config['referralMilestones']`: default
     3→1% / 5→2% / 10→3%, activo = cargas reales acumuladas ≥ $3.000). Override por
     usuario > niveles > % plano. **NADA de premios en plata por cantidad** (estafable):
     el endpoint viejo `POST /api/referrals/milestones/claim` responde 410.
   - **Tablero del cliente** `GET /api/referrals/dashboard`: link, nivel y próximo nivel,
     tabla por referido con netwin del MES EN VIVO leído de 1girox (cache 15 min).
   - **Modal nuevo `#referralModal`** (link + nivel + barra + tabla), **popup
     `#referralPromoModal`** al abrir la app (1× cada 24 h por dispositivo, #319) y
     **chooser de compartir** (WhatsApp / Telegram / share nativo / copiar).
   - Link `/?ref=CODE` (+ `/linkreferido?ref=` redirige para links viejos). `app.js`
     guarda el código 30 días, lo deja FIJO en el registro y, si llegó por el link sin
     sesión, abre el registro solo.
   - **Panel**: card "🤝 Comisión de referidos" (% plano) en COMANDOS; en Referidos:
     actividad y evolución (7/30 d, mes a mes), ranking de mejores referidores, editor de
     niveles, filtros "activos"/"nuevos 30 d", netwin del mes en vivo por referido en el
     detalle. Todo con `role==='admin'` para escribir.
5. **Botón "🤝 Mis referidos"** en el pie del widget del casino (al lado de "Mis
   datos") — el banner del inicio desaparece al ir a depositar. (#318)

## Contenido del paquete

| Archivo | Qué es |
|---|---|
| `01-backend-src.patch` | Diff ACUMULADO de los 6 archivos de `src/` de referidos (antes de #307 → después de #319). |
| `files/src/**` | Copias COMPLETAS finales de esos 6 archivos (ver tabla abajo). |
| `02-server.patch` | Hunks de `server.js`, commit por commit (requires, cron, comandos, `/linkreferido`, `/api/rewards/summary`, rutas nuevas). |
| `03-pwa.patch` | Hunks de `public/index.html`, `js/ui.js`, `js/auth.js`, `js/app.js`, SW. |
| `04-panel.patch` | Hunks de `public/adminprivado2026/index.html`, `admin.js`, `admin-sw.js`. |
| `05-docs.patch` | Lo que se agregó en CLAUDE.md / ARCHITECTURE.md (para replicar la regla de docs). |
| `snippets/` | Bloques grandes del front en su estado FINAL (ver §PWA y §Panel). |
| `img/referidos-promo-top.jpg`, `img/referidos-promo-bottom.jpg` | Imágenes del popup → copiar a `public/img/`. |

Archivos de backend (en `files/`), con su rol:

| Archivo | Nuevo/Mod | Rol |
|---|---|---|
| `src/services/referralTierService.js` | **NUEVO** | `resolveReferralRate(user, {activeCount})` (override > niveles > plano), `getReferralTiersConfig`, `normalizeTiers`, `depositsByReferred(referrerId)`, `invalidateCache`, `NON_BANK_SOURCES`. **La única función con la que se PAGA y se MUESTRA el %.** |
| `src/models/ReferralMilestoneClaim.js` | **NUEVO** | Solo historial de los premios en plata (discontinuados). Se requiere en server.js para que exista el modelo. |
| `src/utils/referralRate.js` | Mod | % plano en memoria: `setGlobalReferralRate/getGlobalReferralRate`, `refreshReferralRateFromCommand` (lee `/sys_referidos_pct`), `REFERRAL_PCT_COMMAND`, alias `resolveReferralRate()` (= solo el % plano — NO usarla para pagar). |
| `src/services/referralCalculationService.js` | Mod | Tasa de CADA referidor = `referralTierService.resolveReferralRate(referrer).rate` (se graba en `ReferralCommission.referralRate`); exporta `getReferredNetwinForRange(user, from, to, tag)` (getPlayerStats + mapStatsToRevenue) para el tablero. |
| `src/controllers/referralController.js` | Mod | `adminGetActivity` (#174: actividad/ranking, NO consulta 1girox), detalle del referidor con cargas y netwin histórico (#175), link `/?ref=` con `getPublicBaseUrl()`. |
| `src/routes/referralRoutes.js` | Mod | + `GET /admin/activity`. |

⚠️ Si el destino tiene **diferencias locales** en `referralCalculationService.js` o
`referralController.js`, NO pisar: aplicar `01-backend-src.patch` con `git apply --3way`
o a mano. Los 2 archivos NUEVOS y `referralRate.js` se pueden copiar enteros.

## Orden de aplicación

### 0. Prerrequisitos en el destino (verificar con grep ANTES)

- `src/utils/periodKey.js` con `getPeriodRange`, `getCurrentPeriodKey`, `getPeriodLabel`,
  `getNextPeriodLabel` (los repos 1girox lo tienen).
- `src/utils/referralCode.js` (`generateReferralCode`).
- `getPublicBaseUrl()` en server.js. `setConfig(key, value)` y modelo `Config`.
- `renderSystemCommand(name, fallback, vars)` + `systemCmds` en `initializeData()`.
- `referralPayoutService.executePayoutsForPeriod(periodKey, {adminId, adminUsername})` y
  `referralCalculationService.calculateCommissionsForPeriod(periodKey, {dryRun})`.
- `_rouletteDateKeyART()` (día ART) — si no existe, usar cualquier helper de fecha ART.
- `giroxService.getPlayerStats` (v1.8+) — el netwin vivo sale de ahí.
- **Front:** hub PREMIOS (`VIP.ui.openRewardsHub`, `_rwCard`, `_rwFmt`, `_wrEsc`),
  asistente (`VIP.ui.casinoBotGo`, `_botMsg`, `_botBtn`) y widget del casino
  (`_showCasinoFrame`). **Si el destino NO tiene el hub PREMIOS / asistente** (front
  viejo, ui.js ≈1.500 líneas), saltear §3.3–§3.5 y usar SOLO el modal + popup + chooser
  (§3.1–§3.2): el `#referralModal` se abre con `VIP.ui.openReferralModal()` desde el
  botón de referidos que ya tenga el menú.

### 1. Backend `src/` (01-backend-src.patch / files/)

1. Copiar `files/src/services/referralTierService.js` y `files/src/models/ReferralMilestoneClaim.js`.
2. Copiar `files/src/utils/referralRate.js` (o aplicar el hunk).
3. Aplicar los hunks de `referralCalculationService.js`, `referralController.js`,
   `referralRoutes.js`.

### 2. `server.js` (02-server.patch) — en este orden

1. **Requires** (bloque #317, al lado de `generateReferralCode`):
   `ReferralMilestoneClaim`, `_periodKey`, `{ setGlobalReferralRate, getGlobalReferralRate,
   refreshReferralRateFromCommand, REFERRAL_PCT_COMMAND }`, `referralTiers`.
2. **Cron de pago automático** `_referralPrevPeriodKeyART` + `_runMonthlyReferralPayout`
   (reserva `Config referral_autorun_<YYYY-MM>` con `$setOnInsert`+upsert → una sola
   instancia corre; 5 min tras el arranque + cada hora). Debajo, el **refresh del % plano**
   cada 60 s (`refreshReferralRateFromCommand`). (#307 + #317)
3. **Comandos sembrados** en `systemCmds` de `initializeData()`: `/sys_referidos_pct`
   (response `'3'`) y `/sys_referidos_compartir` (plantilla WhatsApp). (#307, #308b)
4. **`GET /linkreferido`** → 302 a `/?ref=CODE`. Registrar ANTES del vanity `/:code`. (#317)
5. **`/api/rewards/summary`**: agregar `referralPct` (máximo si hay niveles),
   `referralMyPct`, `referralTiersOn`, `referralShareTpl` (plantilla renderizada con
   `{link}`/`{codigo}` sin reemplazar: los pone el front). (#308/#308b/#317) — solo si el
   destino tiene ese endpoint (hub PREMIOS).
6. **Rutas nuevas** (después de `app.use('/api/referrals', referralRoutes)`; ⚠️ TDZ:
   después de `authMiddleware`/`adminMiddleware`/`sensitiveLimiter`):
   - `GET/POST /api/admin/referral-rate` (admin general; el POST escribe el comando
     `/sys_referidos_pct` + `setGlobalReferralRate`).
   - helpers `_refNetwinCache`, `_referralNetwinMonth`, `_referralMonthRange`,
     `_referralNetwinFor`, `_referralLinkFor`, `_ensureReferralCode`.
   - `GET /api/referrals/dashboard` (cliente).
   - `POST /api/referrals/milestones/claim` → 410.
   - `GET/POST /api/admin/referrals/milestones-config` (admin general).
   - `GET /api/admin/referrals/:userId/netwin` (admin; netwin del mes en vivo por referido).

### 3. PWA (03-pwa.patch + snippets/)

1. **`public/index.html`**
   - CSS: `snippets/index-referral.css` (clases `.dash-ref*` de la card del home y
     `.ref-promo*` del popup) dentro del `<style>` principal.
   - `<div id="referralHomeCard" style="display:none;"></div>` en el dashboard viejo
     (debajo de reembolsos) — solo lo ve staff / cambio de clave.
   - En el formulario de registro: `<span id="registerReferralHint">…</span>` debajo del
     input `registerReferralCode`.
   - **Reemplazar el "Modal de Referidos" viejo** por `snippets/index-referral-modals.html`
     (`#referralModal` + `#referralPromoModal`, ambos `z-index:2147483000` para quedar
     arriba del casino y del hub). Imágenes `/img/referidos-promo-top.jpg` y `-bottom.jpg`.
   - Textos "Referidos: 8% mensual" → "Referidos: comisión mensual" (info cards, #314).
   - Bumpear `?v=` de `auth.js`, `ui.js`, `app.js`.
2. **`public/js/ui.js`** (IIFE `VIP.ui`): reemplazar el bloque "Referrals" viejo (el que
   pegaba a `/api/referrals/me` + `/history` + `/summary`) por
   `snippets/ui-referral-iife.js`: `openReferralModal` (→ `/api/referrals/dashboard`),
   `renderReferralModal`, `loadReferralHomeCard`, `maybeShowReferralPromo`
   (`REF_PROMO_COOLDOWN_MS` = 24 h, `localStorage vip_refPromoAt`, `?refpromo=1` fuerza),
   `_refShareText` (usa `referralShareTpl` del summary si existe), `shareReferralLink`
   (chooser), `shareReferralNative`, `copyReferralLink`, `copyReferralCode` (legacy).
   **Exportar en el `return` del IIFE:** `openReferralModal, loadReferralData,
   copyReferralCode, copyReferralLink, loadReferralHomeCard, maybeShowReferralPromo,
   shareReferralLink, shareReferralNative, toggleReferralNetLossInfo, fetchReferralDashboard`.
3. **Hub PREMIOS** (`snippets/ui-hub-referral-card.js`, fuera del IIFE, antes de
   `VIP.ui.openRewardsHub`): `_rwLoadReferrals` (`/api/referrals/me` + `/summary`,
   cache `VIP.ui._rwRef`), `_rwRefPct` / `_rwRefPctTxt` ("hasta el X%" con niveles),
   `_rwRefShareText`, `_rwCopyRef`, `_rwShareRef`, `_rwInviteFriends` (flujo del
   asistente: copia el link y ofrece WhatsApp / otras apps / copiar / ver referidos),
   `_rwShareWa`, `_rwReferralCard` (card `#rwRefCard`). En `openRewardsHub(focus)`:
   sumar `cards += VIP.ui._rwReferralCard()` antes de INFORMACIÓN, ítem de "¿Cómo
   funciona?" con `_rwRefPctTxt()`, y `focus==='ref'` scrollea a `#rwRefCard`.
4. **Asistente** (`snippets/ui-asistente-banner.js`): en `casinoBotGo('home')`, banner
   "🤝 Invitá amigos y ganá hasta el X% de comisión por su actividad" → `_rwInviteFriends()`
   + precarga `_rwLoadReferrals()`.
5. **Pie del widget** (`snippets/ui-widget-pie-mis-referidos.js`, en `_showCasinoFrame`):
   botón "🤝 Mis referidos" → `VIP.ui.openReferralModal()`. (#318)
6. **`public/js/app.js`**: lectura de `?ref=` → `localStorage vip_ref` 30 días,
   `window._vipRefLocked`, input readOnly, auto-abrir `registerModal` si llegó por el link
   sin sesión (respeta el welcome de publicista si hay otro modal abierto).
7. **`public/js/auth.js`**: en los DOS caminos de arranque (login y sesión restaurada):
   `loadReferralHomeCard()` solo si `!_casinoFirst` y `maybeShowReferralPromo()` siempre.
   En `applyRegisterModalMode`: si `window._vipRefLocked`, el código queda fijo y el
   referido tiene prioridad sobre la atribución de pauta.
8. **SW** `firebase-messaging-sw.js`: bumpear `CACHE_VERSION`.

### 4. Panel (04-panel.patch + snippets/)

1. `adminprivado2026/index.html`: card "🤝 Comisión de referidos" (`#referralRateForm`,
   en COMANDOS antes de Rangos de reembolso); en la sección Referidos: bloques "📈
   Actividad y evolución" (`#referralActivityBody`), "🏆 Mejores referidores"
   (`#referralRankingBody`), "🏆 Niveles de comisión por referidos activos"
   (`#refMsEnabled/#refMsMin/#refMsBasePct/#refMsTiers`) y filtros `referralFilterActive` /
   `referralFilterNew30`.
2. `admin.js`: `snippets/admin-actividad-ranking.js` (`renderReferralRanking`,
   `loadReferralDetailNetwin`, `loadReferralActivity`, `renderReferralActivity`) y
   `snippets/admin-niveles-y-pct-plano.js` (`addRefMsTier`, `loadReferralMilestones`,
   `saveReferralMilestones`, `loadReferralRate`, `saveReferralRate`, todos en `window.*`).
   Los cambios a funciones EXISTENTES (`loadAdminReferralSummary` llama a
   `loadReferralActivity`+`loadReferralMilestones`, `renderReferrersTable` con columnas
   activos/nuevos, `filterReferrersTable` modos `active`/`new30`,
   `loadAdminUserReferrals` con netwin en vivo y `loadReferralDetailNetwin`,
   `loadCommands` llama a `loadReferralRate()`) están en el patch con contexto.
   Tooltips "JUGAYGANA" → "1girox".
3. `admin-sw.js`: bumpear `CACHE_VERSION`.

### 5. Docs del destino

`05-docs.patch` tiene lo que se agregó a CLAUDE.md (gotcha de referidos) y a
ARCHITECTURE.md (§2 ReferralMilestoneClaim/Config, §4.6, §5 Referidos 2.0, §8 copy, §9
trampas). Replicar en el WORKLOG del destino como entrada propia.

## Reglas que NO se negocian (del owner)

- **Para pagar o mostrar un %: SIEMPRE `referralTierService.resolveReferralRate(user)`.**
  `utils/referralRate.resolveReferralRate()` es solo el % plano del comando.
  Nunca `getReferralRateForUser` ni la tasa encadenada 8%×7%.
- **Nada de premios en plata por cantidad de referidos.** Solo % por nivel.
- **Copy:** "comisión por la actividad de tus referidos", nunca "lo que pierdan".
  En HTML estático NO poner el número (sale de `_rwRefPct()` / del dashboard).
- `/api/referrals/dashboard` consulta 1girox por referido con cargas (cache 15 min, tope
  60): no llamarlo en el arranque del cliente en modo casino. `/api/referrals/admin/activity`
  NO consulta 1girox.
- Comisión = `creditUserBalance` con `ignoreGlobalRollover:true`, reference
  `vip-refcom-<payoutId>` (sin cambios respecto de lo que ya tiene el destino).

## Checklist de prueba (en vivo, tras deploy)

1. Abrir la app con sesión → popup de referidos (1 vez; `?refpromo=1` lo fuerza) →
   "Invitar" abre el chooser (WhatsApp / Telegram / nativo / copiar).
2. `/?ref=CODE` sin sesión → se abre el registro con el código fijo (readOnly, hint
   dorado). `/linkreferido?ref=CODE` redirige a lo mismo.
3. PREMIOS → card "Invitá y ganá" con "hasta el X%" y "Tu % actual"; botón abre el modal
   con nivel, barra y tabla. Asistente → banner → flujo "¿Cómo querés invitarlos?".
4. Pie del widget → "🤝 Mis referidos" abre el modal por encima del casino.
5. Panel → COMANDOS → card % plano: guardar 4 → `/sys_referidos_pct` = 4 y en ≤60 s el
   cliente ve 4% (si los niveles están OFF).
6. Panel → Referidos: actividad/ranking cargan sin pegarle a 1girox; "Ver referidos" →
   netwin del mes en vivo; editor de niveles valida (% creciente, base ≤ 1er nivel).
7. Preview del cálculo → la tasa de cada referidor = su nivel.
8. ⚠️ **Niveles ON por default** (3/5/10 → 1/2/3%, base 0%): un referidor con < 3
   activos cobra 0% desde el próximo cálculo. Confirmar con el owner o apagar los niveles
   en el panel (entonces rige el % plano para todos).
