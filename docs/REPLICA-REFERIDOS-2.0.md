# RÉPLICA — REFERIDOS 2.0 (PAUTANUEVAsantino → repo gemela 1girox)

> **Cómo usar esto:** copiá TODO este documento como prompt inicial en una sesión del
> asistente parada en la OTRA repo (la gemela que todavía tiene los referidos VIEJOS:
> modal con `/api/referrals/me` + `/history` + `/summary`, 8% hardcodeado, sin popup,
> sin niveles, sin pago automático). Es la especificación FINAL consolidada de todo lo
> que se hizo de referidos en PAUTANUEVAsantino entre el 2026-09-28 y el 2026-10-06
> (WORKLOG #307, #308, #308b, #308c, #314, #317, #318, #319) — sin las iteraciones
> intermedias: implementá directo el estado final, que es mejor. **El código completo
> está acá adentro**: no hace falta tener acceso a la repo de origen.

---

## INSTRUCCIONES PARA EL ASISTENTE QUE IMPLEMENTA

1. **NO copies líneas a ciegas.** Las dos repos eran gemelas pero pueden haber divergido.
   Antes de cada feature, EXPLORÁ tu repo (grep): el bloque "Referrals" de `public/js/ui.js`,
   el "Modal de Referidos" de `public/index.html`, la sección Referidos del panel
   (`public/adminprivado2026/index.html` + `admin.js`), `src/controllers/referralController.js`,
   `src/services/referralCalculationService.js`, `src/utils/referralRate.js`,
   `src/routes/referralRoutes.js`. Los nombres de funciones/archivos citados existen en ambas
   repos salvo divergencia: verificalos antes de tocar.
2. **Prerrequisitos (verificá con grep, todos existen en los repos 1girox):**
   `src/utils/periodKey.js` (`getPeriodRange`, `getCurrentPeriodKey`, `getPeriodLabel`,
   `getNextPeriodLabel`); `src/utils/referralCode.js` (`generateReferralCode`);
   `getPublicBaseUrl()`, `setConfig(key,value)`, modelo `Config`, `renderSystemCommand` y el
   array `systemCmds` de `initializeData()` en `server.js`; `referralPayoutService.
   executePayoutsForPeriod` y `referralCalculationService.calculateCommissionsForPeriod`;
   `_rouletteDateKeyART()` (día ART; si no existe usá cualquier helper de fecha ART);
   `giroxService.getPlayerStats` (Partner API v1.8+). **Front:** hub PREMIOS
   (`VIP.ui.openRewardsHub`, `_rwCard`, `_rwFmt`, `_wrEsc`, `VIP.ui._rwSummary` =
   respuesta de `/api/rewards/summary`), asistente del casino (`VIP.ui.casinoBotGo`,
   `_botMsg`, `_botBtn`, `_botRow`) y widget (`VIP.ui._showCasinoFrame`). **Si tu repo NO
   tiene el hub PREMIOS ni el asistente** (front viejo), saltá los pasos 3.4–3.6 y
   conectá `VIP.ui.openReferralModal()` al botón de referidos que ya tenga el menú ☰:
   el modal nuevo + popup + chooser + backend + panel funcionan igual sin el hub.
3. **Tardá lo que tengas que tardar.** Implementá en el ORDEN de este documento (hay
   dependencias). Un commit por feature, con `node --check` en cada archivo JS tocado
   antes de commitear (no hay node_modules local: solo syntax check). HTML balanceado.
4. **Convenciones del proyecto** (iguales en ambas repos, ver CLAUDE.md local): montos en
   PESOS (nunca ×100); idempotencia por `reference` única y ESTABLE por operación; secrets
   por SSM con lazy getters; rutas nuevas de `server.js` DESPUÉS de `authMiddleware` /
   `adminMiddleware` / `sensitiveLimiter` (TDZ); bump del SW correspondiente en cada
   cambio de front (PWA: `public/firebase-messaging-sw.js` + `?v=` de los scripts en
   `index.html`; panel: `public/admin-sw.js`); actualizar WORKLOG.md y
   docs/ARCHITECTURE.md; commit+push a main.
5. **Reglas del owner que NO se negocian:**
   - Para PAGAR o MOSTRAR un %: SIEMPRE `referralTierService.resolveReferralRate(user)`
     (override por usuario > niveles > % plano). `utils/referralRate.resolveReferralRate()`
     es SOLO el % plano del comando. Nunca `getReferralRateForUser` para plata. Nunca
     reintroducir la tasa encadenada 8% × 7%.
   - **NADA de premios en plata por cantidad de referidos** (se estafaban con cuentas
     falsas). El premio es el % de comisión por nivel. Sin netwin real no hay comisión.
   - **Copy al cliente:** "comisión por la ACTIVIDAD de tus referidos", NUNCA "lo que
     pierdan" / "pérdida neta" (queda chocante). En HTML estático NO poner el número del %
     (sale de `_rwRefPct()` / del dashboard; se desactualiza).
   - `/api/referrals/dashboard` consulta 1girox por cada referido con cargas (cache 15 min,
     tope 60): NO llamarlo en el arranque del cliente en modo casino.
     `/api/referrals/admin/activity` NO consulta 1girox.
   - La comisión se acredita con `creditUserBalance` + `ignoreGlobalRollover:true`,
     reference `vip-refcom-<payoutId>` (eso ya lo tenés; no cambia).
6. **Verificá cada feature con los "PROBAR"** (al menos siguiendo el flujo en el código de
   punta a punta si no podés ejecutar).

---

## QUÉ SE VA A VER AL FINAL (resumen para el owner)

1. **Pago automático** de comisiones el día 1 de cada mes (hora AR) por el mes anterior,
   idempotente multi-instancia. % plano editable desde COMANDOS (`/sys_referidos_pct`,
   default 3) y desde una card del panel.
2. **Niveles de %** por referidos ACTIVOS: default 3 activos → 1%, 5 → 2%, 10 → 3%
   (activo = cargas reales acumuladas ≥ $3.000). Editable en el panel, se puede apagar
   (entonces rige el % plano para todos).
3. **Modal nuevo "🤝 Mis Referidos"** (link + INVITAR + tiles + tabla por referido con
   el netwin del MES EN VIVO + nivel y barra de progreso), **popup promocional** al abrir
   la app (1× cada 24 h por dispositivo) y **chooser de compartir** (WhatsApp / Telegram /
   otras apps / copiar). Mensaje de WhatsApp editable en COMANDOS (`/sys_referidos_compartir`).
4. **Link `/?ref=CODE`** (+ `/linkreferido?ref=` redirige): el código queda guardado 30
   días, FIJO en el registro, y si llegó por el link sin sesión se abre el registro solo.
5. **Hub PREMIOS:** card "🤝 Invitá y ganá" + banner en el inicio del asistente ("Invitá
   amigos y ganá hasta el X%") + botón "🤝 Mis referidos" en el pie del widget.
6. **Panel:** card "🤝 Comisión de referidos" en COMANDOS; en Referidos: "📈 Actividad y
   evolución", "🏆 Mejores referidores", "🏆 Niveles de comisión", filtros "⭐ Con activos" /
   "🚀 Nuevos 30d", columnas nuevas en la tabla y netwin del mes en vivo en el detalle.

---

## FEATURE 1 — Backend `src/`: niveles, % plano, netwin por referido

### 1.1 NUEVO `src/services/referralTierService.js` (copiar entero)

```js
/**
 * referralTierService — NIVELES de comisión de referidos (#171 del gemelo AUTOREEMBOLSOS,
 * portado a 1girox en #317, owner 2026-10-06). Mongo puro: no toca la plataforma.
 *
 * Reemplaza los premios en plata por cantidad de referidos (#168: 3 → $10.000, etc.), que
 * eran estafables (3 cuentas × $3.000 = $9.000 puestos → $10.000 retirables). Ahora la
 * cantidad de referidos ACTIVOS define el % de comisión sobre el netwin (pérdida neta):
 *
 *   referidos activos < 3  → basePct (0% por defecto)
 *   3 referidos activos    → 1%
 *   5                      → 2%
 *   10                     → 3%  (máximo)
 *
 * Todo editable desde el panel (COMANDOS → "Niveles de comisión por referidos"), en
 * `Config['referralMilestones']` = { enabled, minChargedARS, basePct, tiers:[{count, pct}] }.
 * "Referido activo" = referido con cargas reales acumuladas ≥ `minChargedARS` (Transaction
 * deposit completed, sin regalos/bonos). Sin netwin no hay comisión → una cuenta falsa que
 * carga y retira no genera nada.
 *
 * Prioridad de la tasa (resolveReferralRate): override por usuario > niveles (si enabled)
 * > tasa global plana (`Config['referralRate']`, #169). Los callers de plata
 * (referralCalculationService) tienen que usar ESTE resolver, no getReferralRateForUser
 * (que es sync y sólo conoce la global).
 */
const Config = require('../models/Config');
const { Transaction, User } = require('../models');
const { getGlobalReferralRate } = require('../utils/referralRate');

const CONFIG_KEY = 'referralMilestones';
const DEFAULTS = { enabled: true, minChargedARS: 3000, basePct: 0, tiers: [{ count: 3, pct: 1 }, { count: 5, pct: 2 }, { count: 10, pct: 3 }] };
// Fuentes de Transaction deposit que NO son plata del cliente (regalos, bonos, reembolsos).
// #317 (1girox): además de los nombres del gemelo, los `metadata.source` de regalos de ESTE
// repo. Hoy casi todos los regalos se graban como type 'bonus' (no cuentan igual), pero si
// alguno queda como 'deposit' tampoco tiene que sumar como carga real. 'auto_hgcash' y
// 'self_service' SÍ son plata del cliente (no van acá).
const NON_BANK_SOURCES = ['install_bonus', 'welcome_gift', 'payout_refund', 'notif_batch', 'notif_batch_auto', 'auto_hgcash_bonus',
  'welcome_roulette', 'daily_roulette', 'roulette', 'first_charge_bonus', 'instant_cashback', 'welcome_code'];

let _cache = { at: 0, cfg: null };
const CACHE_MS = 60 * 1000;

function normalizeTiers(raw) {
  const tiers = (Array.isArray(raw) ? raw : [])
    .map(t => ({ count: Math.round(Number(t && t.count) || 0), pct: Math.round((Number(t && t.pct) || 0) * 100) / 100 }))
    .filter(t => t.count > 0 && t.pct > 0 && t.pct <= 50)
    .sort((a, b) => a.count - b.count);
  const seen = new Set();
  return tiers.filter(t => { if (seen.has(t.count)) return false; seen.add(t.count); return true; });
}

function normalizeConfig(c) {
  c = c || {};
  // Formato viejo (#168: tiers con amountARS y sin pct) → se ignora y se usan los defaults.
  const hasNew = Array.isArray(c.tiers) && c.tiers.some(t => t && Number(t.pct) > 0);
  const tiers = hasNew ? normalizeTiers(c.tiers) : DEFAULTS.tiers.slice();
  const basePct = Number(c.basePct);
  return {
    enabled: c.enabled !== false,
    minChargedARS: Number(c.minChargedARS) >= 0 ? Math.round(Number(c.minChargedARS)) : DEFAULTS.minChargedARS,
    basePct: Number.isFinite(basePct) && basePct >= 0 && basePct <= 50 ? Math.round(basePct * 100) / 100 : DEFAULTS.basePct,
    tiers: tiers.length ? tiers : DEFAULTS.tiers.slice()
  };
}

async function getReferralTiersConfig({ force = false } = {}) {
  if (!force && _cache.cfg && Date.now() - _cache.at < CACHE_MS) return _cache.cfg;
  let cfg;
  try {
    const doc = await Config.findOne({ key: CONFIG_KEY }).lean();
    cfg = normalizeConfig(doc ? doc.value : null);
  } catch (_) { cfg = normalizeConfig(null); }
  _cache = { at: Date.now(), cfg };
  return cfg;
}
function invalidateCache() { _cache = { at: 0, cfg: null }; }

/** Cargas reales acumuladas por referido del referidor → Map(userId → { total, count, last }). */
async function depositsByReferred(referrerId) {
  const refs = await User.find({ referredByUserId: referrerId }).select('id').lean();
  const ids = refs.map(r => r.id);
  if (!ids.length) return new Map();
  const agg = await Transaction.aggregate([
    { $match: { userId: { $in: ids }, type: 'deposit', status: 'completed', 'metadata.source': { $nin: NON_BANK_SOURCES } } },
    { $group: { _id: '$userId', total: { $sum: '$amount' }, count: { $sum: 1 }, last: { $max: '$timestamp' } } }
  ]);
  return new Map(agg.map(a => [a._id, { total: Number(a.total) || 0, count: a.count, last: a.last }]));
}

async function countActiveReferrals(referrerId, minChargedARS) {
  const by = await depositsByReferred(referrerId);
  let n = 0;
  for (const v of by.values()) if (v.total >= minChargedARS) n++;
  return n;
}

/** Nivel que corresponde a `active` referidos activos. */
function levelForCount(cfg, active) {
  let tier = null;
  for (const t of cfg.tiers) if (active >= t.count) tier = t;
  const nextTier = cfg.tiers.find(t => active < t.count) || null;
  const pct = tier ? tier.pct : cfg.basePct;
  return { pct, rate: pct / 100, tier, nextTier, missing: nextTier ? nextTier.count - active : 0 };
}

function maxPct(cfg) { return cfg.tiers.length ? cfg.tiers[cfg.tiers.length - 1].pct : cfg.basePct; }

/**
 * Tasa efectiva del referidor.
 * @returns {{ rate:number, pct:number, mode:'override'|'tiers'|'flat', active:number, tier, nextTier, missing:number, maxPct:number, cfg }}
 */
async function resolveReferralRate(user, { activeCount = null } = {}) {
  const cfg = await getReferralTiersConfig();
  const base = { cfg, maxPct: cfg.enabled ? maxPct(cfg) : Math.round(getGlobalReferralRate() * 10000) / 100 };
  if (user && typeof user.referralRateOverride === 'number') {
    return Object.assign(base, { rate: user.referralRateOverride, pct: Math.round(user.referralRateOverride * 10000) / 100, mode: 'override', active: null, tier: null, nextTier: null, missing: 0 });
  }
  if (!cfg.enabled) {
    const rate = getGlobalReferralRate();
    return Object.assign(base, { rate, pct: Math.round(rate * 10000) / 100, mode: 'flat', active: null, tier: null, nextTier: null, missing: 0 });
  }
  const active = activeCount != null ? activeCount : (user && user.id ? await countActiveReferrals(user.id, cfg.minChargedARS) : 0);
  const lv = levelForCount(cfg, active);
  return Object.assign(base, { rate: lv.rate, pct: lv.pct, mode: 'tiers', active, tier: lv.tier, nextTier: lv.nextTier, missing: lv.missing });
}

module.exports = {
  DEFAULTS, NON_BANK_SOURCES, CONFIG_KEY,
  getReferralTiersConfig, invalidateCache, normalizeConfig, normalizeTiers,
  depositsByReferred, countActiveReferrals, levelForCount, maxPct, resolveReferralRate
};
```

### 1.2 NUEVO `src/models/ReferralMilestoneClaim.js` (copiar entero — solo historial; los premios en plata están discontinuados pero el modelo se requiere en server.js)

```js
/**
 * ReferralMilestoneClaim — premio EXTRA por cantidad de referidos que cargaron (#168).
 *
 * Config['referralMilestones'] define los hitos ({count, amountARS}) y el mínimo cargado
 * por referido para contar. Cada hito se cobra UNA sola vez por usuario (índice único
 * userId+count = candado atómico contra doble cobro, patrón "reservar antes de acreditar"
 * de los reembolsos). Se acredita como fichas (individual_bonus) sin condiciones y es un
 * extra: la comisión mensual del 7% sigue aparte.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true, index: true },
  count: { type: Number, required: true },          // hito (3, 5, 10, …)
  amountARS: { type: Number, required: true },
  qualifiedAtClaim: { type: Number, default: 0 },   // referidos calificados en el momento del reclamo
  status: { type: String, enum: ['pending', 'credited', 'verify', 'failed'], default: 'pending', index: true },
  txId: { type: String, default: null },
  error: { type: String, default: null },
  claimedAt: { type: Date, default: Date.now },
  creditedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, count: 1 }, { unique: true, name: 'unique_user_milestone' });

module.exports = mongoose.models['ReferralMilestoneClaim'] || mongoose.model('ReferralMilestoneClaim', schema);
```

### 1.3 `src/utils/referralRate.js` — estado FINAL (si tu repo no lo tocó desde la migración a 1girox, pisalo entero; si no, aplicá el diff del 1.4)

```js
/**
 * referralRate.js — Cuánto se lleva el referidor.
 *
 * REGLA DE NEGOCIO (owner, 2026-07-31):
 *
 *     comisión del referidor = netwin del referido × 8%
 *
 * Una sola tasa, aplicada UNA sola vez. Si un referido perdió $100.000 jugando en el
 * mes, su referidor cobra $8.000 en fichas.
 *
 * ⚠️ HISTORIA — por qué esto está comentado tan fuerte:
 * El default era 7% y se aplicaba SOBRE una comisión previa (en JUGAYGANA, la que nos
 * daba el proveedor sobre el GGR). O sea, dos tasas encadenadas. Al migrar a 1girox
 * —donde el proveedor devuelve todas sus comisiones en 0— se puso un 8% en el primer
 * eslabón y quedó multiplicándose por el 7% de acá: el referidor cobraba **0,56%** del
 * netwin en vez del 8%. El encadenamiento se eliminó (ver
 * referralCalculationService.fetchReferredRevenue) y esta es ahora la ÚNICA tasa del
 * cálculo. Si alguien vuelve a multiplicar por otra cosa, se repite el bug.
 *
 * Configurable por env `GIROX_REFERRAL_COMMISSION_PCT` (en PORCENTAJE: 8 = 8%), y por
 * usuario con `referralRateOverride` (en DECIMAL: 0.08 = 8%) para acuerdos puntuales.
 */

/** Tasa por defecto, en decimal. 0.08 = 8% del netwin del referido. */
// #307 (owner 2026-09-28): baja de 8% a 3%. El valor VIVO se lee del comando
// /sys_referidos_pct (sección COMANDOS del panel) vía resolveReferralRate().
const DEFAULT_REFERRAL_RATE = 0.03;
const REFERRAL_PCT_COMMAND = '/sys_referidos_pct';
let _cmdRate = null; // último % leído del comando (decimal), lo fija resolveReferralRate()

/**
 * Tasa configurada por entorno, en decimal.
 *
 * Getter LAZY a propósito: los secrets/env se cargan desde SSM en el bootstrap async,
 * DESPUÉS de los `require()`. Leerlo en el top-level congelaría el default (mismo
 * patrón que `hgcashService.getToken()`).
 */
function getConfiguredRate() {
  if (_cmdRate != null) return _cmdRate; // #307: el comando manda
  const pct = Number(process.env.GIROX_REFERRAL_COMMISSION_PCT);
  // Sanea basura (NaN, negativos, >100) cayendo al default acordado: un porcentaje
  // inválido nunca debe traducirse en pagar de más ni en no pagar nada.
  if (Number.isFinite(pct) && pct > 0 && pct <= 100) return pct / 100;
  return DEFAULT_REFERRAL_RATE;
}

/**
 * Tasa de comisión aplicable a un referidor.
 * @param {Object} user - documento del usuario referidor
 * @returns {number} tasa decimal (ej. 0.08 para 8%)
 */
function getReferralRateForUser(user) {
  // Override por usuario (acuerdos puntuales). Se valida el rango: un valor corrupto
  // acá se paga en plata real.
  if (user && typeof user.referralRateOverride === 'number' &&
      Number.isFinite(user.referralRateOverride) &&
      user.referralRateOverride > 0 && user.referralRateOverride <= 1) {
    return user.referralRateOverride;
  }
  return getConfiguredRate();
}

/**
 * #307: lee el % del comando /sys_referidos_pct (texto = solo el número, ej. "3"
 * o "3%"). Válido 0 < pct ≤ 100. Si el comando no existe, está vacío o es
 * inválido → env / default. Llamar ANTES de un cálculo (async).
 */
async function resolveReferralRate() {
  try {
    const { Command } = require('../models');
    const cmd = await Command.findOne({ name: REFERRAL_PCT_COMMAND, isActive: true }).lean();
    const m = cmd && cmd.response ? String(cmd.response).replace(',', '.').match(/\d+(\.\d+)?/) : null;
    const pct = m ? Number(m[0]) : NaN;
    _cmdRate = (Number.isFinite(pct) && pct > 0 && pct <= 100) ? pct / 100 : null;
  } catch (_) { _cmdRate = null; }
  return getConfiguredRate();
}

/**
 * #317 (réplica #169 del gemelo): tasa GLOBAL plana en memoria. Acá la fuente sigue
 * siendo el comando /sys_referidos_pct (#307) — server.js la relee al arrancar y cada
 * 60 s (`refreshReferralRateFromCommand`) y el endpoint /api/admin/referral-rate la
 * escribe en el comando y la fija con `setGlobalReferralRate`. null = env/default.
 * ⚠️ Esta es la tasa PLANA: la que se PAGA sale de
 * referralTierService.resolveReferralRate(user) (override > niveles > plana).
 */
function setGlobalReferralRate(rate) {
  const n = Number(rate);
  _cmdRate = (rate != null && Number.isFinite(n) && n > 0 && n <= 1) ? n : null;
}
function getGlobalReferralRate() { return getConfiguredRate(); }

module.exports = {
  DEFAULT_REFERRAL_RATE,
  REFERRAL_PCT_COMMAND,
  getConfiguredRate,
  getReferralRateForUser,
  resolveReferralRate,
  // #317: alias con nombre claro (no confundir con referralTierService.resolveReferralRate(user))
  refreshReferralRateFromCommand: resolveReferralRate,
  setGlobalReferralRate,
  getGlobalReferralRate
};
```

### 1.4 Diffs de `referralCalculationService.js`, `referralController.js`, `referralRoutes.js` (y el de `referralRate.js` por si preferís aplicarlo)

Aplicá estos hunks a mano o con `git apply --3way` (son contra el estado previo a #307 de
PAUTANUEVAsantino; si tu repo divergió, adaptá el contexto). Lo importante:
- **Calculation:** la tasa de CADA referidor = `(await referralTierService.resolveReferralRate(referrer)).rate`
  (se graba en `ReferralCommission.referralRate`); `await resolveReferralRate()` del util antes
  del cálculo (relee `/sys_referidos_pct`); exportar `getReferredNetwinForRange`.
- **Controller:** `referralBaseUrl(req)` devuelve `PUBLIC_BASE_URL/` (raíz, ya no
  `/linkreferido`); `getMyReferralInfo` devuelve `referralRate` real; `adminGetUserReferrals`
  suma cargas/activo/netwin histórico por referido + `activity`; NUEVO `adminGetReferralActivity`.
- **Routes:** `GET /admin/activity`.

```diff
diff --git a/src/services/referralCalculationService.js b/src/services/referralCalculationService.js
index cc606a5..c24e486 100644
--- a/src/services/referralCalculationService.js
+++ b/src/services/referralCalculationService.js
@@ -20,7 +20,10 @@
 const { v4: uuidv4 } = require('uuid');
 const { User, ReferralCommission, ReferralPayout } = require('../models');
 const giroxService = require('./giroxService');
-const { getReferralRateForUser, getConfiguredRate } = require('../utils/referralRate');
+const { getConfiguredRate, resolveReferralRate } = require('../utils/referralRate');
+// #317 (réplica #171): la tasa de CADA referidor sale de los NIVELES por referidos activos
+// (override por usuario > niveles > % plano de /sys_referidos_pct). Nunca getReferralRateForUser.
+const referralTierService = require('./referralTierService');
 const { getPeriodRange } = require('../utils/periodKey');
 const logger = require('../utils/logger');
 
@@ -275,6 +278,24 @@ async function fetchReferredRevenue(referredUser, periodKey, fromDate, toDate) {
   return mapStatsToRevenue(r);
 }
 
+/**
+ * #317 — Netwin de UN referido en un rango, con la MISMA lectura y el MISMO mapeo que usa el
+ * cálculo mensual (getPlayerStats + mapStatsToRevenue → mismo alcance casino/total). Lo usan el
+ * tablero del cliente y el admin (GET /api/referrals/dashboard, /api/admin/referrals/:id/netwin)
+ * para que lo que ve el cliente sea exactamente lo que se le paga.
+ * @returns {Promise<number|null>} netwin del rango (positivo = el referido perdió) o null si no
+ *          se pudo leer (1girox caído / sin username).
+ */
+async function getReferredNetwinForRange(referredUser, fromDate, toDate, tag = 'ref-dashboard') {
+  if (!referredUser || !referredUser.username) return null;
+  try {
+    const r = await giroxService.getPlayerStats(referredUser.username, fromDate, toDate, `${tag} ${referredUser.username}`);
+    if (!r || !r.success) return null;
+    const rev = mapStatsToRevenue(r);
+    return Number(rev.totalGgr) || 0;
+  } catch (_) { return null; }
+}
+
 /**
  * Calcular comisiones de referidos para un período
  * @param {string} periodKey - e.g. "2026-04"
@@ -357,6 +378,7 @@ async function calculateCommissionsForPeriod(periodKey, options = {}) {
   // mes). Se mantiene el mismo comportamiento que antes para no mover la base de
   // cálculo sin verificarlo; si se corrige, corregir también los reembolsos.
   const { fromDate, toDate } = getPeriodRange(periodKey);
+  await resolveReferralRate(); // #307: % vivo desde COMANDOS (/sys_referidos_pct)
   const usersNeedingRevenue = referredUsers.filter(u => !u.excludedFromReferral);
   const prefetch = await fetchRevenuesForUsers(usersNeedingRevenue, periodKey, fromDate, toDate);
   const revenueByReferredId = prefetch.revenueByUserId;
@@ -374,7 +396,8 @@ async function calculateCommissionsForPeriod(periodKey, options = {}) {
       continue;
     }
 
-    const referralRate = getReferralRateForUser(referrer);
+    // #317: tasa por nivel (referidos activos). Se graba en ReferralCommission.referralRate.
+    const referralRate = (await referralTierService.resolveReferralRate(referrer)).rate;
 
     // ── Load authoritative settlement state from payout history ──────────────
     // ReferralPayout documents are the source of truth for what was already paid.
@@ -883,5 +906,6 @@ async function getPendingCommissionsSummary(periodKey) {
 
 module.exports = {
   calculateCommissionsForPeriod,
-  getPendingCommissionsSummary
+  getPendingCommissionsSummary,
+  getReferredNetwinForRange
 };
```

```diff
diff --git a/src/controllers/referralController.js b/src/controllers/referralController.js
index 22c48ae..bbcacc1 100644
--- a/src/controllers/referralController.js
+++ b/src/controllers/referralController.js
@@ -9,19 +9,29 @@ const referralCalculationService = require('../services/referralCalculationServi
 const referralPayoutService = require('../services/referralPayoutService');
 const { getCurrentPeriodKey, getPreviousPeriodKey, getPeriodLabel, getPeriodRange, getNextPeriodLabel } = require('../utils/periodKey');
 const { generateReferralCode } = require('../utils/referralCode');
+const referralTierService = require('../services/referralTierService'); // #171
+const { getGlobalReferralRate } = require('../utils/referralRate'); // #174
 const logger = require('../utils/logger');
 
 // Validate period key format (YYYY-MM)
 const PERIOD_KEY_REGEX = /^\d{4}-\d{2}$/;
 // Allowed status values for payout queries
 const VALID_PAYOUT_STATUSES = ['pending', 'paid', 'failed', 'cancelled'];
-// Dominio de los links de referido que ve el usuario final.
-// GETTER LAZY a propósito (fix 2026-08-05): PUBLIC_BASE_URL llega desde SSM en
-// el bootstrap async — una const acá quedaba clavada en el default viejo
-// (vipcargas.com) aunque la env estuviera bien. Mismo patrón que
-// getPublicBaseUrl() de server.js.
-function referralBaseUrl() {
-  return (process.env.PUBLIC_BASE_URL || 'https://cargas1girox.com').replace(/\/$/, '') + '/linkreferido';
+// Brand domain used for referral links shown to end users
+// #168: el link sale del dominio PROPIO (antes apuntaba a vipcargas.com, el hermano). La PWA
+// lee ?ref= en la raíz; /linkreferido redirige por compatibilidad.
+// Base del link: PUBLIC_BASE_URL si está seteada; si no, el host del request (Render de pruebas
+// → link de Render; EB → el dominio de 1girox). GETTER LAZY: PUBLIC_BASE_URL llega desde SSM
+// en el bootstrap async (fix 2026-08-05 de este repo: una const quedaba en el default).
+function referralBaseUrl(req) {
+  const fromEnv = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
+  if (fromEnv) return fromEnv + '/';
+  const host = req && req.get && req.get('host');
+  if (host) {
+    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
+    return `${proto}://${host}/`;
+  }
+  return 'https://cargas1girox.com/';
 }
 
 /**
@@ -90,7 +100,7 @@ const getMyReferralInfo = asyncHandler(async (req, res) => {
   }
 
   const referralLink = user.referralCode
-    ? `${referralBaseUrl()}?ref=${encodeURIComponent(user.referralCode)}`
+    ? `${referralBaseUrl(req)}?ref=${encodeURIComponent(user.referralCode)}`
     : null;
 
   // Contar referidos
@@ -116,6 +126,7 @@ const getMyReferralInfo = asyncHandler(async (req, res) => {
     data: {
       referralCode: user.referralCode,
       referralLink,
+      referralRate: (await referralTierService.resolveReferralRate(user)).rate, // #143/#171: el % real que se le paga (nivel por referidos activos)
       totalReferred,
       activeReferred,
       currentPeriod,
@@ -500,9 +511,30 @@ const adminGetUserReferrals = asyncHandler(async (req, res) => {
   if (!user) throw new AppError('Usuario no encontrado', 404);
 
   // Usuarios referidos por este usuario
-  const referredUsers = await User.find({ referredByUserId: safeUserId })
-    .select('id username referredAt referralStatus excludedFromReferral jugayganaUsername jugayganaUserId')
+  const referredUsersRaw = await User.find({ referredByUserId: safeUserId })
+    .select('id username referredAt createdAt referralStatus excludedFromReferral jugayganaUsername jugayganaUserId isBlocked')
     .lean();
+  // #174: cargas reales por referido (sin regalos) + si califica como "activo" para el nivel.
+  const tierCfg = await referralTierService.getReferralTiersConfig();
+  const depBy = await referralTierService.depositsByReferred(safeUserId);
+  // #175 netwin HISTÓRICO por referido según los cálculos mensuales ya hechos (ReferralCommission).
+  const histAgg = await ReferralCommission.aggregate([
+    { $match: { referrerUserId: safeUserId } },
+    { $group: { _id: '$referredUserId', netwin: { $sum: '$totalOwnerRevenue' }, commission: { $sum: { $add: [{ $ifNull: ['$settledCommissionAmount', 0] }, { $cond: [{ $gt: ['$commissionAmount', 0] }, '$commissionAmount', 0] }] } }, periods: { $sum: 1 }, lastPeriod: { $max: '$periodKey' } } }
+  ]);
+  const histBy = new Map(histAgg.map(h => [h._id, h]));
+  const referredUsers = referredUsersRaw.map(ru => {
+    const d = depBy.get(ru.id);
+    const h = histBy.get(ru.id);
+    return Object.assign({}, ru, {
+      referredAt: ru.referredAt || ru.createdAt,
+      charges: d ? d.count : 0, totalCharged: d ? Math.round(d.total) : 0, lastChargeAt: d ? d.last : null,
+      qualified: !!(d && d.total >= tierCfg.minChargedARS),
+      netwinHist: h ? Math.round(h.netwin) : 0, commissionHist: h ? Math.round(h.commission) : 0, periodsCalculated: h ? h.periods : 0, lastPeriodCalculated: h ? h.lastPeriod : null
+    });
+  }).sort((a, b) => (b.netwinHist - a.netwinHist) || (b.totalCharged - a.totalCharged) || (new Date(b.referredAt || 0) - new Date(a.referredAt || 0)));
+  const activeCount = referredUsers.filter(r => r.qualified).length;
+  const level = await referralTierService.resolveReferralRate(user, { activeCount });
 
   // Comisiones del período (o todas)
   const commissionQuery = { referrerUserId: safeUserId };
@@ -575,12 +607,17 @@ const adminGetUserReferrals = asyncHandler(async (req, res) => {
         id: user.id,
         username: user.username,
         referralCode: user.referralCode,
-        referralLink: user.referralCode ? `${referralBaseUrl()}?ref=${encodeURIComponent(user.referralCode)}` : null,
+        referralLink: user.referralCode ? `${referralBaseUrl(req)}?ref=${encodeURIComponent(user.referralCode)}` : null,
         referralTier: user.referralTier,
         referralRateOverride: user.referralRateOverride,
         excludedFromReferral: user.excludedFromReferral
       },
       referredUsers,
+      // #174 actividad del referidor: activos (≥ mínimo), con carga, nivel actual.
+      activity: { minChargedARS: tierCfg.minChargedARS, active: activeCount, charged: referredUsers.filter(r => r.charges > 0).length,
+        totalCharged: referredUsers.reduce((a, r) => a + r.totalCharged, 0), pct: level.pct, mode: level.mode,
+        netwinHist: referredUsers.reduce((a, r) => a + r.netwinHist, 0), commissionHist: referredUsers.reduce((a, r) => a + r.commissionHist, 0),
+        nextTier: level.nextTier ? { count: level.nextTier.count, pct: level.nextTier.pct, missing: level.missing } : null },
       commissions: enrichedCommissions,
       payouts: payouts.map(p => ({
         ...p,
@@ -851,6 +888,209 @@ const adminGetReferralRelationships = asyncHandler(async (req, res) => {
   });
 });
 
+/**
+ * GET /api/referrals/admin/activity?months=6
+ * #174 — Actividad y evolución del programa de referidos para el admin: cuántos referidos hay,
+ * cuántos cargaron / son activos (≥ mínimo del nivel), cuántos entraron en los últimos 7 y 30
+ * días contra la ventana anterior, serie diaria de 30 días, tabla por mes y actividad por
+ * referidor. Todo sale de User (referredByUserId) + Transaction deposit reales (sin regalos)
+ * + ReferralCommission/ReferralPayout; NO consulta 1girox (rápido, sin netwin en vivo).
+ * Fechas en día argentino (UTC-3 fijo, mismo criterio que _artDayRange en server.js).
+ */
+const ART_OFFSET_MS = 3 * 60 * 60 * 1000;
+function _artDayKey(d) { return new Date(new Date(d).getTime() - ART_OFFSET_MS).toISOString().slice(0, 10); }
+function _artMonthKey(d) { return _artDayKey(d).slice(0, 7); }
+function _addMonths(key, n) {
+  const [y, m] = key.split('-').map(Number);
+  const t = y * 12 + (m - 1) + n;
+  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
+}
+function _pctChange(cur, prev) {
+  if (!prev) return cur ? null : 0;
+  return Math.round(((cur - prev) / prev) * 100);
+}
+
+const adminGetReferralActivity = asyncHandler(async (req, res) => {
+  const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 6));
+  const cfg = await referralTierService.getReferralTiersConfig();
+  const minCharged = cfg.minChargedARS;
+  const now = new Date();
+  const todayKey = _artDayKey(now);
+  const thisMonth = _artMonthKey(now);
+  const firstMonth = _addMonths(thisMonth, -(months - 1));
+  // Inicio del rango mensual en UTC (00:00 ART del día 1 del primer mes).
+  const rangeStart = new Date(new Date(firstMonth + '-01T00:00:00Z').getTime() + ART_OFFSET_MS);
+  const dayStart60 = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
+
+  const referred = await User.find({ referredByUserId: { $ne: null, $exists: true } })
+    .select('id username referredByUserId referredAt createdAt isBlocked excludedFromReferral')
+    .lean();
+  const ids = referred.map(r => r.id);
+  const depositMatch = { userId: { $in: ids }, type: 'deposit', status: 'completed', 'metadata.source': { $nin: referralTierService.NON_BANK_SOURCES } };
+
+  const [depByUser, depByMonth, depByDay, commByPeriod, paidByPeriod] = await Promise.all([
+    ids.length ? Transaction.aggregate([
+      { $match: depositMatch },
+      { $group: { _id: '$userId', total: { $sum: '$amount' }, count: { $sum: 1 }, first: { $min: '$timestamp' }, last: { $max: '$timestamp' } } }
+    ]) : [],
+    ids.length ? Transaction.aggregate([
+      { $match: Object.assign({ timestamp: { $gte: rangeStart } }, depositMatch) },
+      { $group: { _id: { $dateToString: { format: '%Y-%m', date: { $subtract: ['$timestamp', ART_OFFSET_MS] } } }, total: { $sum: '$amount' }, count: { $sum: 1 }, users: { $addToSet: '$userId' } } }
+    ]) : [],
+    ids.length ? Transaction.aggregate([
+      { $match: Object.assign({ timestamp: { $gte: dayStart60 } }, depositMatch) },
+      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $subtract: ['$timestamp', ART_OFFSET_MS] } } }, total: { $sum: '$amount' }, count: { $sum: 1 }, users: { $addToSet: '$userId' } } }
+    ]) : [],
+    ReferralCommission.aggregate([
+      { $match: { periodKey: { $gte: firstMonth } } },
+      { $group: { _id: '$periodKey', commission: { $sum: { $add: [{ $ifNull: ['$settledCommissionAmount', 0] }, { $cond: [{ $gt: ['$commissionAmount', 0] }, '$commissionAmount', 0] }] } },
+        withNetwin: { $sum: { $cond: [{ $gt: ['$totalOwnerRevenue', 0] }, 1, 0] } }, referrers: { $addToSet: '$referrerUserId' }, rows: { $sum: 1 } } }
+    ]),
+    ReferralPayout.aggregate([
+      { $match: { status: 'paid', periodKey: { $gte: firstMonth } } },
+      { $group: { _id: '$periodKey', paid: { $sum: '$totalCommissionAmount' }, count: { $sum: 1 } } }
+    ])
+  ]);
+
+  const depMap = new Map(depByUser.map(d => [d._id, { total: Number(d.total) || 0, count: d.count, first: d.first, last: d.last }]));
+  const monthDep = new Map(depByMonth.map(m => [m._id, { total: Number(m.total) || 0, count: m.count, users: (m.users || []).length }]));
+  const dayDep = new Map(depByDay.map(d => [d._id, { total: Number(d.total) || 0, count: d.count, users: (d.users || []).length }]));
+  const commMap = new Map(commByPeriod.map(c => [c._id, c]));
+  const paidMap = new Map(paidByPeriod.map(p => [p._id, p]));
+
+  // ── Totales ──
+  let charged = 0, active = 0, blocked = 0, totalCharged = 0;
+  for (const r of referred) {
+    const d = depMap.get(r.id);
+    if (r.isBlocked) blocked++;
+    if (d) { charged++; totalCharged += d.total; if (d.total >= minCharged) active++; }
+  }
+
+  // ── Ventanas 7 / 30 días (por día ART) ──
+  const dayKeys = [];
+  for (let i = 59; i >= 0; i--) dayKeys.push(_artDayKey(new Date(now.getTime() - i * 24 * 3600 * 1000)));
+  const newByDay = new Map(), firstByDay = new Map();
+  for (const r of referred) {
+    const k = _artDayKey(r.referredAt || r.createdAt);
+    newByDay.set(k, (newByDay.get(k) || 0) + 1);
+    const d = depMap.get(r.id);
+    if (d && d.first) { const fk = _artDayKey(d.first); firstByDay.set(fk, (firstByDay.get(fk) || 0) + 1); }
+  }
+  const sumWindow = (map, keys, field) => keys.reduce((a, k) => { const v = map.get(k); return a + (v == null ? 0 : (field ? (v[field] || 0) : v)); }, 0);
+  const win = (n) => {
+    const cur = dayKeys.slice(60 - n), prev = dayKeys.slice(60 - 2 * n, 60 - n);
+    const mk = (keys) => ({ newReferred: sumWindow(newByDay, keys), firstDeposits: sumWindow(firstByDay, keys), depositors: null, depositTotal: sumWindow(dayDep, keys, 'total'), depositCount: sumWindow(dayDep, keys, 'count') });
+    const c = mk(cur), p = mk(prev);
+    return { days: n, current: c, previous: p, change: { newReferred: _pctChange(c.newReferred, p.newReferred), firstDeposits: _pctChange(c.firstDeposits, p.firstDeposits), depositTotal: _pctChange(c.depositTotal, p.depositTotal) } };
+  };
+  const windows = { last7: win(7), last30: win(30) };
+  const daily = dayKeys.slice(30).map(k => ({ day: k, newReferred: newByDay.get(k) || 0, firstDeposits: firstByDay.get(k) || 0, depositTotal: (dayDep.get(k) || {}).total || 0, depositors: (dayDep.get(k) || {}).users || 0 }));
+
+  // ── Veredicto: mejora / estable / baja (nuevos + primeras cargas, 30 vs 30 anteriores) ──
+  const w = windows.last30;
+  const score = (x) => x.newReferred + 2 * x.firstDeposits;
+  const sc = score(w.current), sp = score(w.previous);
+  let trend = 'flat';
+  if (sc === 0 && sp === 0) trend = 'none';
+  else if (sp === 0 || sc >= sp * 1.15) trend = 'up';
+  else if (sc <= sp * 0.85) trend = 'down';
+
+  // ── Por referidor ──
+  const byReferrer = new Map();
+  const firstReferralByReferrer = new Map();
+  const cut30 = now.getTime() - 30 * 24 * 3600 * 1000;
+  for (const r of referred) {
+    const rid = r.referredByUserId;
+    let s = byReferrer.get(rid);
+    if (!s) { s = { referred: 0, charged: 0, active: 0, new30: 0, totalCharged: 0, lastReferredAt: null, lastChargeAt: null }; byReferrer.set(rid, s); }
+    const at = r.referredAt || r.createdAt;
+    const atMs = at ? new Date(at).getTime() : 0;
+    s.referred++;
+    if (atMs >= cut30) s.new30++;
+    if (!s.lastReferredAt || atMs > new Date(s.lastReferredAt).getTime()) s.lastReferredAt = at;
+    const fr = firstReferralByReferrer.get(rid);
+    if (!fr || atMs < fr) firstReferralByReferrer.set(rid, atMs);
+    const d = depMap.get(r.id);
+    if (d) {
+      s.charged++; s.totalCharged += d.total;
+      if (d.total >= minCharged) s.active++;
+      if (d.last && (!s.lastChargeAt || new Date(d.last) > new Date(s.lastChargeAt))) s.lastChargeAt = d.last;
+    }
+  }
+  const referrerIds = Array.from(byReferrer.keys());
+  const referrerDocs = referrerIds.length ? await User.find({ id: { $in: referrerIds } }).select('id username referralRateOverride excludedFromReferral').lean() : [];
+  // #175 ranking: netwin y comisión históricos (todos los cálculos) + del período en curso si ya se calculó.
+  const histByReferrer = new Map((await ReferralCommission.aggregate([
+    { $match: { referrerUserId: { $in: referrerIds } } },
+    { $group: { _id: '$referrerUserId', netwin: { $sum: '$totalOwnerRevenue' },
+      commission: { $sum: { $add: [{ $ifNull: ['$settledCommissionAmount', 0] }, { $cond: [{ $gt: ['$commissionAmount', 0] }, '$commissionAmount', 0] }] } },
+      netwinCurrent: { $sum: { $cond: [{ $eq: ['$periodKey', thisMonth] }, '$totalOwnerRevenue', 0] } },
+      withNetwin: { $sum: { $cond: [{ $gt: ['$totalOwnerRevenue', 0] }, 1, 0] } } } }
+  ])).map(h => [h._id, h]));
+  const referrerDoc = new Map(referrerDocs.map(u => [u.id, u]));
+  const referrers = [];
+  for (const [rid, s] of byReferrer) {
+    const u = referrerDoc.get(rid);
+    let pct = null, mode = 'tiers';
+    if (u && typeof u.referralRateOverride === 'number') { pct = Math.round(u.referralRateOverride * 10000) / 100; mode = 'override'; }
+    else if (cfg.enabled) { pct = referralTierService.levelForCount(cfg, s.active).pct; }
+    else { pct = Math.round(getGlobalReferralRate() * 10000) / 100; mode = 'flat'; }
+    const lv = cfg.enabled ? referralTierService.levelForCount(cfg, s.active) : null;
+    const h = histByReferrer.get(rid);
+    referrers.push(Object.assign({ id: rid, username: u ? u.username : '(no encontrado)', excluded: !!(u && u.excludedFromReferral), pct, mode,
+      nextTier: lv && lv.nextTier ? { count: lv.nextTier.count, pct: lv.nextTier.pct, missing: lv.missing } : null,
+      netwinHist: h ? Math.round(h.netwin) : 0, commissionHist: h ? Math.round(h.commission) : 0, netwinCurrent: h ? Math.round(h.netwinCurrent) : 0, referredWithNetwin: h ? h.withNetwin : 0 }, s));
+  }
+  referrers.sort((a, b) => (b.active - a.active) || (b.charged - a.charged) || (b.referred - a.referred));
+  const movers = referrers.filter(r => r.new30 > 0).sort((a, b) => b.new30 - a.new30).slice(0, 10)
+    .map(r => ({ id: r.id, username: r.username, new30: r.new30, active: r.active, referred: r.referred }));
+  const levelDist = { none: 0 };
+  for (const t of cfg.tiers) levelDist[String(t.count)] = 0;
+  for (const r of referrers) {
+    if (r.mode !== 'tiers') continue;
+    const lv = referralTierService.levelForCount(cfg, r.active);
+    if (lv.tier) levelDist[String(lv.tier.count)]++; else levelDist.none++;
+  }
+
+  // ── Por mes ──
+  const newReferrersByMonth = new Map();
+  for (const [, ms] of firstReferralByReferrer) { const k = _artMonthKey(new Date(ms)); newReferrersByMonth.set(k, (newReferrersByMonth.get(k) || 0) + 1); }
+  const newByMonth = new Map(), firstByMonth = new Map();
+  for (const r of referred) {
+    const k = _artMonthKey(r.referredAt || r.createdAt);
+    newByMonth.set(k, (newByMonth.get(k) || 0) + 1);
+    const d = depMap.get(r.id);
+    if (d && d.first) { const fk = _artMonthKey(d.first); firstByMonth.set(fk, (firstByMonth.get(fk) || 0) + 1); }
+  }
+  const monthly = [];
+  for (let i = 0; i < months; i++) {
+    const k = _addMonths(firstMonth, i);
+    const md = monthDep.get(k) || { total: 0, count: 0, users: 0 };
+    const c = commMap.get(k), p = paidMap.get(k);
+    monthly.push({
+      month: k, label: getPeriodLabel(k), current: k === thisMonth,
+      newReferred: newByMonth.get(k) || 0, newReferrers: newReferrersByMonth.get(k) || 0, firstDeposits: firstByMonth.get(k) || 0,
+      depositors: md.users, depositTotal: Math.round(md.total), depositCount: md.count,
+      withNetwin: c ? c.withNetwin : 0, commissionTotal: c ? Math.round(c.commission) : 0, referrersWithCommission: c ? (c.referrers || []).length : 0,
+      calculated: !!c, paidTotal: p ? Math.round(p.paid) : 0, payouts: p ? p.count : 0
+    });
+  }
+  for (let i = 0; i < monthly.length; i++) {
+    const prev = i > 0 ? monthly[i - 1] : null;
+    monthly[i].change = prev ? { newReferred: _pctChange(monthly[i].newReferred, prev.newReferred), firstDeposits: _pctChange(monthly[i].firstDeposits, prev.firstDeposits), depositTotal: _pctChange(monthly[i].depositTotal, prev.depositTotal) } : null;
+  }
+
+  res.json({
+    status: 'success',
+    data: {
+      generatedAt: now, today: todayKey, minChargedARS: minCharged, tiersEnabled: cfg.enabled, tiers: cfg.tiers,
+      totals: { referred: referred.length, referrers: referrerIds.length, charged, active, noCharge: referred.length - charged, blocked, totalCharged: Math.round(totalCharged),
+        referrersWithActive: referrers.filter(r => r.active > 0).length, referrersAtLevel: referrers.filter(r => r.mode === 'tiers' && r.pct > 0).length, levelDist },
+      windows, daily, trend, monthly, referrers, movers
+    }
+  });
+});
+
 module.exports = {
   getMyReferralInfo,
   getMyReferralSummary,
@@ -862,5 +1102,6 @@ module.exports = {
   adminCalculate,
   adminPreview,
   adminPayout,
-  adminGetReferralRelationships
+  adminGetReferralRelationships,
+  adminGetReferralActivity
 };
```

```diff
diff --git a/src/routes/referralRoutes.js b/src/routes/referralRoutes.js
index 88d1170..a0ab0dd 100644
--- a/src/routes/referralRoutes.js
+++ b/src/routes/referralRoutes.js
@@ -30,6 +30,9 @@ router.get('/pending', authenticate, referralController.getMyPendingCommissions)
 // GET /api/referrals/admin/summary - resumen de todos los referidores
 router.get('/admin/summary', authenticate, authorize('admin'), referralController.adminGetReferralsSummary);
 
+// GET /api/referrals/admin/activity - actividad y evolución (referidos nuevos, activos, por mes) — #174
+router.get('/admin/activity', authenticate, authorize('admin'), referralController.adminGetReferralActivity);
+
 // GET /api/referrals/admin/payouts - historial de todos los pagos
 router.get('/admin/payouts', authenticate, authorize('admin'), referralController.adminGetPayouts);
 
```

```diff
diff --git a/src/utils/referralRate.js b/src/utils/referralRate.js
index dde4cac..da07e42 100644
--- a/src/utils/referralRate.js
+++ b/src/utils/referralRate.js
@@ -22,7 +22,11 @@
  */
 
 /** Tasa por defecto, en decimal. 0.08 = 8% del netwin del referido. */
-const DEFAULT_REFERRAL_RATE = 0.08;
+// #307 (owner 2026-09-28): baja de 8% a 3%. El valor VIVO se lee del comando
+// /sys_referidos_pct (sección COMANDOS del panel) vía resolveReferralRate().
+const DEFAULT_REFERRAL_RATE = 0.03;
+const REFERRAL_PCT_COMMAND = '/sys_referidos_pct';
+let _cmdRate = null; // último % leído del comando (decimal), lo fija resolveReferralRate()
 
 /**
  * Tasa configurada por entorno, en decimal.
@@ -32,6 +36,7 @@ const DEFAULT_REFERRAL_RATE = 0.08;
  * patrón que `hgcashService.getToken()`).
  */
 function getConfiguredRate() {
+  if (_cmdRate != null) return _cmdRate; // #307: el comando manda
   const pct = Number(process.env.GIROX_REFERRAL_COMMISSION_PCT);
   // Sanea basura (NaN, negativos, >100) cayendo al default acordado: un porcentaje
   // inválido nunca debe traducirse en pagar de más ni en no pagar nada.
@@ -55,8 +60,44 @@ function getReferralRateForUser(user) {
   return getConfiguredRate();
 }
 
+/**
+ * #307: lee el % del comando /sys_referidos_pct (texto = solo el número, ej. "3"
+ * o "3%"). Válido 0 < pct ≤ 100. Si el comando no existe, está vacío o es
+ * inválido → env / default. Llamar ANTES de un cálculo (async).
+ */
+async function resolveReferralRate() {
+  try {
+    const { Command } = require('../models');
+    const cmd = await Command.findOne({ name: REFERRAL_PCT_COMMAND, isActive: true }).lean();
+    const m = cmd && cmd.response ? String(cmd.response).replace(',', '.').match(/\d+(\.\d+)?/) : null;
+    const pct = m ? Number(m[0]) : NaN;
+    _cmdRate = (Number.isFinite(pct) && pct > 0 && pct <= 100) ? pct / 100 : null;
+  } catch (_) { _cmdRate = null; }
+  return getConfiguredRate();
+}
+
+/**
+ * #317 (réplica #169 del gemelo): tasa GLOBAL plana en memoria. Acá la fuente sigue
+ * siendo el comando /sys_referidos_pct (#307) — server.js la relee al arrancar y cada
+ * 60 s (`refreshReferralRateFromCommand`) y el endpoint /api/admin/referral-rate la
+ * escribe en el comando y la fija con `setGlobalReferralRate`. null = env/default.
+ * ⚠️ Esta es la tasa PLANA: la que se PAGA sale de
+ * referralTierService.resolveReferralRate(user) (override > niveles > plana).
+ */
+function setGlobalReferralRate(rate) {
+  const n = Number(rate);
+  _cmdRate = (rate != null && Number.isFinite(n) && n > 0 && n <= 1) ? n : null;
+}
+function getGlobalReferralRate() { return getConfiguredRate(); }
+
 module.exports = {
   DEFAULT_REFERRAL_RATE,
+  REFERRAL_PCT_COMMAND,
   getConfiguredRate,
-  getReferralRateForUser
+  getReferralRateForUser,
+  resolveReferralRate,
+  // #317: alias con nombre claro (no confundir con referralTierService.resolveReferralRate(user))
+  refreshReferralRateFromCommand: resolveReferralRate,
+  setGlobalReferralRate,
+  getGlobalReferralRate
 };
```

**PROBAR 1:** `node --check` en los 6 archivos. `grep -n getReferralRateForUser src/` → solo
tiene que quedar la definición en `referralRate.js` (nadie la usa para pagar).

---

## FEATURE 2 — `server.js`

### 2.1 Requires (al lado de `const { generateReferralCode } = require('./src/utils/referralCode');`)

```js
// #317 réplica referidos (#168-#175 del gemelo AUTOREEMBOLSOS), adaptada a 1girox.
const ReferralMilestoneClaim = require('./src/models/ReferralMilestoneClaim'); // solo historial (premios en plata discontinuados)
const _periodKey = require('./src/utils/periodKey');
const { setGlobalReferralRate, getGlobalReferralRate, refreshReferralRateFromCommand, REFERRAL_PCT_COMMAND } = require('./src/utils/referralRate');
const referralTiers = require('./src/services/referralTierService'); // niveles de % por referidos activos
```

### 2.2 Cron de pago automático (#307) + refresh del % plano (#317)

Va en la zona de crons (en PAUTANUEVAsantino, justo después del `setInterval` de
`_expireDailyRoulettePct`). Usa `_rouletteDateKeyART()` para el día ART.

```js
// ============================================================
// #307 (owner 2026-09-28): PAGO AUTOMÁTICO DE REFERIDOS el día 1 de cada mes
// (hora argentina) por el mes ANTERIOR: Calcular → Pagar, igual que los botones
// del panel (queda en Referidos → pagos con adminUsername 'auto-referidos' y
// Transaction referral_commission). Idempotente multi-instancia: la corrida se
// reserva con un Config `referral_autorun_<YYYY-MM>` creado atómicamente
// ($setOnInsert + upsert); la instancia que lo crea es la que corre. Si el
// server estaba caído el día 1, corre en cuanto vuelve (cualquier día del mes)
// y solo paga la diferencia no pagada (el servicio es incremental).
// ============================================================
function _referralPrevPeriodKeyART() {
  const [y, m] = _rouletteDateKeyART().split('-').map(Number);
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, '0')}`;
}
async function _runMonthlyReferralPayout() {
  const periodKey = _referralPrevPeriodKeyART();
  const key = `referral_autorun_${periodKey}`;
  let claimed = false;
  try {
    const r = await Config.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, value: { startedAt: new Date(), status: 'running' }, updatedBy: 'auto-referidos' } },
      { upsert: true, new: false, rawResult: true }
    );
    claimed = !!(r && r.lastErrorObject && r.lastErrorObject.upserted);
  } catch (e) {
    if (e && e.code === 11000) claimed = false; else throw e;
  }
  if (!claimed) return;
  logger.info(`[referidos] pago AUTOMÁTICO del período ${periodKey}: calculando…`);
  const out = { periodKey, startedAt: new Date(), status: 'running' };
  try {
    const calc = await referralCalculationService.calculateCommissionsForPeriod(periodKey, { dryRun: false });
    out.calc = { referrers: calc && calc.referrersProcessed, referreds: calc && calc.referredsProcessed, commissions: calc && calc.commissionsCreated, errors: calc && calc.errors ? calc.errors.length : 0 };
    const pay = await referralPayoutService.executePayoutsForPeriod(periodKey, { adminId: 'system', adminUsername: 'auto-referidos' });
    out.pay = { created: pay.payoutsCreated, failed: pay.payoutsFailed, skipped: pay.payoutsSkipped,
      total: (pay.details || []).reduce((a, d) => a + (Number(d && (d.totalCommissionAmount || d.amount)) || 0), 0) };
    out.status = pay.payoutsFailed > 0 ? (pay.payoutsCreated > 0 ? 'partial' : 'failed') : 'done';
    logger.info(`[referidos] pago AUTOMÁTICO ${periodKey}: pagos=${pay.payoutsCreated} fallidos=${pay.payoutsFailed} salteados=${pay.payoutsSkipped}`);
  } catch (e) {
    out.status = 'error'; out.error = String(e && e.message || e).slice(0, 300);
    logger.error(`[referidos] pago AUTOMÁTICO ${periodKey} falló: ${out.error}`);
  }
  out.finishedAt = new Date();
  await Config.updateOne({ key }, { $set: { value: out } }).catch(() => {});
}
const referralCalculationService = require('./src/services/referralCalculationService');
const referralPayoutService = require('./src/services/referralPayoutService');
// #317 (réplica #169): % PLANO de referidos en memoria. Fuente = comando /sys_referidos_pct
// (#307); se relee al arrancar y cada 60 s para que un cambio en COMANDOS (o en la card del
// panel) llegue a TODAS las instancias. Si falla, queda el último valor / env / 3%.
setTimeout(() => { refreshReferralRateFromCommand().catch(() => {}); }, 10 * 1000);
setInterval(() => { refreshReferralRateFromCommand().catch(() => {}); }, 60 * 1000);
setTimeout(() => { _runMonthlyReferralPayout().catch((e) => logger.warn(`[referidos] cron mensual falló: ${e.message}`)); }, 5 * 60 * 1000); // 5 min tras el arranque
setInterval(() => { _runMonthlyReferralPayout().catch((e) => logger.warn(`[referidos] cron mensual falló: ${e.message}`)); }, 60 * 60 * 1000); // cada hora (solo hace algo si falta el mes anterior)
```

### 2.3 Comandos sembrados en `systemCmds` de `initializeData()` (#307 + #308b)

```js
    {
      name: '/sys_referidos_pct',
      description: 'PORCENTAJE de comisión de referidos: solo el número (ej. 3 = el referidor cobra el 3% de lo que pierde su referido en el mes). Lo usa el pago AUTOMÁTICO del día 1 de cada mes y los botones Calcular/Pagar de Referidos. Vacío o inválido = 3%.',
      type: 'message',
      response: '3'
    },
    {
      name: '/sys_referidos_compartir',
      description: 'Mensaje que se comparte por WhatsApp desde la tarjeta "Invitá y ganá" (PREMIOS). Variables: {link} (link de invitación del cliente), {codigo}, {pct} (% de comisión), {username}. Si lo dejás vacío se usa el texto por defecto.',
      type: 'message',
      response: '🎰 Sumate a la sala con mi link y jugá con cargas automáticas en segundos 👉 {link}'
    },
```

### 2.4 `GET /linkreferido` → `/?ref=` (#317). Registrar ANTES del vanity `/:code`.

```js
// #317 (réplica #168): link de referido /linkreferido?ref=CODE → /?ref=CODE (la PWA lee
// ?ref= en la raíz). Cubre los links viejos que se compartieron con /linkreferido.
// Se registra ANTES del vanity /:code para que no la capture.
app.get('/linkreferido', (req, res) => {
  const ref = String(req.query.ref || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase();
  res.redirect(302, '/?ref=' + encodeURIComponent(ref));
});
```

### 2.5 `/api/rewards/summary` (solo si tu repo tiene el hub PREMIOS): campos `referralPct` / `referralMyPct` / `referralTiersOn` / `referralShareTpl`

Dentro del `try` donde se arma `out` (en PAUTANUEVAsantino, justo después de `out.depositMode`;
`username` es el del usuario del request):

```js
      // #308: % de comisión de referidos vigente (comando /sys_referidos_pct) para el hub.
      // #317: con NIVELES el copy dice "hasta el X%" (máximo alcanzable) y aparte el % propio;
      // todo sale de referralTierService.resolveReferralRate (override > niveles > plano).
      try {
        const _refU = await User.findOne({ id: userId }).select('id referralRateOverride').lean();
        const _lv = await referralTiers.resolveReferralRate(_refU || { id: userId });
        out.referralPct = _lv.mode === 'tiers' ? _lv.maxPct : _lv.pct;
        out.referralMyPct = _lv.pct;
        out.referralTiersOn = _lv.mode === 'tiers';
      } catch (e) { out.referralPct = 3; out.referralMyPct = null; out.referralTiersOn = false; }
      // #308b: plantilla del mensaje de WhatsApp (COMANDOS /sys_referidos_compartir);
      // el front reemplaza {link}/{codigo} con los datos de /api/referrals/me.
      try {
        out.referralShareTpl = await renderSystemCommand('/sys_referidos_compartir',
          '🎰 Sumate a la sala con mi link y jugá con cargas automáticas en segundos 👉 {link}',
          { username, pct: out.referralPct, link: '{link}', codigo: '{codigo}' });
      } catch (e) { out.referralShareTpl = null; }
```

### 2.6 Rutas nuevas (#317). Van DESPUÉS de `app.use('/api/referrals', referralRoutes);` y de la definición de `authMiddleware` / `adminMiddleware` / `sensitiveLimiter`

```js
// ============================================
// #317 REFERIDOS 2.0 — réplica de #168-#175 del gemelo AUTOREEMBOLSOS (JUGAYGANA), con el
// netwin leído de 1girox. Tablero vivo del cliente, NIVELES de % por referidos activos,
// % plano editable, netwin en vivo por referido para el admin.
// ⚠️ TDZ: rutas DESPUÉS de authMiddleware/adminMiddleware/sensitiveLimiter.
// Regla del owner (gemelo 2026-09-29): NADA de premios en plata por cantidad de referidos
// (se estafaban con cuentas falsas): el premio es el % de comisión por nivel.
// ============================================

// % PLANO (admin general). Acá la fuente es el comando /sys_referidos_pct (#307): la card
// del panel escribe ESE comando, así no hay dos lugares para el mismo número.
app.get('/api/admin/referral-rate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin general' });
    const rate = await refreshReferralRateFromCommand();
    res.json({ rate, percent: Math.round(rate * 1000) / 10, command: REFERRAL_PCT_COMMAND });
  } catch (e) { res.status(500).json({ error: 'Error del servidor' }); }
});
app.post('/api/admin/referral-rate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin general' });
    const pct = Number(req.body && req.body.percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 50) return res.status(400).json({ error: 'El porcentaje tiene que ser un número mayor a 0 y hasta 50' });
    const rounded = Math.round(pct * 10) / 10;
    await Command.updateOne({ name: REFERRAL_PCT_COMMAND },
      { $set: { response: String(rounded), isActive: true } }, { upsert: true });
    setGlobalReferralRate(rounded / 100);
    logger.info(`[referrals] % plano de comisión cambiado a ${rounded}% por ${req.user.username} (${REFERRAL_PCT_COMMAND})`);
    res.json({ rate: rounded / 100, percent: rounded, command: REFERRAL_PCT_COMMAND });
  } catch (e) { logger.warn(`[referrals] referral-rate POST: ${e.message}`); res.status(500).json({ error: 'Error del servidor' }); }
});

async function getReferralMilestonesConfig() { return referralTiers.getReferralTiersConfig(); }
// NETWIN del MES por referido. ⚠️ MISMA función que el cálculo mensual (con la que se PAGA):
// referralCalculationService.getReferredNetwinForRange → giroxService.getPlayerStats +
// mapStatsToRevenue (mismo alcance casino/total). Contrato: Number (≥ o < 0) o null si no se
// pudo leer. Cache 15 min por usuario (además del cache corto de stats de giroxService).
const _refNetwinCache = new Map(); // key userId → { at, ggr }
const REF_NETWIN_TTL_MS = 15 * 60 * 1000;
async function _referralNetwinMonth(u, range) {
  const hit = _refNetwinCache.get(u.id);
  if (hit && Date.now() - hit.at < REF_NETWIN_TTL_MS) return hit.ggr;
  let ggr = null;
  try { ggr = await referralCalculationService.getReferredNetwinForRange(u, range.from, range.to, 'ref-dashboard'); } catch (_) { ggr = null; }
  if (ggr !== null) _refNetwinCache.set(u.id, { at: Date.now(), ggr });
  return ggr;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of _refNetwinCache) if (now - v.at > REF_NETWIN_TTL_MS * 2) _refNetwinCache.delete(k); }, 10 * 60 * 1000).unref();
// Mes argentino EN CURSO: 00:00 ART del día 1 → ahora (getPeriodRange ancla a -03:00).
function _referralMonthRange() {
  const { fromDate } = _periodKey.getPeriodRange(_periodKey.getCurrentPeriodKey());
  return { from: fromDate, to: new Date() };
}
// Netwin del mes de varios referidos: concurrencia 4, tope `max`.
async function _referralNetwinFor(list, max) {
  const range = _referralMonthRange();
  const pick = list.slice(0, max);
  const netBy = new Map();
  for (let i = 0; i < pick.length; i += 4) {
    const chunk = pick.slice(i, i + 4);
    const vals = await Promise.all(chunk.map(u => _referralNetwinMonth(u, range)));
    chunk.forEach((u, k) => netBy.set(u.id, vals[k]));
  }
  return { netBy, picked: pick.length };
}

function _referralLinkFor(code) {
  return getPublicBaseUrl().replace(/\/$/, '') + '/?ref=' + encodeURIComponent(code);
}
async function _ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  for (let i = 0; i < 10; i++) {
    const cand = generateReferralCode();
    if (await User.findOne({ referralCode: cand }).select('_id').lean()) continue;
    const upd = await User.findOneAndUpdate({ id: user.id, referralCode: null }, { $set: { referralCode: cand } }, { new: true }).lean();
    if (upd && upd.referralCode) return upd.referralCode;
    const re = await User.findOne({ id: user.id }).select('referralCode').lean();
    if (re && re.referralCode) return re.referralCode;
  }
  return null;
}

// Tablero del referidor: link, totales, tabla por referido y NIVEL de comisión.
app.get('/api/referrals/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.userId }).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const code = await _ensureReferralCode(user);
    const cfg = await getReferralMilestonesConfig();
    const refs = await User.find({ referredByUserId: user.id }).sort({ createdAt: -1 }).select('id username createdAt isBlocked').lean();
    const depBy = await referralTiers.depositsByReferred(user.id);
    const activeCount = Array.from(depBy.values()).filter(v => v.total >= cfg.minChargedARS).length;
    const lv = await referralTiers.resolveReferralRate(user, { activeCount });
    const rate = lv.rate;
    // NETWIN del mes solo para los que cargaron (los demás no tienen juego). Tope 60.
    const { netBy } = await _referralNetwinFor(refs.filter(r => depBy.has(r.id)), 60);
    const rows = refs.map(r => {
      const d = depBy.get(r.id);
      const total = d ? d.total : 0;
      const net = netBy.has(r.id) ? netBy.get(r.id) : (d ? null : 0);
      const netPos = net === null ? null : Math.max(0, net);
      return {
        username: r.username, registeredAt: r.createdAt, blocked: !!r.isBlocked,
        charges: d ? d.count : 0, totalCharged: total, lastChargeAt: d ? d.last : null,
        active: !!d, qualified: total >= cfg.minChargedARS && !!d,
        netLossMonth: net, commissionMonth: netPos === null ? null : Math.round(netPos * rate)
      };
    });
    const sumNet = rows.reduce((a, r) => a + (r.netLossMonth === null ? 0 : Math.max(0, r.netLossMonth)), 0);
    const periodKey = _periodKey.getCurrentPeriodKey();
    // Total histórico acreditado por comisiones (+ premios viejos si los hubo).
    const credited = await Transaction.aggregate([
      { $match: { userId: user.id, status: 'completed', $or: [{ type: 'referral_commission' }, { type: 'bonus', 'metadata.source': 'referral_milestone' }] } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);
    const hist = {}; for (const c of credited) hist[c._id] = c.total;
    const tiers = cfg.tiers.map(t => ({ count: t.count, pct: t.pct, reached: activeCount >= t.count, current: !!(lv.tier && lv.tier.count === t.count) }));
    res.json({
      success: true,
      referralCode: code, referralLink: code ? _referralLinkFor(code) : null, rate,
      // #307: acá el pago es AUTOMÁTICO el día 1 de cada mes.
      period: { key: periodKey, label: _periodKey.getPeriodLabel(periodKey), nextCredit: `El 1° de ${_periodKey.getNextPeriodLabel(periodKey)}` },
      totals: { referred: rows.length, active: rows.filter(r => r.active).length, qualified: activeCount, totalCharged: rows.reduce((a, r) => a + r.totalCharged, 0),
        netLossMonth: Math.round(sumNet), commissionMonth: Math.round(sumNet * rate), netwinPartial: rows.some(r => r.active && r.netLossMonth === null),
        historicalCommission: Math.round(hist.referral_commission || 0), historicalMilestones: Math.round(hist.bonus || 0) },
      referrals: rows,
      level: { enabled: cfg.enabled, mode: lv.mode, minChargedARS: cfg.minChargedARS, basePct: cfg.basePct, active: activeCount, pct: lv.pct, maxPct: lv.maxPct,
        tiers, currentTier: lv.tier ? { count: lv.tier.count, pct: lv.tier.pct } : null, nextTier: lv.nextTier ? { count: lv.nextTier.count, pct: lv.nextTier.pct, missing: lv.missing } : null,
        maxCount: cfg.tiers.length ? cfg.tiers[cfg.tiers.length - 1].count : 0 }
    });
  } catch (error) {
    logger.error(`[referrals] dashboard: ${error.message}`);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Premios en plata por hitos: DISCONTINUADOS (estafables). Cerrado para apps viejas cacheadas.
app.post('/api/referrals/milestones/claim', authMiddleware, sensitiveLimiter, async (req, res) => {
  res.status(410).json({ error: 'Los premios en plata por referidos se reemplazaron por niveles de comisión: cuantos más referidos activos, más % cobrás. Actualizá la app.' });
});

// Config de niveles de comisión por referidos activos (admin general).
app.get('/api/admin/referrals/milestones-config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin general' });
    const cfg = await referralTiers.getReferralTiersConfig({ force: true });
    res.json(Object.assign({}, cfg, { flatPct: Math.round(getGlobalReferralRate() * 10000) / 100 }));
  } catch (e) { res.status(500).json({ error: 'Error del servidor' }); }
});
app.post('/api/admin/referrals/milestones-config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin general' });
    const b = req.body || {};
    const rawTiers = Array.isArray(b.tiers) ? b.tiers : [];
    for (const t of rawTiers) {
      const pct = Number(t && t.pct);
      if (!(Number.isFinite(pct) && pct > 0 && pct <= 50)) return res.status(400).json({ error: 'Cada nivel necesita un % entre 0,01 y 50' });
    }
    const tiers = referralTiers.normalizeTiers(rawTiers);
    if (!tiers.length) return res.status(400).json({ error: 'Cargá al menos un nivel (cantidad de referidos activos + %)' });
    const counts = rawTiers.map(t => Math.round(Number(t.count) || 0)).filter(c => c > 0);
    if (new Set(counts).size !== counts.length) return res.status(400).json({ error: 'Hay una cantidad de referidos repetida' });
    for (let i = 1; i < tiers.length; i++) if (tiers[i].pct < tiers[i - 1].pct) return res.status(400).json({ error: 'El % tiene que subir (o mantenerse) con más referidos' });
    const basePct = Number(b.basePct);
    if (!(Number.isFinite(basePct) && basePct >= 0 && basePct <= 50)) return res.status(400).json({ error: '% base inválido (0 a 50)' });
    if (basePct > tiers[0].pct) return res.status(400).json({ error: 'El % base no puede superar al del primer nivel' });
    const next = { enabled: b.enabled !== false, minChargedARS: Math.max(0, Math.round(Number(b.minChargedARS) || 0)), basePct: Math.round(basePct * 100) / 100, tiers, updatedBy: req.user.username, updatedAt: new Date() };
    await setConfig('referralMilestones', next);
    referralTiers.invalidateCache();
    logger.info(`[referrals] niveles de comisión actualizados por ${req.user.username}: base ${next.basePct}% · ${tiers.map(t => t.count + '→' + t.pct + '%').join(', ')} · activo = cargó ≥ $${next.minChargedARS} · ${next.enabled ? 'ON' : 'OFF'}`);
    res.json(Object.assign({}, await referralTiers.getReferralTiersConfig({ force: true }), { flatPct: Math.round(getGlobalReferralRate() * 10000) / 100 }));
  } catch (e) { logger.warn(`[referrals] milestones-config POST: ${e.message}`); res.status(500).json({ error: 'Error del servidor' }); }
});

// Netwin del MES EN VIVO de cada referido de un referidor (admin). Misma fuente y cache que el
// tablero del cliente. Solo referidos con cargas reales; concurrencia 4, tope 80. Va separado
// del detalle (referralController.adminGetUserReferrals) para que el detalle cargue al instante.
app.get('/api/admin/referrals/:userId/netwin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const referrer = await User.findOne({ id: String(req.params.userId || '') }).lean();
    if (!referrer) return res.status(404).json({ error: 'Referidor no encontrado' });
    const cfg = await getReferralMilestonesConfig();
    const refs = await User.find({ referredByUserId: referrer.id }).select('id username').lean();
    const depBy = await referralTiers.depositsByReferred(referrer.id);
    const activeCount = Array.from(depBy.values()).filter(v => v.total >= cfg.minChargedARS).length;
    const lv = await referralTiers.resolveReferralRate(referrer, { activeCount });
    const withDeposits = refs.filter(r => depBy.has(r.id));
    const { netBy, picked } = await _referralNetwinFor(withDeposits, 80);
    const rows = refs.map(r => {
      const has = depBy.has(r.id);
      const net = netBy.has(r.id) ? netBy.get(r.id) : (has ? null : 0); // null = no se pudo leer
      return { userId: r.id, username: r.username, netwinMonth: net, commissionMonth: net === null ? null : Math.round(Math.max(0, net) * lv.rate) };
    });
    const sumNet = rows.reduce((a, r) => a + (r.netwinMonth === null ? 0 : Math.max(0, r.netwinMonth)), 0);
    res.json({ success: true, period: { key: _periodKey.getCurrentPeriodKey(), label: _periodKey.getPeriodLabel(_periodKey.getCurrentPeriodKey()) },
      rate: lv.rate, pct: lv.pct, mode: lv.mode, active: activeCount,
      totals: { netwinMonth: Math.round(sumNet), commissionMonth: Math.round(sumNet * lv.rate), partial: rows.some(r => r.netwinMonth === null), skipped: Math.max(0, withDeposits.length - picked) },
      referrals: rows });
  } catch (e) {
    logger.warn(`[referrals] admin netwin ${req.params.userId}: ${e.message}`);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
```

**PROBAR 2:** `node --check server.js`. Arrancar → log `[referidos]` no aparece hasta 5 min
(cron) y el % se relee a los 10 s. `GET /api/admin/referral-rate` → `{percent:3}`.
`GET /api/referrals/dashboard` con token de cliente → link `/?ref=CODE`, `level.tiers` con 3
niveles, `totals`. `POST /api/referrals/milestones/claim` → 410.

---

## FEATURE 3 — PWA (`public/`)

### 3.1 `public/index.html`

**a) CSS** (dentro del `<style>` principal; en PAUTANUEVAsantino va junto al resto de los
estilos del dashboard):

```css
                .dash-ref { background:linear-gradient(135deg,#1a0033,#2d0052); border:1.5px solid #d4af37; border-radius:13px; padding:9px 11px; color:#fff; box-shadow:0 3px 12px rgba(212,175,55,.35); }
                .dash-ref-head { display:flex; align-items:center; gap:8px; }
                .dash-ref-title { font-size:12.5px; font-weight:900; color:#ffd700; letter-spacing:.5px; flex:1; }
                .dash-ref-cta { font-size:9px; font-weight:900; color:#1a0033; background:linear-gradient(135deg,#d4af37,#ffd700); border-radius:999px; padding:4px 8px; border:none; cursor:pointer; white-space:nowrap; }
                .dash-ref-bar { position:relative; height:9px; background:rgba(255,255,255,.12); border-radius:999px; margin:9px 0 6px; overflow:hidden; }
                .dash-ref-fill { height:100%; background:linear-gradient(90deg,#d4af37,#ffd700); border-radius:999px; transition:width .5s ease; }
                .dash-ref-steps { display:flex; justify-content:space-between; gap:4px; }
                .dash-ref-step { flex:1; text-align:center; font-size:9px; color:#bbb; line-height:1.25; }
                .dash-ref-step b { display:block; font-size:16px; line-height:1; }
                .dash-ref-step.on { color:#00ff88; }
                .dash-ref-invite { width:100%; margin-top:8px; background:linear-gradient(135deg,#ffd700,#f7931e); color:#000; border:none; border-radius:10px; padding:9px; font-weight:900; font-size:12px; cursor:pointer; letter-spacing:.4px; }
                /* Popup promocional */
                .ref-promo { background:linear-gradient(180deg,#2d0052 0%,#1a0033 70%,#0a001a 100%); border:2.5px solid #ffd700; border-radius:18px; padding:20px 16px 16px; color:#fff; max-width:420px; width:100%; margin:18px auto; position:relative; text-align:center; box-shadow:0 0 40px rgba(255,215,0,.35); overflow:hidden; }
                .ref-promo-title { font-size:34px; font-weight:900; line-height:.95; letter-spacing:1px; margin:6px 0 2px; color:#ffd700; text-shadow:0 3px 0 #7a5a00, 0 6px 16px rgba(0,0,0,.6); }
                .ref-promo-title span { display:block; color:#fff; font-size:22px; text-shadow:0 2px 0 #4a0080; }
                .ref-promo-title em { font-style:normal; color:#c98bff; }
                .ref-promo-badge { display:inline-block; margin:10px auto 8px; background:rgba(0,0,0,.45); border:1.5px solid #ffd700; border-radius:12px; padding:8px 14px; font-size:14px; font-weight:800; }
                .ref-promo-badge b { color:#ffd700; font-size:20px; }
                .ref-promo-gift { font-size:64px; line-height:1; margin:4px 0 10px; filter:drop-shadow(0 6px 14px rgba(255,215,0,.35)); }
                .ref-promo-btn { width:100%; background:linear-gradient(135deg,#ffd700,#f7931e); color:#000; border:none; border-radius:12px; padding:14px; font-weight:900; font-size:15px; cursor:pointer; letter-spacing:.6px; box-shadow:0 4px 16px rgba(255,215,0,.45); }
                .ref-promo-link { width:100%; margin-top:8px; background:rgba(255,255,255,.06); color:#fff; border:1px solid rgba(255,255,255,.25); border-radius:12px; padding:11px; font-weight:800; font-size:12.5px; cursor:pointer; }
                .ref-promo-x { position:absolute; top:10px; right:10px; width:34px; height:34px; border-radius:50%; background:rgba(0,0,0,.55); border:1px solid #ffd700; color:#ffd700; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
```

**b) Card del home** (en el dashboard viejo, debajo de REEMBOLSOS — solo la ve staff /
cambio de clave; el cliente en casino la ve en PREMIOS):

```html
<!-- #317 INVITÁ A TUS AMIGOS: nivel + progreso + INVITAR (lo pinta VIP.ui.loadReferralHomeCard). -->
<div id="referralHomeCard" style="display:none;"></div>
```

**c) Hint del registro** (debajo del input `registerReferralCode`):

```html
<span id="registerReferralHint" style="font-size: 11px; color: #888;">Si te invitó alguien, ingresá su código para vincularte.</span>
```

**d) Modales:** REEMPLAZAR el "Modal de Referidos" viejo (`#referralModal`) por estos dos
(ambos con `z-index:2147483000` para quedar arriba del casino y del hub). Las imágenes
`/img/referidos-promo-top.jpg` y `/img/referidos-promo-bottom.jpg` están en
`PAUTANUEVAsantino/public/img/` (pedíselas al que te pasó este doc o reemplazalas por
cualquier arte: son el recorte superior e inferior del mockup del popup).

```html
    <!-- #317 (réplica #168): modal de referidos — link + nivel + tablero por referido. Lo pinta ui.js
         (renderReferralModal). z-index alto: en este repo el cliente está dentro del casino (99999)
         y del hub PREMIOS; si no, quedaba tapado. -->
    <div id="referralModal" class="modal hidden" style="z-index:2147483000;" onclick="if(event.target===this)hideModal('referralModal')">
        <div class="modal-content" style="position:relative;max-width:560px;max-height:92vh;overflow-y:auto;padding:16px 14px;">
            <button onclick="hideModal('referralModal')" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#888;font-size:24px;cursor:pointer;z-index:10;">✕</button>
            <div class="modal-header" style="margin-bottom:10px;">
                <h2 style="margin:0;">🤝 Mis Referidos</h2>
                <p style="margin:4px 0 0;">Cobrás hasta el <strong style="color:#d4af37;"><span class="referralRatePct">3%</span></strong> de comisión por la actividad de tus referidos, todos los meses. Tu % actual: <strong style="color:#00ff88;"><span class="referralMyPct">0%</span></strong></p>
            </div>
            <div id="referralContent"><span style="color:#888;font-size:12px;">Cargando tus referidos…</span></div>
        </div>
    </div>

    <!-- #168 Popup promocional de referidos: se muestra cada vez que se abre la app (una vez por
         apertura). Botones: compartir el link / ver el progreso. -->
    <div id="referralPromoModal" class="modal hidden" style="z-index:2147483000;" onclick="if(event.target===this)hideModal('referralPromoModal')">
        <div class="ref-promo" style="padding:0;overflow:hidden;">
            <button class="ref-promo-x" onclick="hideModal('referralPromoModal')" style="top:8px;right:8px;">✕</button>
            <!-- Arte del mockup del encargado en dos recortes; el cartel del % es HTML para que
                 refleje el porcentaje real (editable en COMANDOS, #169). -->
            <img src="/img/referidos-promo-top.jpg" alt="Invitá a tus amigos" style="display:block;width:100%;height:auto;">
            <div style="background:radial-gradient(ellipse at center,#4a0080 0%,#2a0048 70%);padding:6px 14px 2px;">
                <div style="background:rgba(12,0,30,.85);border:2px solid #ffd700;border-radius:14px;padding:9px 12px;font-size:15px;font-weight:800;color:#fff;line-height:1.3;box-shadow:0 0 16px rgba(255,215,0,.35);">
                    Cobrá hasta el <b style="color:#ffd700;font-size:24px;"><span class="referralRatePct">3%</span></b> de comisión<br>por la actividad de tus referidos
                </div>
            </div>
            <img src="/img/referidos-promo-bottom.jpg" alt="" style="display:block;width:100%;height:auto;">
            <div style="padding:10px 14px 16px;background:linear-gradient(180deg,#2a0048 0%,#12002a 100%);">
                <div id="referralPromoExtra" style="font-size:11.5px;color:#ffd700;font-weight:800;margin:0 0 10px;line-height:1.4;"></div>
                <button class="ref-promo-btn" onclick="VIP.ui.shareReferralLink()" style="border-radius:999px;font-size:16px;padding:15px;">
                    <span style="display:inline-flex;align-items:center;gap:10px;"><span style="font-size:18px;">🔗</span> INVITAR A TUS AMIGOS <span style="font-size:18px;">›</span></span>
                </button>
                <button class="ref-promo-link" onclick="hideModal('referralPromoModal'); VIP.ui.openReferralModal();" style="border-radius:999px;border-color:rgba(201,139,255,.6);">📊 Mirá el progreso de tus referidos aquí ›</button>
            </div>
        </div>
    </div>
```

**e) Copy #314** — sacar el "8%" de los textos estáticos:

```diff
diff --git a/public/index.html b/public/index.html
index 03c0f99..9ad1183 100644
--- a/public/index.html
+++ b/public/index.html
@@ -1732,8 +1732,8 @@
                 </div>
                 <div class="info-card">
                     <div class="info-card-icon">🤝</div>
-                    <div class="info-card-title">Referidos: 8% mensual</div>
-                    <div class="info-card-desc">Invitá amigos con tu código y cobrá todos los meses el 8% de su actividad, de por vida y sin límite.</div>
+                    <div class="info-card-title">Referidos: comisión mensual</div>
+                    <div class="info-card-desc">Invitá amigos con tu código y cobrá todos los meses una comisión por su actividad, de por vida y sin límite.</div>
                 </div>
                 <div class="info-card">
                     <div class="info-card-icon">📲</div>
@@ -1792,7 +1792,7 @@
                 </div>
                 <div style="background:linear-gradient(135deg,rgba(0,255,136,0.10),rgba(0,204,106,0.10)); border:1px solid rgba(0,255,136,0.55); border-radius:9px; padding:8px 6px; text-align:center;">
                     <div style="font-size:22px; line-height:1;">🤝</div>
-                    <div style="color:#00ff88; font-weight:700; font-size:11px; margin:3px 0 2px;">Referidos: 8% mensual</div>
+                    <div style="color:#00ff88; font-weight:700; font-size:11px; margin:3px 0 2px;">Referidos: comisión mensual</div>
                     <div style="color:#b0b0b0; font-size:9.5px; line-height:1.3;">Invitá amigos y cobrá todos los meses, de por vida.</div>
                 </div>
                 <div style="background:linear-gradient(135deg,rgba(0,255,136,0.10),rgba(0,204,106,0.10)); border:1px solid rgba(0,255,136,0.55); border-radius:9px; padding:8px 6px; text-align:center;">
@@ -4185,7 +4185,7 @@
             <button onclick="hideModal('referralModal')" style="position:absolute;top:15px;right:15px;background:none;border:none;color:#888;font-size:24px;cursor:pointer;z-index:10;">✕</button>
             <div class="modal-header">
                 <h2>🤝 Mis Referidos</h2>
-                <p>Invitá amigos y cobrá <strong style="color:#d4af37;">todos los meses el 8%</strong> de su actividad — sin límite de referidos</p>
+                <p>Invitá amigos y cobrá <strong style="color:#d4af37;">una comisión todos los meses</strong> por su actividad — sin límite de referidos</p>
             </div>
             <div id="referralContent">
                 <!-- Cómo funciona, en 3 pasos (pedido del owner 2026-08-03: que sea
@@ -4203,11 +4203,11 @@
                         </div>
                         <div style="display:flex;gap:10px;align-items:flex-start;">
                             <span style="flex:0 0 26px;height:26px;background:linear-gradient(135deg,#d4af37,#ffd700);color:#1a0033;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;">3</span>
-                            <div style="flex:1;font-size:12px;color:#ddd;line-height:1.5;"><strong style="color:#00ff88;">Cobrás el 8% de lo que tus referidos dejan en la sala</strong> (su pérdida neta jugando), todos los meses, en fichas directo a tu cuenta. Mientras sigan jugando, vos seguís cobrando — <strong style="color:#fff;">de por vida</strong>.</div>
+                            <div style="flex:1;font-size:12px;color:#ddd;line-height:1.5;"><strong style="color:#00ff88;">Cobrás una comisión por la actividad de tus referidos en la sala</strong>, todos los meses, directo a tu cuenta. Mientras sigan jugando, vos seguís cobrando — <strong style="color:#fff;">de por vida</strong>.</div>
                         </div>
                     </div>
                     <div style="font-size:11px;color:#999;line-height:1.5;margin-top:10px;border-top:1px solid rgba(212,175,55,0.15);padding-top:8px;">
-                        📌 La comisión se calcula al inicio de cada mes sobre la actividad del mes anterior y se acredita sola. Ejemplo: si tus referidos pierden $100.000 en el mes, vos cobrás <strong style="color:#d4af37;">$8.000</strong>. No hay límite de referidos ni de ganancia.
+                        📌 La comisión se calcula el 1 de cada mes sobre la actividad del mes anterior y se acredita sola. No hay límite de referidos ni de ganancia.
                     </div>
                 </div>
                 <!-- Código y link -->
```

**f)** Bumpear `?v=` de `/js/auth.js`, `/js/ui.js`, `/js/app.js`.

### 3.2 `public/js/ui.js` — bloque "Referrals" DENTRO del IIFE `VIP.ui`

Reemplazar el bloque viejo (el que pegaba a `/api/referrals/me` + `/history` + `/summary` y
pintaba el modal) por este. Usa `showModal`, `showToast`, `fallbackCopy`, `adjustLayout` del
IIFE y `VIP.ui._rwSummary` (si no tenés hub, `VIP.ui._rwSummary` queda `undefined` y cae al
texto por defecto: está contemplado).

```js
    // ---- Referrals (#317, réplica #168-#175 del gemelo, adaptada a 1girox) ----
    // Copys: regla #314 del owner → hablar de "comisión por la ACTIVIDAD de tus referidos",
    // nunca "lo que pierdan" (queda chocante). El número que se muestra es el netwin del mes.
    const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let _refData = null;
    let _refLoadedAt = 0;
    const _refMoney = (n) => '$' + new Intl.NumberFormat('es-AR').format(Math.round(Number(n) || 0));
    function _refPct(rate) { return _refPctNum(_refPctOf(rate)); }
    function _refPctOf(rate) { const n = Number(rate); return Math.round((Number.isFinite(n) ? n : 0) * 10000) / 100; }
    function _refPctNum(p) { const n = Number(p) || 0; return (Number.isInteger(n) ? n : n.toFixed(n * 10 % 1 ? 2 : 1)) + '%'; }
    function _refMaxPct(d) { const lv = (d && d.level) || {}; return _refPctNum(lv.maxPct != null ? lv.maxPct : _refPctOf(d && d.rate)); }
    function _refAgo(d) {
        if (!d) return '';
        const ms = Date.now() - new Date(d).getTime();
        const dias = Math.floor(ms / 86400000);
        if (dias <= 0) return 'hoy';
        if (dias === 1) return 'hace 1 día';
        if (dias < 30) return 'hace ' + dias + ' días';
        const m = Math.floor(dias / 30);
        return m === 1 ? 'hace 1 mes' : 'hace ' + m + ' meses';
    }

    async function fetchReferralDashboard(force) {
        if (!force && _refData && Date.now() - _refLoadedAt < 60000) return _refData;
        const r = await fetch(`${VIP.config.API_URL}/api/referrals/dashboard`, { headers: { 'Authorization': `Bearer ${VIP.state.currentToken}` } });
        if (!r.ok) throw new Error('dashboard ' + r.status);
        const d = await r.json();
        _refData = d; _refLoadedAt = Date.now();
        VIP.state.referralData = d;
        // #171 el cartel promocional muestra el MÁXIMO alcanzable ("hasta el 3%"); el % propio va en el tablero.
        const lv = d.level || {};
        document.querySelectorAll('.referralRatePct').forEach(el => { el.textContent = _refPctNum(lv.maxPct != null ? lv.maxPct : _refPctOf(d.rate)); });
        document.querySelectorAll('.referralMyPct').forEach(el => { el.textContent = _refPctNum(lv.pct != null ? lv.pct : _refPctOf(d.rate)); });
        return d;
    }

    async function openReferralModal() {
        showModal('referralModal');
        await loadReferralData(true);
    }

    async function loadReferralData(force) {
        const c = document.getElementById('referralContent');
        if (c && !_refData) c.innerHTML = '<span style="color:#888;font-size:12px;">Cargando tus referidos…</span>';
        try {
            const d = await fetchReferralDashboard(force);
            renderReferralModal(d);
            renderReferralHomeCard(d);
        } catch (err) {
            console.error('[Referrals] Error cargando datos:', err);
            if (c) c.innerHTML = '<span style="color:#ff4444;font-size:12px;">No se pudieron cargar tus datos de referidos. Reintentá.</span>';
        }
    }

    // #171 tile de un NIVEL de comisión (cantidad de referidos activos → %).
    function _refTierHtml(t, lv) {
        const on = t.reached, cur = t.current;
        let foot;
        if (cur) foot = '<span class="ref-pill" style="background:rgba(0,255,136,.15);color:#00ff88;border:1px solid rgba(0,255,136,.5);">⭐ Tu nivel actual</span>';
        else if (on) foot = '<span class="ref-pill" style="background:rgba(255,215,0,.12);color:#ffd700;border:1px solid rgba(255,215,0,.5);">✅ Alcanzado</span>';
        else foot = '<span class="ref-pill" style="background:rgba(255,255,255,.06);color:#999;border:1px solid rgba(255,255,255,.15);">🔒 Te faltan ' + Math.max(0, t.count - (lv.active || 0)) + '</span>';
        return '<div style="flex:1;min-width:96px;text-align:center;padding:9px 6px;border-radius:10px;background:' + (cur ? 'rgba(0,255,136,.07)' : (on ? 'rgba(255,215,0,.08)' : 'rgba(255,255,255,.03)')) + ';border:1px solid ' + (cur ? 'rgba(0,255,136,.55)' : (on ? 'rgba(255,215,0,.55)' : 'rgba(255,255,255,.12)')) + ';">' +
            '<div style="font-size:11px;font-weight:900;color:#fff;margin-top:2px;">' + t.count + ' ACTIVOS</div>' +
            '<div style="font-size:22px;font-weight:900;color:' + (on ? '#ffd700' : '#bbb') + ';line-height:1.15;">' + _refPctNum(t.pct) + '</div>' +
            '<div style="font-size:9.5px;color:#aaa;margin-bottom:6px;">de comisión</div>' + foot + '</div>';
    }

    function renderReferralModal(d) {
        const c = document.getElementById('referralContent');
        if (!c || !d) return;
        const t = d.totals || {}, lv = d.level || {}, per = d.period || {};
        const pct = _refPct(d.rate);
        const tiers = lv.tiers || [];
        const maxCount = lv.maxCount || (tiers.length ? tiers[tiers.length - 1].count : 10);
        const prog = Math.min(100, Math.round((lv.active || 0) / Math.max(1, maxCount) * 100));
        const tiersOn = lv.enabled !== false && lv.mode === 'tiers' && tiers.length;
        const netInfoId = 'refNetInfo';
        let html = '';
        // Link (solo el link: más directo que el código)
        html += '<div style="background:rgba(255,255,255,.05);border:1px solid #d4af37;border-radius:12px;padding:12px;margin-bottom:12px;">' +
            '<span style="color:#b0b0b0;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px;">Tu link de referido</span>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<span id="myReferralLink" style="font-size:12px;color:#00ff88;word-break:break-all;flex:1;min-width:0;">' + _esc(d.referralLink || '—') + '</span>' +
            '<button onclick="VIP.ui.copyReferralLink()" style="background:rgba(0,255,136,.1);border:1px solid #00ff88;color:#00ff88;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap;">📋 Copiar</button>' +
            '</div>' +
            '<button onclick="VIP.ui.shareReferralLink()" style="width:100%;margin-top:9px;background:linear-gradient(135deg,#ffd700,#f7931e);color:#000;border:none;border-radius:10px;padding:10px;font-weight:900;font-size:13px;cursor:pointer;">🔗 INVITAR A TUS AMIGOS</button>' +
            '<div style="font-size:10px;color:#888;margin-top:6px;text-align:center;">Tu amigo entra por el link, se registra y queda vinculado a vos para siempre. Código: <b style="color:#d4af37;letter-spacing:1px;">' + _esc(d.referralCode || '') + '</b></div>' +
            '</div>';
        // Tiles
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
            '<div class="ref-modal-tile" style="border-color:rgba(0,255,136,.35);"><span class="v" style="color:#00ff88;">👥 ' + (tiersOn ? (lv.active || 0) : (t.active || 0)) + '</span><span class="l">Referidos activos<br><span style="color:#777;">(' + (tiersOn ? 'cargaron al menos ' + _refMoney(lv.minChargedARS) : 'los que cargaron') + ')</span></span></div>' +
            '<div class="ref-modal-tile" style="border-color:rgba(255,215,0,.45);"><span class="v" style="color:#ffd700;">💰 ' + _refMoney(t.commissionMonth) + '</span><span class="l">Tu comisión acumulada<br><span style="color:#777;">(' + pct + ' de la actividad de este mes' + (tiersOn ? ' · tu nivel' : '') + ')</span></span></div>' +
            '<div class="ref-modal-tile" style="border-color:rgba(255,80,80,.4);cursor:pointer;" onclick="VIP.ui.toggleReferralNetLossInfo()"><span class="v" style="color:#ff6b6b;">📉 ' + _refMoney(t.netLossMonth) + '</span><span class="l">Actividad neta de tus referidos (este mes)<br><span style="color:#ff9a9a;">ℹ️ tocá: es un monto variable</span></span></div>' +
            '<div class="ref-modal-tile" style="border-color:rgba(0,170,255,.4);"><span class="v" style="color:#4fc3ff;">📊 ' + _refMoney(t.totalCharged) + '</span><span class="l">Total cargado por<br>tus referidos</span></div>' +
            '</div>';
        html += '<div id="' + netInfoId + '" style="display:none;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.4);border-radius:10px;padding:10px;margin-bottom:10px;font-size:11.5px;line-height:1.55;color:#eee;">' +
            '<b style="color:#ff9a9a;">¿Por qué cambia este número?</b> Es el resultado neto del juego de tus referidos en el mes (lo que apostaron menos lo que ganaron), sumado. Si un referido gana, el número BAJA (y tu comisión también); si no, SUBE. Por eso puede moverse día a día. Lo que cobrás se calcula con el número final del mes y se acredita solo el 1° del mes siguiente.' +
            (t.netwinPartial ? '<br><span style="color:#ffb347;">⚠️ Ahora mismo no pudimos leer la actividad de algún referido (la plataforma está demorada): el total puede estar incompleto por unos minutos.</span>' : '') + '</div>';
        html += '<div style="background:rgba(255,255,255,.03);border-radius:10px;padding:9px 11px;margin-bottom:12px;font-size:11.5px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
            '<span style="color:#b0b0b0;">Período actual: <b style="color:#fff;">' + _esc(per.label || per.key || '—') + '</b></span>' +
            '<span style="color:#b0b0b0;">Próxima acreditación: <b style="color:#fff;">' + _esc(per.nextCredit || '—') + '</b></span></div>';
        // Tabla de referidos
        const rows = d.referrals || [];
        html += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(212,175,55,.35);border-radius:12px;padding:10px;margin-bottom:12px;">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:13px;font-weight:900;color:#ffd700;">👥 MIS REFERIDOS (' + rows.length + ')</span></div>';
        if (!rows.length) {
            html += '<div style="color:#888;font-size:12px;padding:8px 0;">Todavía no tenés referidos. Compartí tu link y empezá a cobrar.</div>';
        } else {
            html += '<div style="overflow-x:auto;"><table class="ref-table"><thead><tr><th>Usuario</th><th>Estado</th><th style="text-align:right;">Cargado</th><th style="text-align:right;">Actividad</th><th style="text-align:right;">Tu ' + pct + '</th></tr></thead><tbody>';
            rows.forEach(r => {
                const st = r.active ? '<span class="ref-pill" style="background:rgba(0,255,136,.15);color:#00ff88;">Activo</span>' : '<span class="ref-pill" style="background:rgba(255,80,80,.15);color:#ff8080;">Sin carga</span>';
                const net = r.netLossMonth === null ? '<span style="color:#777;">…</span>' : _refMoney(Math.max(0, r.netLossMonth));
                const com = r.commissionMonth === null ? '<span style="color:#777;">…</span>' : '<b style="color:#00ff88;">' + _refMoney(r.commissionMonth) + '</b>';
                html += '<tr><td><b style="color:#fff;">' + _esc(r.username) + '</b><br><span style="color:#888;font-size:9.5px;">Se registró ' + _refAgo(r.registeredAt) + (r.qualified ? ' · ✔ activo para tu nivel' : (r.active ? ' · cargó menos de ' + _refMoney(lv.minChargedARS) : '')) + '</span></td>' +
                    '<td>' + st + '</td><td style="text-align:right;">' + _refMoney(r.totalCharged) + '</td><td style="text-align:right;color:#ff9a9a;">' + net + '</td><td style="text-align:right;">' + com + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';
        // #171 Nivel de comisión según referidos activos
        if (tiersOn) {
            const next = lv.nextTier;
            html += '<div style="background:linear-gradient(135deg,#2d0052,#1a0033);border:1.5px solid #ffd700;border-radius:12px;padding:12px;margin-bottom:12px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;"><span style="font-size:13px;font-weight:900;color:#ffd700;">🏆 TU NIVEL DE COMISIÓN</span><span style="font-size:12px;color:#fff;font-weight:900;">' + (lv.active || 0) + ' / ' + maxCount + ' <span style="font-size:9.5px;color:#aaa;font-weight:400;">referidos activos</span></span></div>' +
                '<div style="display:flex;align-items:center;gap:10px;margin:8px 0 6px;">' +
                '<div style="font-size:34px;font-weight:900;color:#00ff88;line-height:1;">' + _refPctNum(lv.pct) + '</div>' +
                '<div style="font-size:11px;color:#ddd;line-height:1.45;">' + (lv.currentTier ? 'Estás en el nivel de <b style="color:#fff;">' + lv.currentTier.count + ' referidos activos</b>. ' : 'Todavía no llegaste al primer nivel. ') +
                (next ? 'Con <b style="color:#ffd700;">' + next.missing + ' más</b> pasás al <b style="color:#ffd700;">' + _refPctNum(next.pct) + '</b>.' : '¡Estás en el <b style="color:#ffd700;">máximo</b>!') + '</div></div>' +
                '<div style="font-size:10.5px;color:#bbb;margin:0 0 6px;">Cuantos más amigos activos traés, mayor es el % de comisión que cobrás por la actividad de TODOS tus referidos, todos los meses. Referido activo = cargó al menos <b style="color:#fff;">' + _refMoney(lv.minChargedARS) + '</b> en total.</div>' +
                '<div class="dash-ref-bar" style="height:11px;"><div class="dash-ref-fill" style="width:' + prog + '%;"></div></div>' +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' + tiers.map(x => _refTierHtml(x, lv)).join('') + '</div>' +
                (t.historicalMilestones > 0 ? '<div style="font-size:10.5px;color:#00ff88;margin-top:8px;text-align:center;">Ya cobraste ' + _refMoney(t.historicalMilestones) + ' en premios por referidos 🏆</div>' : '') +
                '</div>';
        }
        html += '<div style="font-size:10.5px;color:#888;text-align:center;line-height:1.5;">Total cobrado en comisiones: <b style="color:#d4af37;">' + _refMoney(t.historicalCommission) + '</b>. La comisión del mes se calcula con la actividad final del mes y se acredita sola el 1° del mes siguiente. Sin límite de referidos ni de ganancia.</div>';
        c.innerHTML = html;
    }

    function toggleReferralNetLossInfo() {
        const el = document.getElementById('refNetInfo');
        if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
    }

    // Card del home: nivel actual + progreso al próximo % + INVITAR AHORA (#171).
    function renderReferralHomeCard(d) {
        const c = document.getElementById('referralHomeCard');
        if (!c) return;
        if (!d) { c.style.display = 'none'; return; }
        const lv = d.level || {}, tiers = lv.tiers || [];
        const tiersOn = lv.enabled !== false && lv.mode === 'tiers' && tiers.length;
        const maxCount = lv.maxCount || (tiers.length ? tiers[tiers.length - 1].count : 10);
        const prog = Math.min(100, Math.round((lv.active || 0) / Math.max(1, maxCount) * 100));
        const steps = tiers.slice(0, 4).map(t => '<div class="dash-ref-step' + (t.reached ? ' on' : '') + '"><b>' + (t.current ? '⭐' : (t.reached ? '✅' : '🔒')) + '</b>' + t.count + ' activos<br>' + _refPctNum(t.pct) + '</div>').join('');
        const next = lv.nextTier;
        c.innerHTML = '<div class="dash-ref">' +
            '<div class="dash-ref-head"><span style="font-size:18px;">👥</span><span class="dash-ref-title">INVITÁ A TUS AMIGOS · cobrá hasta el ' + _refMaxPct(d) + '</span><button class="dash-ref-cta" onclick="VIP.ui.openReferralModal()">VER NIVELES ›</button></div>' +
            (tiersOn ? ('<div class="dash-ref-bar"><div class="dash-ref-fill" style="width:' + prog + '%;"></div></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:9.5px;color:#bbb;margin-bottom:4px;"><span>' + (lv.active || 0) + ' / ' + maxCount + ' referidos activos · cobrás <b style="color:#00ff88;">' + _refPctNum(lv.pct) + '</b></span><span style="color:#ffd700;">' + (next ? 'Te faltan ' + next.missing + ' para el ' + _refPctNum(next.pct) : '¡Nivel máximo!') + '</span></div>' +
            '<div class="dash-ref-steps">' + steps + '</div>') : '') +
            '<button class="dash-ref-invite" onclick="VIP.ui.shareReferralLink()">🔗 INVITAR AHORA</button>' +
            '</div>';
        c.style.display = '';
        try { adjustLayout(); } catch (_) {}
    }
    async function loadReferralHomeCard() {
        if (!VIP.state || !VIP.state.currentToken) return;
        const u = VIP.state.currentUser;
        if (u && u.role && u.role !== 'user') return;
        try { renderReferralHomeCard(await fetchReferralDashboard(false)); } catch (_) {}
    }

    // Popup promocional: una vez por apertura de la app (sessionStorage), solo clientes.
    // Si hay otro modal abierto (cambio de clave, bienvenida, instalación…) espera a que se
    // cierre (reintenta hasta ~2 min) y recién ahí marca "mostrado".
    let _refPromoTimer = null;
    const REF_PROMO_COOLDOWN_MS = 24 * 60 * 60 * 1000; // #319 (owner): 1 vez cada 24 h por dispositivo (antes 30 min)
    function maybeShowReferralPromo() {
        const u = VIP.state.currentUser;
        if (!u || (u.role && u.role !== 'user')) { console.info('[ref-promo] no se muestra: cuenta de staff o usuario no cargado'); return; }
        // localStorage con cooldown (no sessionStorage: iOS/Chrome restauran la pestaña y el
        // "una vez por apertura" no se disparaba nunca más). ?refpromo=1 fuerza mostrarlo.
        const force = /[?&]refpromo=1/.test(location.search || '');
        try {
            const last = Number(localStorage.getItem('vip_refPromoAt') || 0);
            if (!force && last && Date.now() - last < REF_PROMO_COOLDOWN_MS) { console.info('[ref-promo] ya mostrado hace ' + Math.round((Date.now() - last) / 60000) + ' min'); return; }
        } catch (_) {}
        if (_refPromoTimer) return;
        let tries = 0;
        const attempt = async () => {
            _refPromoTimer = null;
            tries++;
            const cur = VIP.state.currentUser;
            if (!cur || !VIP.state.currentToken) return;
            if (cur.mustChangePassword === true || VIP.state.passwordChangePending || VIP.state._landingCredsActive) { if (tries < 24) _refPromoTimer = setTimeout(attempt, 5000); return; }
            const open = Array.from(document.querySelectorAll('.modal')).find(m => !m.classList.contains('hidden') && m.id !== 'referralPromoModal');
            if (open) { console.info('[ref-promo] espera: modal abierto ' + open.id); if (tries < 24) _refPromoTimer = setTimeout(attempt, 5000); return; }
            try {
                const d = await fetchReferralDashboard(false);
                const ex = document.getElementById('referralPromoExtra');
                const lv = d.level || {};
                if (ex && lv.enabled !== false && lv.mode === 'tiers' && lv.tiers && lv.tiers.length) ex.textContent = 'Tu % sube con tus amigos activos: ' + lv.tiers.map(t => t.count + ' amigos = ' + _refPctNum(t.pct)).join(' · ');
            } catch (_) {}
            try { localStorage.setItem('vip_refPromoAt', String(Date.now())); } catch (_) {}
            console.info('[ref-promo] mostrando');
            showModal('referralPromoModal');
        };
        _refPromoTimer = setTimeout(attempt, 1800);
    }

    // #170 Invitar: copia el link SIEMPRE y abre un chooser con WhatsApp, Telegram, otras apps y copiar.
    // #317: el texto que se comparte es el del comando /sys_referidos_compartir (#308b, editable
    // en COMANDOS, viene en /api/rewards/summary); si no está, uno por defecto. Siempre con el link.
    function _refShareText(link) {
        const sum = VIP.ui._rwSummary || {};
        let tpl = sum.referralShareTpl || '🎰 Sumate a la sala con mi link y jugá con cargas automáticas en segundos 👉 {link}';
        tpl = String(tpl).replace(/\{link\}/g, link || '').replace(/\{codigo\}/g, (_refData && _refData.referralCode) || '').replace(/\{pct\}/g, String(_refMaxPct(_refData)).replace('%', ''));
        if (link && tpl.indexOf(link) === -1) tpl += '\n' + link;
        return tpl;
    }
    async function shareReferralLink() {
        let link = (_refData && _refData.referralLink) || null;
        if (!link) { try { link = (await fetchReferralDashboard(false)).referralLink; } catch (_) {} }
        if (!link) { showToast('No pudimos generar tu link. Probá de nuevo.', 'error'); return; }
        const pct = _refMaxPct(_refData);
        const text = _refShareText(link);
        let copied = false;
        try { await navigator.clipboard.writeText(link); copied = true; } catch (_) { try { fallbackCopy(link); copied = true; } catch (_) {} }
        const old = document.getElementById('referralShareChooser'); if (old) old.remove();
        const ov = document.createElement('div');
        ov.id = 'referralShareChooser';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(3px);z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:14px;'; // #317: arriba del casino y del hub PREMIOS
        ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
        const enc = encodeURIComponent(text);
        const WA = '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
        const TG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';
        const item = (bg, icon, title, sub, onclick) =>
            '<button onclick="' + onclick + '" style="width:100%;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:10px 12px;cursor:pointer;margin-top:8px;text-align:left;color:#fff;transition:background .15s;" onmouseover="this.style.background=\'rgba(255,255,255,.08)\'" onmouseout="this.style.background=\'rgba(255,255,255,.04)\'">' +
            '<span style="flex-shrink:0;width:42px;height:42px;border-radius:12px;background:' + bg + ';display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.35);">' + icon + '</span>' +
            '<span style="flex:1;min-width:0;"><span style="display:block;font-weight:800;font-size:14px;">' + title + '</span><span style="display:block;font-size:11px;color:#aab;line-height:1.3;">' + sub + '</span></span>' +
            '<span style="color:#888;font-size:18px;">›</span></button>';
        ov.innerHTML = '<div style="background:#14062b;border:1px solid rgba(255,215,0,.45);border-radius:18px;padding:16px;max-width:420px;width:100%;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.6);">' +
            '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;">' +
            '<span style="flex-shrink:0;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#d4af37,#ffd700);display:flex;align-items:center;justify-content:center;font-size:20px;">🔗</span>' +
            '<div style="flex:1;min-width:0;"><div style="font-weight:900;font-size:16px;letter-spacing:.2px;">Invitá a tus amigos</div>' +
            '<div style="font-size:12px;color:#aab;margin-top:2px;">Cobrás hasta el <b style="color:#ffd700;">' + pct + '</b> de comisión por la actividad de tus amigos: cuantos más activos, mayor tu %.</div></div>' +
            '<button onclick="document.getElementById(\'referralShareChooser\').remove()" aria-label="Cerrar" style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#ccc;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div style="background:rgba(0,0,0,.35);border:1px dashed rgba(255,215,0,.35);border-radius:10px;padding:9px 11px;display:flex;align-items:center;gap:8px;">' +
            '<span style="flex:1;min-width:0;font-size:11.5px;color:#9ff2c7;word-break:break-all;font-family:ui-monospace,Menlo,monospace;">' + _esc(link) + '</span>' +
            '<span style="flex-shrink:0;font-size:10.5px;font-weight:800;color:' + (copied ? '#00ff88' : '#ffd700') + ';white-space:nowrap;">' + (copied ? '✓ Copiado' : '') + '</span></div>' +
            '<div style="font-size:10.5px;color:#778;margin:10px 0 2px;text-transform:uppercase;letter-spacing:1px;font-weight:800;">Enviar por</div>' +
            item('#25d366', WA, 'WhatsApp', 'Se abre con el mensaje y tu link listos', 'window.open(\'https://wa.me/?text=' + enc + '\',\'_blank\')') +
            item('#229ed9', TG, 'Telegram', 'Elegí el chat o grupo donde compartirlo', 'window.open(\'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text.replace(link, '').trim()) + '\',\'_blank\')') +
            (navigator.share ? item('linear-gradient(135deg,#7c3aed,#4f46e5)', '<span style="font-size:20px;">📤</span>', 'Otras apps', 'Instagram, SMS, Messenger, correo…', 'VIP.ui.shareReferralNative()') : '') +
            item('rgba(255,215,0,.16)', '<span style="font-size:20px;">📋</span>', 'Copiar el link', 'Para pegarlo donde quieras', 'VIP.ui.copyReferralLink()') +
            '</div>';
        document.body.appendChild(ov);
    }
    async function shareReferralNative() {
        const link = (_refData && _refData.referralLink) || '';
        const text = _refShareText(link);
        try { await navigator.share({ title: 'Invitación', text }); const ov = document.getElementById('referralShareChooser'); if (ov) ov.remove(); } catch (e) { /* cancelado */ }
    }
    function copyReferralLink() {
        const link = (_refData && _refData.referralLink) || (document.getElementById('myReferralLink') || {}).textContent || '';
        if (link && link !== '—') navigator.clipboard.writeText(link).then(() => showToast('✅ Link copiado', 'success')).catch(() => fallbackCopy(link));
    }
    function copyReferralCode() { copyReferralLink(); } // legacy: el código ya no se muestra suelto
```

**Exportar en el `return { … }` del IIFE:** `openReferralModal, loadReferralData,
copyReferralCode, copyReferralLink, loadReferralHomeCard, maybeShowReferralPromo,
shareReferralLink, shareReferralNative, toggleReferralNetLossInfo, fetchReferralDashboard`
(sacá los exports viejos que ya no existan).

### 3.3 `public/js/app.js` — `?ref=` fijo 30 días + abrir el registro solo (#317)

```diff
diff --git a/public/js/app.js b/public/js/app.js
index dd4d2dc..007f5d2 100644
--- a/public/js/app.js
+++ b/public/js/app.js
@@ -46,17 +46,35 @@ document.addEventListener('DOMContentLoaded', () => {
         }, 100);
     }
 
-    // Auto-fill referral code from URL ?ref=CODE
+    // Auto-fill referral code from URL ?ref=CODE. #317 (réplica #168): el código se guarda 30 días
+    // y queda FIJO en el registro (un solo invitador por cuenta; el cliente no lo puede cambiar).
     const urlParams = new URLSearchParams(window.location.search);
-    const refCode   = urlParams.get('ref');
+    let refCode = (urlParams.get('ref') || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
+    try {
+        if (refCode) localStorage.setItem('vip_ref', JSON.stringify({ code: refCode, at: Date.now() }));
+        else { const saved = JSON.parse(localStorage.getItem('vip_ref') || 'null'); if (saved && saved.code && Date.now() - saved.at < 30 * 86400000) refCode = saved.code; }
+    } catch (_) {}
     if (refCode) {
+        window._vipRefLocked = refCode;
         const refInput = document.getElementById('registerReferralCode');
-        if (refInput) refInput.value = refCode.toUpperCase();
+        if (refInput) { refInput.value = refCode; refInput.readOnly = true; }
         const registerBtn = document.getElementById('registerBtn');
         if (registerBtn) {
             registerBtn.style.background = 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)';
             registerBtn.textContent = '🤝 Registrarse con código de referido';
         }
+        // Si LLEGÓ por el link (?ref= en esta carga) y no tiene sesión, se abre solo el registro
+        // con el código puesto: quien entra por una invitación viene a crearse la cuenta.
+        if (urlParams.get('ref') && !VIP.state.currentToken) {
+            setTimeout(() => {
+                if (VIP.state.currentToken || VIP.state.currentUser) return;
+                const open = Array.from(document.querySelectorAll('.modal')).find(m => !m.classList.contains('hidden'));
+                if (open && open.id !== 'registerModal') return; // el welcome de publicista u otro modal manda
+                if (VIP.auth && VIP.auth.applyRegisterModalMode) VIP.auth.applyRegisterModalMode();
+                VIP.ui.showModal('registerModal');
+                try { const u = document.getElementById('registerUsername'); if (u) u.focus(); } catch (_) {}
+            }, 500);
+        }
     }
 
     // NOTA: el viejo adServiceModal ("Información del Servicio") se auto-abría
```

### 3.4 `public/js/auth.js` — hooks de arranque (popup + card) y código fijo en el registro

En los DOS caminos de arranque (login y sesión restaurada): `loadReferralHomeCard()` solo si
NO es casino-first, `maybeShowReferralPromo()` siempre. En `applyRegisterModalMode`: si
`window._vipRefLocked`, el código queda fijo (readOnly) y tiene prioridad sobre la
atribución de pauta.

```diff
diff --git a/public/js/auth.js b/public/js/auth.js
index 815d55e..262f6d7 100644
--- a/public/js/auth.js
+++ b/public/js/auth.js
@@ -514,7 +514,11 @@ VIP.auth = (function () {
                 if (!_casinoFirst) {
                     VIP.refunds.loadRefundStatus();
                     VIP.fire.loadFireStatus();
+                    // #317 card INVITÁ A TUS AMIGOS: solo en el dashboard viejo (staff / cambio de
+                    // clave). Al cliente en el casino no se le pide: consulta netwin en 1girox.
+                    if (VIP.ui.loadReferralHomeCard) VIP.ui.loadReferralHomeCard();
                 }
+                if (VIP.ui.maybeShowReferralPromo) VIP.ui.maybeShowReferralPromo(); // #317 popup (1× cada 24 h, #319)
 
                 // Entrada por la landing (`ir=casino`): el casino normalmente YA
                 // está abierto (tryAccessLink lo dispara apenas llega el token,
@@ -888,7 +892,9 @@ VIP.auth = (function () {
         if (!_casinoFirstIS) {
             VIP.refunds.loadRefundStatus();
             VIP.fire.loadFireStatus();
+            if (VIP.ui.loadReferralHomeCard) VIP.ui.loadReferralHomeCard();   // #317 card INVITÁ A TUS AMIGOS
         }
+        if (VIP.ui.maybeShowReferralPromo) VIP.ui.maybeShowReferralPromo(); // #317 popup (1× cada 24 h, #319)
         VIP.ui.loadCanalInformativoUrl();
         refreshVerifyPhoneBanner();
         if (VIP.appTest && VIP.appTest.maybeShowAppCheck) VIP.appTest.maybeShowAppCheck();
@@ -1672,11 +1678,20 @@ VIP.auth = (function () {
         const attribution = VIP.campaign && VIP.campaign.getActive();
 
         if (banner) banner.style.display = attribution ? '' : 'none';
-        if (attribution) {
+        // #317 (réplica #168): si vino por link de referido (?ref=), el código queda FIJO y no
+        // editable: un solo invitador por cuenta. Tiene prioridad sobre la atribución de pauta.
+        const lockedRef = window._vipRefLocked || null;
+        const hint = document.getElementById('registerReferralHint');
+        if (lockedRef) {
+            if (referralGroup) referralGroup.style.display = '';
+            if (referralInput) { referralInput.value = lockedRef; referralInput.readOnly = true; referralInput.style.opacity = '.85'; referralInput.style.borderColor = '#d4af37'; }
+            if (hint) { hint.textContent = '🤝 Viniste invitado con este código. Queda vinculado a tu cuenta.'; hint.style.color = '#d4af37'; }
+        } else if (attribution) {
             if (referralGroup) referralGroup.style.display = 'none';
-            if (referralInput) referralInput.value = '';
+            if (referralInput) { referralInput.value = ''; referralInput.readOnly = false; }
         } else {
             if (referralGroup) referralGroup.style.display = '';
+            if (referralInput) referralInput.readOnly = false;
         }
         // Registro con SMS obligatorio en 2 fases: arranca en la fase de envío.
         resetRegisterOtp();
```

### 3.5 Hub PREMIOS (solo si existe `VIP.ui.openRewardsHub`) — fuera del IIFE, antes de `VIP.ui.openRewardsHub`

```js
// #308: REFERIDOS en el hub PREMIOS (owner 2026-09-28: "que se le explique,
// incentivar, en segundo plano pero que llame la atención"). Tarjeta al final de
// los premios (antes de INFORMACIÓN) con link para compartir + WhatsApp, cuánto
// gana, referidos activos y último pago. Datos de /api/referrals/me + /summary,
// cacheados en VIP.ui._rwRef (se piden la primera vez y se re-pinta el hub).
// ============================================================
VIP.ui._rwLoadReferrals = function() {
  if (VIP.ui._rwRefFetching) return;
  VIP.ui._rwRefFetching = true;
  const h = { 'Authorization': `Bearer ${VIP.state.currentToken}` };
  Promise.all([
    fetch(`${VIP.config.API_URL}/api/referrals/me`, { headers: h }).then(function(r) { return r.ok ? r.json() : null; }),
    fetch(`${VIP.config.API_URL}/api/referrals/summary`, { headers: h }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
  ]).then(function(res) {
    VIP.ui._rwRefFetching = false;
    VIP.ui._rwRef = { me: (res[0] && res[0].data) || null, sum: (res[1] && res[1].data) || null, at: Date.now() };
    if (document.getElementById('rwHubOverlay')) {
      const ovh = document.getElementById('rwHubOverlay'); const stp = ovh ? ovh.scrollTop : 0;
      try { VIP.ui.openRewardsHub(); } catch (e) {}
      const ov2 = document.getElementById('rwHubOverlay'); if (ov2) ov2.scrollTop = stp;
    }
  }).catch(function() { VIP.ui._rwRefFetching = false; VIP.ui._rwRef = { me: null, sum: null, err: true, at: Date.now() }; });
};
VIP.ui._rwRefPct = function() {
  const p = VIP.ui._rwSummary && Number(VIP.ui._rwSummary.referralPct);
  return (p > 0) ? p : 3;
};
// #317: con NIVELES (referidos activos) el % del copy es el MÁXIMO alcanzable → "hasta el X%".
VIP.ui._rwRefPctTxt = function() {
  const tiers = !!(VIP.ui._rwSummary && VIP.ui._rwSummary.referralTiersOn);
  return (tiers ? 'hasta el ' : 'el ') + VIP.ui._rwRefPct() + '%';
};
VIP.ui._rwRefShareText = function() {
  const me = (VIP.ui._rwRef && VIP.ui._rwRef.me) || {};
  // #308b: plantilla editable en COMANDOS (/sys_referidos_compartir) vía el summary.
  let tpl = (VIP.ui._rwSummary && VIP.ui._rwSummary.referralShareTpl) || '🎰 Sumate a la sala con mi link y jugá con cargas automáticas en segundos 👉 {link}';
  tpl = String(tpl).replace(/\{link\}/g, me.referralLink || '').replace(/\{codigo\}/g, me.referralCode || '').replace(/\{pct\}/g, String(VIP.ui._rwRefPct()));
  if (me.referralLink && tpl.indexOf(me.referralLink) === -1) tpl += ' ' + me.referralLink; // que nunca salga sin el link
  return tpl;
};
VIP.ui._rwCopyRef = function() {
  const me = (VIP.ui._rwRef && VIP.ui._rwRef.me) || {};
  const val = me.referralLink || me.referralCode || '';
  if (!val) return;
  const ok = function() { VIP.ui.showToast('✅ Link copiado — compartilo con tus amigos', 'success'); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(val).then(ok, function() { window.prompt('Copialo manualmente:', val); }); return; }
  } catch (e) {}
  window.prompt('Copialo manualmente:', val);
};
VIP.ui._rwShareRef = function() {
  const txt = VIP.ui._rwRefShareText();
  try {
    if (navigator.share) { navigator.share({ text: txt }).catch(function() {}); return; }
  } catch (e) {}
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
};
// #308c: botón "Invitá amigos" del inicio del asistente → COPIA el link al toque
// y ofrece cómo mandarlo (WhatsApp / otras apps / ver referidos). Si el link
// todavía no se cargó, lo pide y reintenta solo.
VIP.ui._rwInviteFriends = function() {
  const me = (VIP.ui._rwRef && VIP.ui._rwRef.me) || null;
  if (!me || !me.referralLink) {
    VIP.ui.showToast('⏳ Preparando tu link…', 'info');
    const h = { 'Authorization': `Bearer ${VIP.state.currentToken}` };
    fetch(`${VIP.config.API_URL}/api/referrals/me`, { headers: h }).then(function(r) { return r.ok ? r.json() : null; }).then(function(j) {
      VIP.ui._rwRef = Object.assign({}, VIP.ui._rwRef || {}, { me: (j && j.data) || null, at: Date.now() });
      if (VIP.ui._rwRef.me && VIP.ui._rwRef.me.referralLink) VIP.ui._rwInviteFriends();
      else VIP.ui.showToast('No pudimos traer tu link. Probá de nuevo.', 'error');
    }).catch(function() { VIP.ui.showToast('Error de conexión', 'error'); });
    return;
  }
  // 1) copiar
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(me.referralLink).catch(function() {}); } catch (e) {}
  // 2) opciones en el hilo del asistente
  const area = document.getElementById('casinoBotArea');
  if (!area) { VIP.ui._rwShareRef(); return; }
  const old = document.getElementById('botInviteBlock'); if (old) old.remove();
  const oldRow = document.getElementById('botInviteRow'); if (oldRow) oldRow.remove();
  const b = VIP.ui._botMsg('✅ <b>Link copiado</b> — ya lo podés pegar donde quieras.<br>' +
    '<div class="cwBox" style="border-radius:9px;padding:7px 9px;margin-top:6px;font-size:11.5px;font-family:monospace;word-break:break-all;">' + _wrEsc(me.referralLink) + '</div>' +
    '<div style="margin-top:6px;">¿Cómo querés invitarlos? Cobrás <b>' + VIP.ui._rwRefPctTxt() + '</b> de comisión por su actividad, todos los meses.</div>');
  if (b) b.id = 'botInviteBlock';
  const hasShare = (function() { try { return !!navigator.share; } catch (e) { return false; } })();
  VIP.ui._botRow(
    VIP.ui._botBtn('💬 Enviar por WhatsApp', "VIP.ui._rwShareWa()", true) +
    (hasShare ? VIP.ui._botBtn('📤 Otras apps', "VIP.ui._rwShareRef()") : '') +
    VIP.ui._botBtn('📋 Copiar de nuevo', "VIP.ui._rwCopyRef()") +
    VIP.ui._botBtn('🤝 Ver mis referidos', "VIP.ui.openReferralModal()")
  );
  const row = area.lastElementChild; if (row) row.id = 'botInviteRow';
};
// WhatsApp directo (elegir contacto o grupo desde la app), sin pasar por el share nativo.
VIP.ui._rwShareWa = function() {
  window.open('https://wa.me/?text=' + encodeURIComponent(VIP.ui._rwRefShareText()), '_blank');
};

VIP.ui._rwReferralCard = function() {
  const pct = VIP.ui._rwRefPct();
  const acc = '#ff9800';
  const ref = VIP.ui._rwRef;
  if (!ref) { VIP.ui._rwLoadReferrals(); }
  const me = (ref && ref.me) || null, sum = (ref && ref.sum) || null;
  const _tiersOn = !!(VIP.ui._rwSummary && VIP.ui._rwSummary.referralTiersOn);
  const _myPct = VIP.ui._rwSummary && VIP.ui._rwSummary.referralMyPct;
  const head = '<div style="font-size:13.5px;color:#fff;line-height:1.45;margin-bottom:8px;">Compartí tu link: cada amigo que se registre con él es <b>tu referido</b>, y vos cobrás ' +
    '<b style="color:' + acc + ';">una comisión de ' + VIP.ui._rwRefPctTxt() + ' por su actividad</b>, <b>todos los meses</b>, directo a tu saldo. Sin límite de amigos. 🚀</div>' +
    // #317: niveles por referidos activos → el % propio y el botón al tablero completo.
    (_tiersOn ? '<div style="font-size:12px;color:#cfd6de;margin:-2px 0 8px;">🏆 Tu % actual: <b style="color:#26e07f;">' + (_myPct != null ? _myPct : 0) + '%</b> · cuantos más amigos <b>activos</b>, más % cobrás.</div>' : '') +
    '<button type="button" onclick="VIP.ui.openReferralModal()" style="width:100%;border:1px solid ' + acc + '88;cursor:pointer;background:rgba(255,152,0,0.10);color:#fff;border-radius:11px;padding:10px;font-size:13px;font-weight:800;margin-bottom:8px;">📊 Ver mis referidos y mi nivel</button>';
  let body;
  if (!ref) {
    body = head + '<div style="font-size:12.5px;color:#9aa4b0;">⏳ Cargando tu link…</div>';
  } else if (!me) {
    body = head + '<div style="font-size:12.5px;color:#cfd6de;">No pudimos traer tu link ahora. <span onclick="VIP.ui._rwRef=null;VIP.ui._rwLoadReferrals()" style="color:' + acc + ';font-weight:800;cursor:pointer;">Reintentar</span></div>';
  } else {
    const link = me.referralLink || '';
    const activos = me.activeReferred != null ? me.activeReferred : (me.totalReferred || 0);
    const cobrado = Math.round(me.historicalTotalCredited || 0);
    const estim = sum ? Math.round(sum.pendingEstimatedAmount || 0) : 0;
    const stat = function(lbl, val, color) {
      return '<div style="flex:1;min-width:80px;background:rgba(255,255,255,0.05);border-radius:10px;padding:7px 8px;text-align:center;">' +
        '<div style="font-size:10px;color:#9aa4b0;letter-spacing:.3px;">' + lbl + '</div><div style="font-size:15px;font-weight:900;color:' + (color || '#fff') + ';">' + val + '</div></div>';
    };
    body = head +
      '<div style="background:rgba(0,0,0,0.30);border:1px dashed ' + acc + '88;border-radius:12px;padding:9px 10px;margin-bottom:8px;">' +
        '<div style="font-size:10px;color:#9aa4b0;letter-spacing:.5px;margin-bottom:3px;">TU LINK DE INVITACIÓN · código <b style="color:#fff;">' + _wrEsc(me.referralCode || '—') + '</b></div>' +
        '<div style="font-size:12px;color:#fff;word-break:break-all;font-family:monospace;">' + _wrEsc(link || '—') + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
        '<button type="button" onclick="VIP.ui._rwCopyRef()" style="flex:1;border:none;cursor:pointer;background:rgba(255,255,255,0.10);color:#fff;border-radius:11px;padding:11px;font-size:13px;font-weight:800;">📋 Copiar link</button>' +
        '<button type="button" onclick="VIP.ui._rwShareWa()" style="flex:1.2;border:none;cursor:pointer;background:linear-gradient(135deg,#25d366,#128c4a);color:#fff;border-radius:11px;padding:11px;font-size:13px;font-weight:900;box-shadow:0 6px 16px rgba(37,211,102,0.3);">💬 Enviar por WhatsApp</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        stat('REFERIDOS', activos, activos > 0 ? '#26e07f' : '#fff') +
        stat('COBRADO', _rwFmt(cobrado), cobrado > 0 ? acc : '#fff') +
        stat('ESTE MES', _rwFmt(estim), estim > 0 ? acc : '#fff') +
      '</div>' +
      '<div style="font-size:11px;color:#9aa4b0;margin-top:8px;text-align:center;">💸 Se paga solo el <b style="color:#fff;">1 de cada mes</b>' + (sum && sum.lastPayout && sum.lastPayout.amount > 0 ? ' · último pago <b style="color:#fff;">' + _rwFmt(sum.lastPayout.amount) + '</b>' : '') + '</div>';
  }
  return '<div id="rwRefCard">' + _rwCard({ icon: '🤝', accent: acc, title: 'Invitá y ganá', subtitle: 'Comisión de ' + VIP.ui._rwRefPctTxt() + ' por la actividad de tus referidos, cada mes', body: body, cta: '' }) + '</div>';
};
```

Y dentro de `VIP.ui.openRewardsHub = function(focus) { … }` tres hooks (la card antes de
INFORMACIÓN, el ítem de "¿Cómo funciona?" y el scroll cuando se abre con `focus === 'ref'`):

```js
  try { cards += VIP.ui._rwReferralCard(); } catch (e) {}
        li('💰', 'Cada mes cobrás una <b style="color:#fff;">comisión de <span style="color:#ff9800;">' + VIP.ui._rwRefPctTxt() + '</span></b> por la actividad de tus referidos en la sala. ' + ((VIP.ui._rwSummary && VIP.ui._rwSummary.referralTiersOn) ? 'Tu % sube con la cantidad de amigos <b style="color:#fff;">activos</b> (los que cargaron).' : 'Cuantos más amigos invites, más cobrás — sin tope.')) +
  if (focus === 'ref') { try { const c = document.getElementById('rwRefCard'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }
```

### 3.6 Asistente del casino (`VIP.ui.casinoBotGo('home')`) — banner (#308/#308c/#317)

Debajo del chip del modo de carga, en el inicio del asistente:

```js
    // #295: modo de carga elegido + cambiar (solo si ya eligió; si no, la
    // elección aparece al tocar Depositar).
    if (VIP.ui._depositMode()) VIP.ui._botMsg(VIP.ui._depositModeChip());
    // #308: banner chico de referidos (segundo plano, pero que se vea): abre el
    // hub PREMIOS en la tarjeta "Invitá y ganá".
    const _rb = VIP.ui._botMsg('<div onclick="VIP.ui._rwInviteFriends()" style="display:flex;align-items:center;gap:9px;cursor:pointer;">' +
      '<span style="font-size:22px;flex:none;">🤝</span>' +
      '<div style="flex:1;min-width:0;line-height:1.3;"><b style="color:#ff9800;">Invitá amigos y ganá ' + VIP.ui._rwRefPctTxt() + '</b> de comisión por su actividad en la sala, todos los meses.' +
      '<div style="font-size:11px;opacity:.8;">Tocá: se copia tu link y elegís por dónde mandarlo 👉</div></div></div>');
    if (!VIP.ui._rwRef) { try { VIP.ui._rwLoadReferrals(); } catch (e) {} } // precargar el link
    if (_rb) { _rb.style.border = '1px solid rgba(255,152,0,0.55)'; _rb.style.background = 'linear-gradient(135deg,rgba(255,152,0,0.12),rgba(255,152,0,0.04))'; }
```

### 3.7 Pie del widget (`VIP.ui._showCasinoFrame`) — botón "🤝 Mis referidos" (#318)

Al lado de "🪪 Mis datos":

```js
          'font-size:10.5px;cursor:pointer;font-weight:700;">🤖 Asistente</button>' +
          // #290: los datos de ingreso SIEMPRE a mano (antes solo salían al inicio
          // del asistente y se perdían al pedir la carga).
          '<button type="button" class="cwGrn" onclick="VIP.ui.casinoBotGo(\'creds\')" style="background:none;border:none;' +
          'font-size:10.5px;cursor:pointer;font-weight:700;">🪪 Mis datos</button>' +
          // #318: Mis referidos SIEMPRE a mano (el banner del inicio desaparece al ir a depositar).
          '<button type="button" class="cwGrn" onclick="VIP.ui.openReferralModal()" style="background:none;border:none;' +
          'font-size:10.5px;cursor:pointer;font-weight:700;">🤝 Mis referidos</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
```

### 3.8 SW

Bumpear `CACHE_VERSION` de `public/firebase-messaging-sw.js` con una nota tipo
`vNNN: referidos 2.0 — modal con niveles, popup 1x/24h, chooser, link ?ref= fijo (#317-#319)`.

**PROBAR 3:** `node --check` ui.js / app.js / auth.js / SW. HTML balanceado. Abrir la app con
sesión de CLIENTE → a los ~2 s aparece el popup (si hay otro modal abierto espera a que se
cierre); `?refpromo=1` lo fuerza; "INVITAR A TUS AMIGOS" copia el link y abre el chooser;
"Mirá el progreso" abre `#referralModal` con link, tiles, tabla y nivel. `/?ref=CODE` sin
sesión → registro abierto con el código fijo y hint dorado. Con hub: PREMIOS → card "Invitá
y ganá" con "hasta el X%" y "Tu % actual"; asistente → banner → "¿Cómo querés
invitarlos?"; pie del widget → "🤝 Mis referidos". Cuenta de staff → ni popup ni card.

---

## FEATURE 4 — Panel admin (`public/adminprivado2026/`)

### 4.1 `index.html` del panel

Cuatro bloques: card "🤝 Comisión de referidos" en COMANDOS (antes de "Rangos de
reembolso"), y en la sección Referidos: "📈 Actividad y evolución" + "🏆 Mejores
referidores" (después de `#referralGlobalSummary`), "🏆 Niveles de comisión" (después de
"Cálculo y Pago Mensual") y los dos filtros nuevos de la tabla de referidores.

```diff
diff --git a/public/adminprivado2026/index.html b/public/adminprivado2026/index.html
index 39e1058..5852532 100644
--- a/public/adminprivado2026/index.html
+++ b/public/adminprivado2026/index.html
@@ -830,6 +830,23 @@ document.addEventListener('change', function (ev) {
                              🪦 Acá estaba la card "Porcentajes de reembolso" (refundPercents,
                              % fijo por período): sin uso desde #99 y REEMPLAZADA el 2026-08-05
                              por este editor de rangos por pérdida, con escalera PROPIA por período. -->
+                        <!-- #169 % de comisión de referidos (solo admin general) -->
+                        <div class="panel-subheader" style="margin-top: 24px;" id="referralRateHeader">
+                            <h3>🤝 Comisión de referidos</h3>
+                        </div>
+                        <div class="cbu-form" id="referralRateForm">
+                            <p style="color:#aaa;font-size:12px;line-height:1.5;margin:0 0 10px;">
+                                % <b>plano</b> del netwin mensual de sus referidos que cobra el referidor (es el mismo número del comando <code>/sys_referidos_pct</code>: guardar acá lo actualiza). <b>Solo rige si los
+                                "Niveles de comisión por referidos activos" (más abajo) están apagados</b>; con los niveles activos, el % de cada
+                                referidor sale de cuántos referidos activos tiene (#171). El override por usuario siempre manda.
+                            </p>
+                            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
+                                <div class="form-group" style="margin:0;"><label for="referralRatePct">% de comisión</label><input type="number" id="referralRatePct" min="0" max="50" step="0.5" style="width:120px;"></div>
+                                <button class="btn-primary" onclick="saveReferralRate()">💾 Guardar %</button>
+                                <span id="referralRateMsg" style="font-size:12px;color:#aaa;"></span>
+                            </div>
+                        </div>
+
                         <div class="panel-subheader" style="margin-top: 24px;" id="refundTiersHeader">
                             <h3>🏅 Rangos de reembolso (% según pérdida)</h3>
                         </div>
@@ -2154,6 +2171,53 @@ document.addEventListener('change', function (ev) {
                     <!-- ── DASHBOARD GLOBAL ── -->
                     <div id="referralGlobalSummary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;"></div>
 
+                    <!-- ── #174 ACTIVIDAD Y EVOLUCIÓN ── -->
+                    <div style="background:var(--bg-card,#1a1a2e);border:1px solid rgba(0,255,136,0.3);border-radius:12px;padding:18px;">
+                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
+                            <h3 style="color:#00ff88;font-size:15px;margin:0;">📈 Actividad y evolución de los referidos</h3>
+                            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
+                                <label style="font-size:11px;color:#888;">Meses</label>
+                                <select id="referralActivityMonths" onchange="loadReferralActivity()" style="background:#0d0d1a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:5px 8px;border-radius:6px;font-size:12px;">
+                                    <option value="3">3</option><option value="6" selected>6</option><option value="12">12</option>
+                                </select>
+                                <button onclick="loadReferralActivity()" style="background:rgba(0,255,136,0.1);border:1px solid #00ff88;color:#00ff88;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;">🔄 Actualizar</button>
+                            </div>
+                        </div>
+                        <p style="font-size:12px;color:#b0b0b0;line-height:1.5;margin:0 0 12px;">
+                            Cuántos referidos hay, cuántos <b>cargaron</b> y cuántos son <b>activos</b> (cargas reales acumuladas ≥ el mínimo del nivel),
+                            cuántos entraron en los últimos 7 y 30 días contra el período anterior, y la evolución mes a mes. Sale de la base propia
+                            (registros y cargas reales, sin regalos); no consulta 1girox, así que carga al instante.
+                        </p>
+                        <div id="referralActivityBody" style="font-size:13px;color:#b0b0b0;">Cargando...</div>
+                    </div>
+
+                    <!-- ── #175 MEJORES REFERIDORES ── -->
+                    <div style="background:var(--bg-card,#1a1a2e);border:1px solid rgba(255,215,0,0.35);border-radius:12px;padding:18px;">
+                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
+                            <h3 style="color:#ffd700;font-size:15px;margin:0;">🏆 Mejores referidores</h3>
+                            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
+                                <label style="font-size:11px;color:#888;">Ordenar por</label>
+                                <select id="referralRankSort" onchange="renderReferralRanking()" style="background:#0d0d1a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:5px 8px;border-radius:6px;font-size:12px;">
+                                    <option value="active" selected>Referidos activos</option>
+                                    <option value="netwinHist">Netwin generado (calculado)</option>
+                                    <option value="commissionHist">Comisión generada</option>
+                                    <option value="totalCharged">Plata cargada por sus referidos</option>
+                                    <option value="referred">Cantidad de referidos</option>
+                                    <option value="new30">Nuevos en 30 días</option>
+                                </select>
+                                <label style="font-size:11px;color:#888;">Top</label>
+                                <select id="referralRankTop" onchange="renderReferralRanking()" style="background:#0d0d1a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:5px 8px;border-radius:6px;font-size:12px;">
+                                    <option value="10">10</option><option value="20" selected>20</option><option value="50">50</option><option value="1000">Todos</option>
+                                </select>
+                            </div>
+                        </div>
+                        <p style="font-size:12px;color:#b0b0b0;line-height:1.5;margin:0 0 10px;">
+                            "Netwin generado" y "Comisión" salen de los cálculos mensuales ya hechos (Calcular); el mes en curso se ve
+                            en vivo entrando a <b>Ver referidos</b>, donde aparece el netwin de cada referido.
+                        </p>
+                        <div id="referralRankingBody" style="font-size:13px;color:#b0b0b0;">Cargando...</div>
+                    </div>
+
                     <!-- ── CÁLCULO Y PAGO MENSUAL ── -->
                     <div style="background:var(--bg-card,#1a1a2e);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:18px;">
                         <h3 style="margin-bottom:14px;color:#d4af37;font-size:15px;">⚙️ Cálculo y Pago Mensual</h3>
@@ -2177,6 +2241,29 @@ document.addEventListener('change', function (ev) {
                         <div id="referralActionResult" style="font-size:12px;color:#b0b0b0;max-height:420px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;"></div>
                     </div>
 
+                    <!-- ── #168 PREMIOS POR CANTIDAD DE REFERIDOS ── -->
+                    <div style="background:var(--bg-card,#1a1a2e);border:1px solid rgba(255,215,0,0.35);border-radius:12px;padding:18px;">
+                        <h3 style="margin-bottom:8px;color:#ffd700;font-size:15px;">🏆 Niveles de comisión por referidos activos</h3>
+                        <p style="font-size:12px;color:#b0b0b0;line-height:1.55;margin:0 0 12px;">
+                            El % de comisión que cobra el referidor sobre la <b>pérdida neta</b> (netwin) de TODOS sus referidos depende de cuántos
+                            referidos <b>activos</b> tiene (activo = cargó al menos el mínimo, sumando sus cargas reales). Ej.: 3 activos → 1%, 5 → 2%,
+                            10 → 3% (máximo). Reemplaza a los premios en plata por cantidad (#168), que se podían estafar con cuentas falsas:
+                            sin pérdida real no hay comisión. Con menos referidos que el primer nivel cobra el <b>% base</b> (0 = nada).
+                            Si está <b>apagado</b>, se usa el % plano de la card de arriba para todos.
+                        </p>
+                        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px;">
+                            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#fff;cursor:pointer;"><input type="checkbox" id="refMsEnabled" style="width:auto;"> Niveles activos</label>
+                            <div><label style="display:block;font-size:11px;color:#888;margin-bottom:4px;">Mínimo cargado para ser "activo" ($)</label><input type="number" id="refMsMin" min="0" step="500" style="background:#0d0d1a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:7px 10px;border-radius:6px;width:130px;"></div>
+                            <div><label style="display:block;font-size:11px;color:#888;margin-bottom:4px;">% base (menos referidos que el 1er nivel)</label><input type="number" id="refMsBasePct" min="0" max="50" step="0.5" style="background:#0d0d1a;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:7px 10px;border-radius:6px;width:90px;"></div>
+                        </div>
+                        <table class="data-table" style="max-width:520px;"><thead><tr><th>Referidos activos (desde)</th><th>% de comisión</th><th></th></tr></thead><tbody id="refMsTiers"></tbody></table>
+                        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
+                            <button class="btn btn-secondary btn-sm" onclick="addRefMsTier()">➕ Agregar nivel</button>
+                            <button class="btn-primary" onclick="saveReferralMilestones()">💾 Guardar niveles</button>
+                            <span id="refMsMsg" style="font-size:12px;color:#aaa;align-self:center;"></span>
+                        </div>
+                    </div>
+
                     <!-- ── REFERIDORES ACTIVOS ── -->
                     <div style="background:var(--bg-card,#1a1a2e);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:18px;">
                         <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
@@ -2186,6 +2273,8 @@ document.addEventListener('change', function (ev) {
                                 <button id="referralFilterAll" onclick="filterReferrersTable('all')" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;">Todos</button>
                                 <button id="referralFilterPending" onclick="filterReferrersTable('pending')" style="background:rgba(247,147,30,0.1);border:1px solid rgba(247,147,30,0.3);color:#f7931e;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;">⏳ Con pendiente</button>
                                 <button id="referralFilterFailed" onclick="filterReferrersTable('failed')" style="background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);color:#ff8080;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;">❌ Último fallido</button>
+                                <button id="referralFilterActive" onclick="filterReferrersTable('active')" title="Referidores con al menos un referido activo (cargó ≥ el mínimo del nivel)" style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);color:#ffd700;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;">⭐ Con activos</button>
+                                <button id="referralFilterNew30" onclick="filterReferrersTable('new30')" title="Referidores que trajeron referidos nuevos en los últimos 30 días" style="background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#00ff88;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;">🚀 Nuevos 30d</button>
                                 <button onclick="loadAdminReferralSummary()" style="background:rgba(212,175,55,0.1);border:1px solid #d4af37;color:#d4af37;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">🔄 Actualizar</button>
                             </div>
                         </div>
```

### 4.2 `admin.js` — bloques NUEVOS

**a)** Antes de `async function loadAdminReferralSummary()` (después de `let cachedReferrers = [];`):

```js

// ── #174 Actividad y evolución de referidos (admin) ──
// Estado compartido con la tabla de referidores: por id del referidor → { referred, charged, active, pct, new30, ... }.
let referralActivityByReferrer = new Map();
let referralActivityLoaded = false;
let referralActivityData = null;

// #175 Ranking de mejores referidores (usa la data de /activity; sin llamadas extra).
function renderReferralRanking() {
    const body = document.getElementById('referralRankingBody');
    if (!body) return;
    const d = referralActivityData;
    if (!d) { body.innerHTML = '<span style="color:#888;">Cargando...</span>'; return; }
    const sortKey = document.getElementById('referralRankSort')?.value || 'active';
    const top = parseInt(document.getElementById('referralRankTop')?.value || '20', 10);
    const tie = (a, b) => (b.active - a.active) || (b.netwinHist - a.netwinHist) || (b.totalCharged - a.totalCharged) || (b.referred - a.referred);
    const list = (d.referrers || []).slice().sort((a, b) => ((b[sortKey] || 0) - (a[sortKey] || 0)) || tie(a, b)).slice(0, top);
    if (!list.length) { body.innerHTML = '<span style="color:#888;">Todavía no hay referidores.</span>'; return; }
    const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span style="color:#666;">${i + 1}</span>`;
    const hl = (k) => sortKey === k ? 'background:rgba(255,215,0,0.06);' : '';
    body.innerHTML = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;min-width:1000px;font-size:12px;">
        <thead><tr style="color:#888;font-size:10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">
            <th style="padding:6px;">#</th>
            <th style="padding:6px;">Referidor</th>
            <th style="padding:6px;text-align:center;${hl('referred')}">Referidos</th>
            <th style="padding:6px;text-align:center;" title="Con al menos una carga real">Con carga</th>
            <th style="padding:6px;text-align:center;${hl('active')}" title="Cargas reales acumuladas ≥ el mínimo del nivel">Activos</th>
            <th style="padding:6px;text-align:center;">Nivel</th>
            <th style="padding:6px;text-align:right;${hl('totalCharged')}" title="Suma de cargas reales de sus referidos (histórico)">Cargado</th>
            <th style="padding:6px;text-align:right;${hl('netwinHist')}" title="Suma del netwin (pérdida neta) de sus referidos en los cálculos mensuales">Netwin generado</th>
            <th style="padding:6px;text-align:right;${hl('commissionHist')}" title="Comisión pagada + pendiente (histórico)">Comisión</th>
            <th style="padding:6px;text-align:center;${hl('new30')}">Nuevos 30d</th>
            <th style="padding:6px;"></th>
        </tr></thead>
        <tbody>${list.map((r, i) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:6px;font-size:14px;">${medal(i)}</td>
            <td style="padding:6px;color:#fff;font-weight:bold;">${escHtml(r.username)}${r.excluded ? ' <span style="color:#ff4444;font-size:10px;">EXCLUIDO</span>' : ''}</td>
            <td style="padding:6px;text-align:center;color:#b0b0b0;${hl('referred')}">${r.referred}</td>
            <td style="padding:6px;text-align:center;color:#b0b0b0;">${r.charged}</td>
            <td style="padding:6px;text-align:center;color:${r.active ? '#00ff88' : '#666'};font-weight:bold;${hl('active')}">${r.active}</td>
            <td style="padding:6px;text-align:center;color:${r.pct > 0 ? '#ffd700' : '#666'};font-weight:bold;">${r.pct == null ? '—' : r.pct + '%'}${r.mode === 'override' ? '<div style="color:#888;font-size:9px;font-weight:normal;">override</div>' : ''}</td>
            <td style="padding:6px;text-align:right;color:#fff;${hl('totalCharged')}">${fmtARS(r.totalCharged)}</td>
            <td style="padding:6px;text-align:right;color:${r.netwinHist > 0 ? '#ffd700' : r.netwinHist < 0 ? '#ff6b6b' : '#666'};${hl('netwinHist')}">${r.netwinHist ? fmtARS(r.netwinHist) : '—'}${r.netwinCurrent ? `<div style="color:#888;font-size:9px;">mes actual (calc.): ${fmtARS(r.netwinCurrent)}</div>` : ''}</td>
            <td style="padding:6px;text-align:right;color:${r.commissionHist ? '#d4af37' : '#666'};${hl('commissionHist')}">${r.commissionHist ? fmtARS(r.commissionHist) : '—'}</td>
            <td style="padding:6px;text-align:center;color:${r.new30 ? '#00ff88' : '#555'};${hl('new30')}">${r.new30 ? '+' + r.new30 : '0'}</td>
            <td style="padding:6px;"><button onclick="loadAdminUserReferrals('${escHtml(r.id)}')" style="background:rgba(212,175,55,0.1);border:1px solid #d4af37;color:#d4af37;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;">👥 Ver referidos</button></td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

// #175 Netwin del mes EN VIVO por referido (1girox, cache 15 min en el server). Se pide
// DESPUÉS de pintar el detalle, y rellena las celdas refNet-<id> / refCom-<id>.
async function loadReferralDetailNetwin(userId) {
    const box = document.getElementById('referralDetailNetwinSummary');
    try {
        const res = await fetch(`${API_URL}/api/admin/referrals/${encodeURIComponent(userId)}/netwin`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        // Si el admin ya abrió otro referidor, no pisar.
        if (referralDetailCurrentId !== userId) return;
        for (const r of (data.referrals || [])) {
            const c1 = document.getElementById('refNet-' + r.userId), c2 = document.getElementById('refCom-' + r.userId);
            if (c1) {
                if (r.netwinMonth === null) c1.innerHTML = '<span style="color:#ff8080;font-size:10px;" title="1girox no respondió; reintentá más tarde">sin dato</span>';
                else c1.innerHTML = `<span style="color:${r.netwinMonth > 0 ? '#ffd700' : r.netwinMonth < 0 ? '#ff6b6b' : '#666'};font-weight:bold;">${fmtARS(r.netwinMonth)}</span>`;
            }
            if (c2) c2.innerHTML = r.commissionMonth === null ? '<span style="color:#555;">—</span>' : `<span style="color:${r.commissionMonth ? '#d4af37' : '#666'};">${fmtARS(r.commissionMonth)}</span>`;
        }
        if (box) {
            const t = data.totals || {};
            box.innerHTML = `<span style="color:#888;">Netwin del mes (${escHtml(data.period?.label || '')}, en vivo):</span>
                <b style="color:${t.netwinMonth > 0 ? '#ffd700' : '#b0b0b0'};">${fmtARS(t.netwinMonth || 0)}</b>
                <span style="color:#888;">· comisión estimada al ${data.pct}%:</span> <b style="color:#d4af37;">${fmtARS(t.commissionMonth || 0)}</b>
                ${t.partial ? '<span style="color:#ff8080;font-size:11px;"> · ⚠️ algún referido sin dato (1girox no respondió)</span>' : ''}
                ${t.skipped ? `<span style="color:#888;font-size:11px;"> · ${t.skipped} referidos no consultados (tope 80)</span>` : ''}`;
        }
    } catch (e) {
        if (referralDetailCurrentId !== userId) return;
        if (box) box.innerHTML = `<span style="color:#ff8080;">No se pudo leer el netwin del mes (${escHtml(e.message)}).</span>`;
        document.querySelectorAll('[id^="refNet-"]').forEach(el => { el.innerHTML = '<span style="color:#555;">—</span>'; });
    }
}
let referralDetailCurrentId = null;

async function loadReferralActivity() {
    const body = document.getElementById('referralActivityBody');
    if (!body) return;
    const months = document.getElementById('referralActivityMonths')?.value || '6';
    body.innerHTML = '<span style="color:#888;">Cargando actividad...</span>';
    try {
        const res = await fetch(`${API_URL}/api/referrals/admin/activity?months=${encodeURIComponent(months)}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { body.innerHTML = `<span style="color:#ff4444;">Error cargando la actividad (${escHtml(data.message || data.error || res.status)}).</span>`; return; }
        const d = data.data || {};
        referralActivityByReferrer = new Map((d.referrers || []).map(r => [r.id, r]));
        referralActivityLoaded = true;
        referralActivityData = d;
        renderReferralActivity(d, body);
        renderReferralRanking(); // #175
        // La tabla de referidores ya puede mostrar las columnas nuevas.
        if (cachedReferrers.length) renderReferrersTable(cachedReferrers);
    } catch (e) {
        body.innerHTML = '<span style="color:#ff4444;">Error: ' + escHtml(e.message) + '</span>';
    }
}

function renderReferralActivity(d, body) {
    const t = d.totals || {};
    const w7 = d.windows?.last7 || {}, w30 = d.windows?.last30 || {};
    const minTxt = fmtARS(d.minChargedARS || 0);
    const tile = (value, label, color, sub) =>
        `<div style="background:rgba(255,255,255,0.03);border:1px solid ${color}33;border-radius:10px;padding:12px 8px;text-align:center;">
            <div style="font-size:22px;font-weight:bold;color:${color};line-height:1.1;">${value}</div>
            <div style="font-size:11px;color:#888;margin-top:4px;">${label}</div>
            ${sub ? `<div style="font-size:10px;color:#666;margin-top:2px;">${sub}</div>` : ''}
        </div>`;
    const delta = (pct) => {
        if (pct === null || pct === undefined) return '<span style="color:#00ff88;font-size:11px;">nuevo</span>';
        if (pct === 0) return '<span style="color:#888;font-size:11px;">= igual</span>';
        const up = pct > 0;
        return `<span style="color:${up ? '#00ff88' : '#ff6b6b'};font-size:11px;font-weight:bold;">${up ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
    };
    const trendBox = (() => {
        const map = {
            up:   { c: '#00ff88', icon: '📈', txt: 'HAY MEJORA: en los últimos 30 días entraron más referidos y/o más hicieron su primera carga que en los 30 anteriores.' },
            flat: { c: '#f7931e', icon: '➡️', txt: 'SIN CAMBIOS: los últimos 30 días están parejos con los 30 anteriores (±15%).' },
            down: { c: '#ff6b6b', icon: '📉', txt: 'BAJÓ: en los últimos 30 días entraron menos referidos y/o menos primeras cargas que en los 30 anteriores.' },
            none: { c: '#888',    icon: '💤', txt: 'SIN ACTIVIDAD: no hubo referidos nuevos ni primeras cargas en los últimos 60 días.' }
        };
        const m = map[d.trend] || map.none;
        const c = w30.current || {}, p = w30.previous || {};
        return `<div style="background:${m.c}14;border:1px solid ${m.c}55;border-radius:10px;padding:10px 14px;margin-bottom:12px;">
            <div style="color:${m.c};font-weight:bold;font-size:13px;">${m.icon} ${m.txt}</div>
            <div style="color:#b0b0b0;font-size:11px;margin-top:4px;">
                Últimos 30 días: <b style="color:#fff;">${c.newReferred || 0}</b> referidos nuevos (antes ${p.newReferred || 0}) ·
                <b style="color:#fff;">${c.firstDeposits || 0}</b> primeras cargas (antes ${p.firstDeposits || 0}) ·
                cargaron <b style="color:#fff;">${fmtARS(c.depositTotal || 0)}</b> (antes ${fmtARS(p.depositTotal || 0)}).
            </div>
        </div>`;
    })();

    const winCard = (w, title) => {
        const c = w.current || {}, p = w.previous || {}, ch = w.change || {};
        const row = (label, cur, prev, chg, money) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:5px 6px;color:#b0b0b0;">${label}</td>
            <td style="padding:5px 6px;text-align:right;color:#fff;font-weight:bold;">${money ? fmtARS(cur) : (cur || 0)}</td>
            <td style="padding:5px 6px;text-align:right;color:#777;">${money ? fmtARS(prev) : (prev || 0)}</td>
            <td style="padding:5px 6px;text-align:right;">${delta(chg)}</td></tr>`;
        return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px;">
            <div style="color:#d4af37;font-weight:bold;font-size:12px;margin-bottom:6px;">${title}</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead><tr style="color:#666;font-size:10px;"><th style="text-align:left;padding:2px 6px;"></th><th style="text-align:right;padding:2px 6px;">Ahora</th><th style="text-align:right;padding:2px 6px;">Anterior</th><th style="text-align:right;padding:2px 6px;">Var.</th></tr></thead>
                <tbody>
                ${row('Referidos nuevos', c.newReferred, p.newReferred, ch.newReferred)}
                ${row('Primeras cargas', c.firstDeposits, p.firstDeposits, ch.firstDeposits)}
                ${row('Cargado por referidos', c.depositTotal, p.depositTotal, ch.depositTotal, true)}
                ${row('Cantidad de cargas', c.depositCount, p.depositCount, null)}
                </tbody></table></div>`;
    };

    // Barras de los últimos 30 días (CSS puro): nuevos referidos y primeras cargas por día.
    const daily = d.daily || [];
    const maxNew = Math.max(1, ...daily.map(x => x.newReferred));
    const maxFirst = Math.max(1, ...daily.map(x => x.firstDeposits));
    const bars = (field, max, color, title) => `
        <div style="flex:1;min-width:260px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px;">
            <div style="color:${color};font-weight:bold;font-size:12px;margin-bottom:6px;">${title} <span style="color:#666;font-weight:normal;">· últimos 30 días · total ${daily.reduce((a, x) => a + (x[field] || 0), 0)}</span></div>
            <div style="display:flex;align-items:flex-end;gap:2px;height:70px;">
                ${daily.map(x => {
                    const v = x[field] || 0;
                    const h = v ? Math.max(4, Math.round((v / max) * 66)) : 1;
                    const dd = x.day.slice(8, 10) + '/' + x.day.slice(5, 7);
                    return `<div title="${dd}: ${v}" style="flex:1;height:${h}px;background:${v ? color : 'rgba(255,255,255,0.08)'};border-radius:2px 2px 0 0;"></div>`;
                }).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;color:#555;font-size:9px;margin-top:3px;">
                <span>${daily.length ? daily[0].day.slice(8, 10) + '/' + daily[0].day.slice(5, 7) : ''}</span><span>hoy</span>
            </div>
        </div>`;

    // Tabla mensual
    const monthly = d.monthly || [];
    const mRow = (m) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);${m.current ? 'background:rgba(0,255,136,0.04);' : ''}">
        <td style="padding:6px;color:#fff;font-weight:bold;">${escHtml(m.label || m.month)}${m.current ? ' <span style="color:#00ff88;font-size:9px;">EN CURSO</span>' : ''}</td>
        <td style="padding:6px;text-align:center;color:#fff;font-weight:bold;">${m.newReferred} ${m.change ? delta(m.change.newReferred) : ''}</td>
        <td style="padding:6px;text-align:center;color:#b0b0b0;">${m.newReferrers}</td>
        <td style="padding:6px;text-align:center;color:#00ff88;font-weight:bold;">${m.firstDeposits} ${m.change ? delta(m.change.firstDeposits) : ''}</td>
        <td style="padding:6px;text-align:center;color:#b0b0b0;">${m.depositors}</td>
        <td style="padding:6px;text-align:right;color:#fff;">${fmtARS(m.depositTotal)} ${m.change ? delta(m.change.depositTotal) : ''}<div style="color:#666;font-size:9px;">${m.depositCount} cargas</div></td>
        <td style="padding:6px;text-align:center;color:${m.calculated ? '#b0b0b0' : '#555'};">${m.calculated ? m.withNetwin : '—'}</td>
        <td style="padding:6px;text-align:right;color:${m.calculated ? '#d4af37' : '#555'};">${m.calculated ? fmtARS(m.commissionTotal) : 'sin calcular'}<div style="color:#666;font-size:9px;">${m.calculated ? m.referrersWithCommission + ' referidores' : ''}</div></td>
        <td style="padding:6px;text-align:right;color:${m.paidTotal ? '#00ff88' : '#555'};">${m.paidTotal ? fmtARS(m.paidTotal) : '—'}</td>
    </tr>`;

    // Distribución por nivel
    const lvl = t.levelDist || {};
    const tiers = d.tiers || [];
    const lvlChips = d.tiersEnabled ? [`<span style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#aaa;border-radius:6px;padding:3px 8px;font-size:11px;">Sin nivel (0%): <b style="color:#fff;">${lvl.none || 0}</b></span>`]
        .concat(tiers.map(tt => `<span style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.3);color:#ffd700;border-radius:6px;padding:3px 8px;font-size:11px;">${tt.count}+ activos (${tt.pct}%): <b style="color:#fff;">${lvl[String(tt.count)] || 0}</b></span>`)).join(' ')
        : '<span style="color:#888;font-size:11px;">Niveles apagados: todos cobran el % plano.</span>';

    // Quiénes están trayendo gente (últimos 30 días)
    const movers = d.movers || [];
    const moversHtml = movers.length ? movers.map(m => `<button onclick="loadAdminUserReferrals('${escHtml(m.id)}')" title="Ver detalle" style="background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.3);color:#fff;border-radius:6px;padding:4px 9px;font-size:11px;cursor:pointer;">${escHtml(m.username)} <b style="color:#00ff88;">+${m.new30}</b> <span style="color:#888;">· ${m.active} activos / ${m.referred} ref.</span></button>`).join(' ')
        : '<span style="color:#666;font-size:11px;">Nadie trajo referidos nuevos en los últimos 30 días.</span>';

    body.innerHTML = `
        ${trendBox}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px;">
            ${tile(t.referred || 0, 'Referidos totales', '#fff')}
            ${tile(t.charged || 0, 'Con al menos 1 carga', '#00ff88', (t.referred ? Math.round((t.charged / t.referred) * 100) : 0) + '% de los referidos')}
            ${tile(t.active || 0, 'Activos (≥ ' + minTxt + ')', '#ffd700', 'cuentan para el nivel')}
            ${tile(t.noCharge || 0, 'Nunca cargaron', '#ff6b6b', (t.blocked ? t.blocked + ' bloqueados' : ''))}
            ${tile(t.referrers || 0, 'Referidores', '#d4af37', (t.referrersWithActive || 0) + ' con ≥1 activo')}
            ${tile(t.referrersAtLevel || 0, 'Referidores con nivel', '#ffd700', 'cobran más de 0%')}
            ${tile(fmtARS(t.totalCharged || 0), 'Cargado por referidos', '#b0b0b0', 'histórico, cargas reales')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:12px;">
            ${winCard(w7, '📅 Últimos 7 días vs. los 7 anteriores')}
            ${winCard(w30, '📅 Últimos 30 días vs. los 30 anteriores')}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            ${bars('newReferred', maxNew, '#d4af37', '👥 Referidos nuevos por día')}
            ${bars('firstDeposits', maxFirst, '#00ff88', '💰 Primeras cargas por día')}
        </div>
        <div style="margin-bottom:12px;">
            <div style="color:#d4af37;font-weight:bold;font-size:12px;margin-bottom:6px;">📆 Mes a mes</div>
            <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:900px;font-size:12px;">
                <thead><tr style="color:#888;font-size:10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <th style="padding:6px;">Mes</th>
                    <th style="padding:6px;text-align:center;" title="Usuarios que se registraron con código de referido en el mes">Referidos nuevos</th>
                    <th style="padding:6px;text-align:center;" title="Usuarios que trajeron su primer referido en el mes">Referidores nuevos</th>
                    <th style="padding:6px;text-align:center;" title="Referidos que hicieron su primera carga real en el mes">Primeras cargas</th>
                    <th style="padding:6px;text-align:center;" title="Referidos distintos que cargaron en el mes">Cargaron en el mes</th>
                    <th style="padding:6px;text-align:right;" title="Suma de cargas reales de referidos en el mes">Cargado</th>
                    <th style="padding:6px;text-align:center;" title="Referidos con pérdida neta > 0 en el cálculo mensual">Con netwin</th>
                    <th style="padding:6px;text-align:right;" title="Comisión del período (pagada + pendiente), según el último Calcular">Comisión</th>
                    <th style="padding:6px;text-align:right;">Pagado</th>
                </tr></thead>
                <tbody>${monthly.map(mRow).join('')}</tbody>
            </table>
            </div>
            <div style="color:#666;font-size:10px;margin-top:4px;">Var. = contra el mes anterior. "Comisión" y "Con netwin" sólo existen para los meses que ya pasaron por Calcular.</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;">
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px;">
                <div style="color:#ffd700;font-weight:bold;font-size:12px;margin-bottom:6px;">🏆 Referidores por nivel</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">${lvlChips}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px;">
                <div style="color:#00ff88;font-weight:bold;font-size:12px;margin-bottom:6px;">🚀 Quiénes trajeron gente (últimos 30 días)</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">${moversHtml}</div>
            </div>
        </div>`;
}
```

**b)** Después de `window.adminReferralPayout = adminReferralPayout;` (niveles + % plano):

```js
window.adminReferralPreview = adminReferralPreview;
window.adminReferralCalculate = adminReferralCalculate;
window.adminReferralPayout = adminReferralPayout;

// #317 (réplica #171/#169): niveles de comisión por referidos activos + % plano (COMANDOS).
// ── #168 Premios por cantidad de referidos ──────────────────────────────────
function addRefMsTier(t) {
    const b = document.getElementById('refMsTiers'); if (!b) return;
    t = t || {};
    b.insertAdjacentHTML('beforeend', '<tr class="refms-row"><td><input type="number" class="refms-count" min="1" value="' + (t.count || '') + '" style="width:90px;"></td>' +
        '<td><input type="number" class="refms-pct" min="0.01" max="50" step="0.5" value="' + (t.pct != null ? t.pct : '') + '" style="width:100px;"> %</td>' +
        '<td><button class="btn btn-sm" style="background:#dc3545;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;" onclick="this.closest(\'.refms-row\').remove()">🗑️</button></td></tr>');
}
async function loadReferralMilestones() {
    const b = document.getElementById('refMsTiers'); if (!b) return;
    try {
        const r = await authFetch('/api/admin/referrals/milestones-config');
        if (!r.ok) { b.closest('div').style.display = 'none'; return; }
        const c = await r.json();
        const en = document.getElementById('refMsEnabled'); if (en) en.checked = c.enabled !== false;
        const mn = document.getElementById('refMsMin'); if (mn) mn.value = c.minChargedARS;
        const bp = document.getElementById('refMsBasePct'); if (bp) bp.value = c.basePct != null ? c.basePct : 0;
        b.innerHTML = ''; (c.tiers || []).forEach(t => addRefMsTier(t));
    } catch (_) {}
}
async function saveReferralMilestones() {
    const tiers = Array.from(document.querySelectorAll('#refMsTiers .refms-row')).map(r => ({ count: Number(r.querySelector('.refms-count').value), pct: Number(r.querySelector('.refms-pct').value) }));
    const body = { enabled: !!(document.getElementById('refMsEnabled') || {}).checked, minChargedARS: Number((document.getElementById('refMsMin') || {}).value), basePct: Number((document.getElementById('refMsBasePct') || {}).value), tiers };
    const m = document.getElementById('refMsMsg');
    try {
        const r = await authFetch('/api/admin/referrals/milestones-config', { method: 'POST', body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { if (m) { m.style.color = '#ff8080'; m.textContent = '❌ ' + (j.error || 'No se pudo guardar'); } return; }
        if (m) { m.style.color = '#66ff99'; m.textContent = '✅ Guardado: base ' + j.basePct + '% · ' + (j.tiers || []).map(t => t.count + ' activos → ' + t.pct + '%').join(' · ') + ' · activo = cargó ≥ $' + Number(j.minChargedARS).toLocaleString('es-AR') + (j.enabled === false ? ' · APAGADO (rige el % plano)' : ''); }
        showToast('Niveles de comisión guardados', 'success');
    } catch (_) { if (m) { m.style.color = '#ff8080'; m.textContent = '❌ Error'; } }
}
window.addRefMsTier = addRefMsTier; window.loadReferralMilestones = loadReferralMilestones; window.saveReferralMilestones = saveReferralMilestones;


// ── #169 % de comisión de referidos ─────────────────────────────────────────
async function loadReferralRate() {
    const form = document.getElementById('referralRateForm'), header = document.getElementById('referralRateHeader');
    try {
        const r = await authFetch('/api/admin/referral-rate');
        if (!r.ok) { if (form) form.style.display = 'none'; if (header) header.style.display = 'none'; return; }
        if (form) form.style.display = ''; if (header) header.style.display = '';
        const j = await r.json();
        const el = document.getElementById('referralRatePct'); if (el) el.value = j.percent;
    } catch (_) {}
}
async function saveReferralRate() {
    const m = document.getElementById('referralRateMsg');
    const pct = Number((document.getElementById('referralRatePct') || {}).value);
    try {
        const r = await authFetch('/api/admin/referral-rate', { method: 'POST', body: JSON.stringify({ percent: pct }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { if (m) { m.style.color = '#ff8080'; m.textContent = '❌ ' + (j.error || 'No se pudo guardar'); } return; }
        if (m) { m.style.color = '#66ff99'; m.textContent = '✅ Comisión de referidos: ' + j.percent + '%'; }
        showToast('Comisión de referidos: ' + j.percent + '%', 'success');
    } catch (_) { if (m) { m.style.color = '#ff8080'; m.textContent = '❌ Error'; } }
}
window.loadReferralRate = loadReferralRate; window.saveReferralRate = saveReferralRate;
```

### 4.3 `admin.js` — funciones EXISTENTES que cambian

`loadCommands` llama a `loadReferralRate()`; `loadAdminReferralSummary` llama a
`loadReferralMilestones()` + `loadReferralActivity()`; `renderReferrersTable` suma 5
columnas (con carga / activos / nivel / nuevos 30d / último ref.) leídas de
`referralActivityByReferrer`; `filterReferrersTable` suma los modos `active` y `new30`;
`loadAdminUserReferrals` guarda `referralDetailCurrentId`, pinta estado/cargas/netwin por
referido, tiles NIVEL HOY / CARGADO / NETWIN GENERADO y al final dispara
`loadReferralDetailNetwin(userId)`; tooltip "(JG: …)" → "(plataforma: …)".

```diff
diff --git a/public/adminprivado2026/admin.js b/public/adminprivado2026/admin.js
index d0cc3ef..5c74b20 100644
--- a/public/adminprivado2026/admin.js
+++ b/public/adminprivado2026/admin.js
@@ -5813,6 +5813,8 @@ async function loadCommands() {
         
         // Cargar CBU
         loadCBUConfig();
+        // #317 % plano de comisión de referidos (solo admin general; escribe /sys_referidos_pct)
+        loadReferralRate();
     } catch (error) {
         console.error('Error loading commands:', error);
     }
@@ -8308,6 +8310,265 @@ function fmtPeriod(pk) {
 // Cached referrers for client-side quick filters
 let cachedReferrers = [];
 
+// (… acá va el bloque NUEVO "actividad / ranking / netwin en vivo" — ver 4.2 …)
 async function loadAdminReferralSummary() {
     const container = document.getElementById('referralTopList');
     const summaryContainer = document.getElementById('referralGlobalSummary');
@@ -8315,6 +8576,8 @@ async function loadAdminReferralSummary() {
     container.innerHTML = '<span style="color:#888;">Cargando...</span>';
     // Always load payouts independently
     loadAdminReferralPayouts();
+    loadReferralMilestones(); // #168
+    loadReferralActivity(); // #174 actividad y evolución (llena también las columnas de la tabla)
     try {
         const res = await fetch(`${API_URL}/api/referrals/admin/summary`, {
             headers: { 'Authorization': `Bearer ${currentToken}` }
@@ -8335,7 +8598,7 @@ async function loadAdminReferralSummary() {
                     <div style="font-size:11px;color:#888;margin-top:4px;">${label}</div>
                  </div>`;
             summaryContainer.innerHTML =
-                card(summary.totalReferrers || 0, 'Referidores activos', '#d4af37', 'rgba(212,175,55,0.05)') +
+                card(summary.totalReferrers || 0, 'Referidores (con ≥1 referido)', '#d4af37', 'rgba(212,175,55,0.05)') +
                 card(summary.totalReferred || 0, 'Usuarios referidos', '#00ff88', 'rgba(0,255,136,0.05)') +
                 card(fmtARS(summary.totalHistoricalPaid || 0), 'Total pagado', '#00ff88', 'rgba(0,255,136,0.05)') +
                 card(fmtARS(summary.totalPending || 0), 'Pendiente de pago', '#f7931e', 'rgba(247,147,30,0.05)') +
@@ -8378,11 +8641,16 @@ function renderReferrersTable(referrers) {
 
     container.innerHTML = `
     <div style="overflow-x:auto;">
-    <table id="referrersTableEl" style="width:100%;border-collapse:collapse;min-width:780px;">
+    <table id="referrersTableEl" style="width:100%;border-collapse:collapse;min-width:1100px;">
         <thead><tr style="color:#888;font-size:11px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">
             <th style="padding:7px 6px;">Usuario</th>
             <th style="padding:7px 6px;">Código</th>
             <th style="padding:7px 6px;text-align:center;">Referidos</th>
+            <th style="padding:7px 6px;text-align:center;" title="Referidos con al menos una carga real">Con carga</th>
+            <th style="padding:7px 6px;text-align:center;" title="Referidos con cargas reales acumuladas ≥ el mínimo del nivel">Activos</th>
+            <th style="padding:7px 6px;text-align:center;" title="% de comisión que le corresponde hoy según sus referidos activos">Nivel</th>
+            <th style="padding:7px 6px;text-align:center;" title="Referidos nuevos en los últimos 30 días">Nuevos 30d</th>
+            <th style="padding:7px 6px;" title="Fecha del último referido que trajo">Último ref.</th>
             <th style="padding:7px 6px;text-align:right;">Total Pagado</th>
             <th style="padding:7px 6px;text-align:right;">Pendiente</th>
             <th style="padding:7px 6px;text-align:right;">Total Generado</th>
@@ -8398,6 +8666,19 @@ function renderReferrersTable(referrers) {
                 <td style="padding:7px 6px;color:#fff;font-weight:bold;">${r.username}${r.excludedFromReferral ? ' <span style="color:#ff4444;font-size:10px;">EXCLUIDO</span>' : ''}</td>
                 <td style="padding:7px 6px;color:#d4af37;letter-spacing:2px;font-size:12px;">${r.referralCode || '—'}</td>
                 <td style="padding:7px 6px;color:#00ff88;font-weight:bold;text-align:center;">${r.totalReferreds}</td>
+                ${(() => {
+                    const a = referralActivityByReferrer.get(r.id);
+                    if (!a) return '<td colspan="5" style="padding:7px 6px;color:#555;font-size:11px;text-align:center;">' + (referralActivityLoaded ? '—' : 'cargando…') + '</td>';
+                    const pctTxt = a.pct == null ? '—' : (a.pct + '%');
+                    const pctColor = a.pct > 0 ? '#ffd700' : '#666';
+                    const next = a.nextTier ? `<div style="color:#666;font-size:9px;">faltan ${a.nextTier.missing} p/ ${a.nextTier.pct}%</div>` : '';
+                    const isNew = a.new30 > 0;
+                    return `<td style="padding:7px 6px;color:#b0b0b0;text-align:center;">${a.charged}</td>
+                <td style="padding:7px 6px;color:${a.active > 0 ? '#00ff88' : '#666'};font-weight:bold;text-align:center;">${a.active}</td>
+                <td style="padding:7px 6px;text-align:center;"><span style="color:${pctColor};font-weight:bold;">${pctTxt}</span>${a.mode === 'override' ? '<div style="color:#888;font-size:9px;">override</div>' : next}</td>
+                <td style="padding:7px 6px;text-align:center;color:${isNew ? '#00ff88' : '#555'};font-weight:${isNew ? 'bold' : 'normal'};">${isNew ? '+' + a.new30 : '0'}</td>
+                <td style="padding:7px 6px;color:#888;font-size:11px;">${a.lastReferredAt ? fmtFechaAR(a.lastReferredAt) : '—'}</td>`;
+                })()}
                 <td style="padding:7px 6px;color:#00ff88;text-align:right;">${fmtARS(fs.totalSettledCommission || 0)}</td>
                 <td style="padding:7px 6px;text-align:right;">
                     <span style="color:${hasPending?'#f7931e':'#888'};font-weight:${hasPending?'bold':'normal'};">${fmtARS(fs.totalPendingCommission || 0)}</span>
@@ -8420,13 +8701,13 @@ function renderReferrersTable(referrers) {
  */
 function filterReferrersTable(mode) {
     // Highlight active filter button
-    ['referralFilterAll', 'referralFilterPending', 'referralFilterFailed'].forEach(id => {
+    ['referralFilterAll', 'referralFilterPending', 'referralFilterFailed', 'referralFilterActive', 'referralFilterNew30'].forEach(id => {
         const btn = document.getElementById(id);
         if (!btn) return;
         btn.style.opacity = '0.5';
         btn.style.fontWeight = 'normal';
     });
-    const activeId = mode === 'pending' ? 'referralFilterPending' : mode === 'failed' ? 'referralFilterFailed' : 'referralFilterAll';
+    const activeId = mode === 'pending' ? 'referralFilterPending' : mode === 'failed' ? 'referralFilterFailed' : mode === 'active' ? 'referralFilterActive' : mode === 'new30' ? 'referralFilterNew30' : 'referralFilterAll';
     const activeBtn = document.getElementById(activeId);
     if (activeBtn) { activeBtn.style.opacity = '1'; activeBtn.style.fontWeight = 'bold'; }
 
@@ -8437,6 +8718,10 @@ function filterReferrersTable(mode) {
         filtered = cachedReferrers.filter(r => (r.financialStats?.totalPendingCommission || 0) > 0);
     } else if (mode === 'failed') {
         filtered = cachedReferrers.filter(r => r.financialStats?.latestPayoutStatus === 'failed');
+    } else if (mode === 'active') { // #174
+        filtered = cachedReferrers.filter(r => (referralActivityByReferrer.get(r.id)?.active || 0) > 0);
+    } else if (mode === 'new30') { // #174
+        filtered = cachedReferrers.filter(r => (referralActivityByReferrer.get(r.id)?.new30 || 0) > 0);
     }
     renderReferrersTable(filtered);
 }
@@ -8547,6 +8832,7 @@ async function loadAdminReferralPayouts() {
 async function loadAdminUserReferrals(userId) {
     const detailPanel = document.getElementById('referralUserDetail');
     const detailContent = document.getElementById('referralUserDetailContent');
+    referralDetailCurrentId = userId; // #175
     if (detailPanel) detailPanel.style.display = 'block';
     if (detailContent) detailContent.innerHTML = '<span style="color:#888;">Cargando detalle...</span>';
     // Scroll to detail
@@ -8564,16 +8850,25 @@ async function loadAdminUserReferrals(userId) {
         const u = d.user;
         const fs = d.financialSummary || {};
 
-        const referredRows = (d.referredUsers || []).map(ru => `
+        const act = d.activity || null; // #174
+        const referredRows = (d.referredUsers || []).map(ru => {
+            const st = ru.qualified ? '<span style="color:#ffd700;font-size:11px;font-weight:bold;">⭐ Activo</span>'
+                : ru.charges > 0 ? '<span style="color:#00ff88;font-size:11px;">💰 Cargó</span>'
+                : '<span style="color:#888;font-size:11px;">Sin carga</span>';
+            return `
             <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
-                <td style="padding:5px 6px;color:#fff;">${ru.username}</td>
+                <td style="padding:5px 6px;color:#fff;">${escHtml(ru.username)}${ru.isBlocked ? ' <span style="color:#ff4444;font-size:10px;">BLOQ</span>' : ''}</td>
                 <td style="padding:5px 6px;color:#b0b0b0;font-size:11px;">${fmtDate(ru.referredAt)}</td>
-                <td style="padding:5px 6px;">
-                    <span style="color:${ru.referralStatus==='active'?'#00ff88':ru.referralStatus==='referred'?'#f7931e':'#888'};font-size:11px;">${ru.referralStatus || '—'}</span>
-                </td>
-                <td style="padding:5px 6px;color:${ru.excludedFromReferral?'#ff4444':'#888'};font-size:11px;">${ru.excludedFromReferral ? '❌ Excluido' : '✅ Activo'}</td>
-            </tr>
-        `).join('');
+                <td style="padding:5px 6px;">${st}</td>
+                <td style="padding:5px 6px;text-align:center;color:${ru.charges ? '#fff' : '#555'};">${ru.charges || 0}</td>
+                <td style="padding:5px 6px;text-align:right;color:${ru.totalCharged ? '#00ff88' : '#555'};">${fmtARS(ru.totalCharged || 0)}</td>
+                <td style="padding:5px 6px;color:#888;font-size:11px;">${ru.lastChargeAt ? fmtFechaAR(ru.lastChargeAt) : '—'}</td>
+                <td id="refNet-${escHtml(ru.id)}" style="padding:5px 6px;text-align:right;">${ru.charges > 0 ? '<span style="color:#666;font-size:10px;">cargando…</span>' : '<span style="color:#555;">—</span>'}</td>
+                <td id="refCom-${escHtml(ru.id)}" style="padding:5px 6px;text-align:right;">${ru.charges > 0 ? '<span style="color:#666;font-size:10px;">…</span>' : '<span style="color:#555;">—</span>'}</td>
+                <td style="padding:5px 6px;text-align:right;color:${ru.netwinHist > 0 ? '#ffd700' : ru.netwinHist < 0 ? '#ff6b6b' : '#555'};" title="${ru.periodsCalculated ? ru.periodsCalculated + ' mes(es) calculados, último ' + escHtml(ru.lastPeriodCalculated || '') : 'Sin cálculo mensual todavía'}">${ru.periodsCalculated ? fmtARS(ru.netwinHist) : '—'}${ru.commissionHist ? `<div style="color:#888;font-size:9px;">com. ${fmtARS(ru.commissionHist)}</div>` : ''}</td>
+                <td style="padding:5px 6px;color:${ru.excludedFromReferral?'#ff4444':'#888'};font-size:11px;">${ru.excludedFromReferral ? '❌ Excluido' : '✅'}</td>
+            </tr>`;
+        }).join('');
 
         // Enriched commission rows with paid/pending breakdown
         const commissionRows = (d.commissions || []).slice(0, 30).map(c => {
@@ -8648,7 +8943,23 @@ async function loadAdminUserReferrals(userId) {
                     <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px;text-align:center;">
                         <div style="color:#888;font-size:10px;margin-bottom:4px;">REFERIDOS</div>
                         <div style="color:#00ff88;font-weight:bold;font-size:20px;">${d.totalReferred}</div>
+                        ${act ? `<div style="color:#888;font-size:10px;">${act.charged} cargaron · ${act.active} activos</div>` : ''}
+                    </div>
+                    ${act ? `<div style="background:rgba(255,215,0,0.03);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:10px;text-align:center;">
+                        <div style="color:#888;font-size:10px;margin-bottom:4px;">NIVEL HOY</div>
+                        <div style="color:#ffd700;font-weight:bold;font-size:20px;">${act.pct}%</div>
+                        <div style="color:#888;font-size:10px;">${act.mode === 'override' ? 'override manual' : act.mode === 'flat' ? '% plano' : (act.nextTier ? `faltan ${act.nextTier.missing} activos p/ ${act.nextTier.pct}%` : 'nivel máximo')}</div>
+                    </div>
+                    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px;text-align:center;">
+                        <div style="color:#888;font-size:10px;margin-bottom:4px;">CARGADO POR SUS REFERIDOS</div>
+                        <div style="color:#b0b0b0;font-weight:bold;">${fmtARS(act.totalCharged)}</div>
+                        <div style="color:#666;font-size:10px;">activo = ≥ ${fmtARS(act.minChargedARS)}</div>
                     </div>
+                    <div style="background:rgba(255,215,0,0.03);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:10px;text-align:center;">
+                        <div style="color:#888;font-size:10px;margin-bottom:4px;">NETWIN GENERADO (CALC.)</div>
+                        <div style="color:${act.netwinHist > 0 ? '#ffd700' : '#b0b0b0'};font-weight:bold;">${fmtARS(act.netwinHist || 0)}</div>
+                        <div style="color:#666;font-size:10px;">com. ${fmtARS(act.commissionHist || 0)} en los meses calculados</div>
+                    </div>` : ''}
                     <div style="background:rgba(0,255,136,0.03);border:1px solid rgba(0,255,136,0.15);border-radius:8px;padding:10px;text-align:center;">
                         <div style="color:#888;font-size:10px;margin-bottom:4px;">TOTAL PAGADO</div>
                         <div style="color:#00ff88;font-weight:bold;">${fmtARS(fs.totalSettledCommission || d.totalCommissionHistorical || 0)}</div>
@@ -8666,13 +8977,20 @@ async function loadAdminUserReferrals(userId) {
 
                 ${d.referredUsers && d.referredUsers.length > 0 ? `
                 <div style="margin-bottom:16px;">
-                    <h4 style="color:#d4af37;margin-bottom:8px;font-size:13px;">👥 Usuarios Referidos (${d.referredUsers.length})</h4>
+                    <h4 style="color:#d4af37;margin-bottom:4px;font-size:13px;">👥 Usuarios Referidos (${d.referredUsers.length}) <span style="color:#888;font-size:11px;font-weight:normal;">· ordenados por netwin calculado</span></h4>
+                    <div id="referralDetailNetwinSummary" style="font-size:12px;margin-bottom:8px;color:#888;">Leyendo el netwin del mes en 1girox…</div>
                     <div style="overflow-x:auto;">
-                    <table style="width:100%;border-collapse:collapse;min-width:400px;">
+                    <table style="width:100%;border-collapse:collapse;min-width:900px;">
                         <thead><tr style="color:#888;font-size:11px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.1);">
                             <th style="padding:5px 6px;">Usuario</th>
                             <th style="padding:5px 6px;">Registro</th>
                             <th style="padding:5px 6px;">Estado</th>
+                            <th style="padding:5px 6px;text-align:center;">Cargas</th>
+                            <th style="padding:5px 6px;text-align:right;">Total cargado</th>
+                            <th style="padding:5px 6px;">Última carga</th>
+                            <th style="padding:5px 6px;text-align:right;color:#ffd700;" title="Pérdida neta del referido en el mes en curso, leída en vivo de 1girox (cache 15 min)">Netwin mes</th>
+                            <th style="padding:5px 6px;text-align:right;color:#d4af37;" title="Netwin del mes × % actual del referidor">Com. mes</th>
+                            <th style="padding:5px 6px;text-align:right;" title="Netwin acumulado en los cálculos mensuales ya hechos (Calcular)">Netwin calc.</th>
                             <th style="padding:5px 6px;">Acceso</th>
                         </tr></thead>
                         <tbody>${referredRows}</tbody>
@@ -8706,6 +9024,9 @@ async function loadAdminUserReferrals(userId) {
                 </div>` : '<div style="color:#888;font-size:12px;">Sin pagos realizados aún.</div>'}
             `;
         }
+        // #175: netwin del mes en vivo, después de pintar (1girox puede tardar).
+        if ((d.referredUsers || []).some(ru => ru.charges > 0)) loadReferralDetailNetwin(userId);
+        else { const box = document.getElementById('referralDetailNetwinSummary'); if (box) box.innerHTML = '<span style="color:#666;">Ningún referido cargó todavía: no hay netwin que leer.</span>'; }
     } catch (e) {
         if (detailContent) detailContent.innerHTML = '<span style="color:#ff4444;">Error: ' + e.message + '</span>';
     }
@@ -8884,7 +9205,7 @@ function renderReferralCalcResult(data, container, actionLabel) {
         html += `<div style="background:rgba(255,68,68,0.05);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:10px;margin-bottom:10px;">
             <div style="color:#ff4444;font-size:12px;margin-bottom:6px;font-weight:600;">ERRORES EN REVENUE (${errors.length}):</div>
             ${errors.map(e => `<div style="color:#ff8888;font-size:11px;margin-bottom:4px;">
-                • <strong>${escHtml(e.referredUsername || '?')}</strong>${e.jugayganaUsername && e.jugayganaUsername !== e.referredUsername ? ` <span style="color:#888;">(JG: ${escHtml(e.jugayganaUsername)})</span>` : ''}
+                • <strong>${escHtml(e.referredUsername || '?')}</strong>${e.jugayganaUsername && e.jugayganaUsername !== e.referredUsername ? ` <span style="color:#888;">(plataforma: ${escHtml(e.jugayganaUsername)})</span>` : ''}
                 ${e.periodKey ? `<span style="color:#888;"> período ${escHtml(e.periodKey)}</span>` : ''}
                 → <span style="color:#ff6666;">${escHtml(e.error)}</span>
                 ${e.statusCode ? `<span style="color:#888;font-size:10px;"> [HTTP ${e.statusCode}]</span>` : ''}
@@ -9088,6 +9409,66 @@ window.adminReferralPreview = adminReferralPreview;
 window.adminReferralCalculate = adminReferralCalculate;
 window.adminReferralPayout = adminReferralPayout;
 
+// (… acá va el bloque NUEVO "niveles + % plano" — ver 4.2 …)
 // ============================================
 // CAMBIAR CONTRASEÑA PROPIA DEL ADMIN
 // ============================================
```

### 4.4 `public/admin-sw.js`

Bumpear `CACHE_VERSION` con nota `vNN: referidos 2.0 — actividad, ranking, netwin por referido, niveles de % y card del % plano (#317)`.

**PROBAR 4:** `node --check admin.js admin-sw.js`, HTML balanceado. Panel → COMANDOS → card
"🤝 Comisión de referidos": guardar 4 → el comando `/sys_referidos_pct` queda en "4" y en
≤ 60 s el cliente ve 4% (con niveles OFF). Panel → Referidos: actividad y ranking cargan al
instante (sin 1girox); "Ver referidos" → netwin del mes en vivo por referido; editor de
niveles valida (% creciente, base ≤ primer nivel, sin cantidades repetidas); filtros "⭐
Con activos" / "🚀 Nuevos 30d". Vista previa del cálculo → la tasa de cada referidor = su
nivel.

---

## NO REPLICAR (cosas propias de PAUTANUEVAsantino)

- Números de línea de `server.js` / `ui.js` citados en comentarios: son orientativos.
- Los `?v=NNN` y versiones de SW concretas (v185–v194 / admin v68): usá las tuyas.
- `_rouletteDateKeyART()` si tu repo lo llama distinto: cualquier helper de "día ART".
- Si tu repo NO tiene hub PREMIOS / asistente / widget: 2.5, 3.5, 3.6 y 3.7 no aplican.

## CIERRE

- Un commit por feature (1 → 4), `node --check` antes de cada uno, WORKLOG + ARCHITECTURE +
  (si cambia el contexto) CLAUDE.md actualizados en el MISMO commit, push a main.
- ⚠️ **Los niveles vienen ON por default** (3/5/10 activos → 1/2/3%, base 0%): un referidor
  con menos de 3 activos pasa a cobrar 0% desde el próximo cálculo. Confirmalo con el owner
  o apagá los niveles en el panel (rige el % plano para todos).
- Después del deploy, correr la lista PROBAR 1–4 completa con una cuenta de CLIENTE (no admin).
