#!/usr/bin/env node
// #354–#356 (réplica #236–#238 de CARGASGIROXactivo) Regalo con rollover a un jugador que ya tiene un bono activo: por
// defecto se UNIFICA (un bono nuevo por viejo + regalo, con rollover) — nunca como depósito, que 1girox muestra como Carga.
// En frío: se simula la API de 1girox (axios/uuid/logger stubeados; en Tails no hay node_modules).
//   node scripts/test-gift-fallback.js
const assert = require('assert');
const path = require('path');
const Module = require('module');
process.env.GIROX_API_URL = 'https://api.prueba.test/v1'; process.env.GIROX_API_KEY = 'k-prueba';
const calls = [];
const state = { bonusLocked: 0, cfg: { bonus: { enabled: true, standalone_enabled: true, multipliers: [0, 3, 5], fixed_min: 2, fixed_max: 500000 } }, bonusFail: null };
const origLoad = Module._load;
Module._load = function (req, parent, ...rest) {
  if (req === 'axios') {
    return async ({ method, url, data }) => {
      const p = url.replace(process.env.GIROX_API_URL, ''); const m = String(method).toLowerCase();
      calls.push({ m, p, data });
      if (m === 'get' && p === '/config') return { status: 200, data: state.cfg };
      if (m === 'get' && /^\/players\/[^/]+$/.test(p)) return { status: 200, data: { player: { username: 'jug', balance: 1000, wagering: { available: 1000, locked: state.bonusLocked, bonus_locked: state.bonusLocked, claimable_total: state.claimable || 0 } } } };
      if (m === 'post' && /\/bonus$/.test(p)) {
        if (state.timeout) { const e = new Error('timeout of 15000ms exceeded'); e.code = 'ECONNABORTED'; throw e; }
        if (state.bonusFail && data.multiplier > 0) { const e = new Error('422'); e.response = { status: 422, data: { error: { code: state.bonusFail, message: 'x' }, code: state.bonusFail } }; throw e; }
        // saldo antes = 1000. Con multiplier > 0, 1girox debita el resto del bono viejo y acredita el nuevo.
        const after = data.multiplier > 0 ? 1000 - (state.noDebit ? 0 : state.bonusLocked) + data.amount : 1000 + data.amount;
        return { status: 200, data: { balance: after, operation: { ledger_id: 77, reference: data.reference, type: 'bonus' } } };
      }
      if (m === 'post' && /\/deposit$/.test(p)) return { status: 200, data: { operation: { ledger_id: 88, reference: data.reference, type: 'deposit' } } };
      return { status: 200, data: {} };
    };
  }
  if (/utils\/logger$/.test(req)) return { warn() {}, info() {}, error() {}, debug() {} };
  try { return origLoad.call(this, req, parent, ...rest); } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND' && req === 'uuid') return { v4: () => require('crypto').randomUUID() };
    throw e;
  }
};
// giroxService espeja warn/error a consola: en el test se silencia para leer solo los resultados.
const _cw = console.warn, _ce = console.error; console.warn = () => {}; console.error = () => {};
const girox = require(path.join(__dirname, '..', 'src/services/giroxService'));
let mode = undefined;
girox.setRolloverResolver(async () => 3);          // rollover GLOBAL x3 encendido
girox.setGiftFallbackResolver(async () => mode);
const anomalies = [];
girox.setGiftMergeAnomalyHook((a) => anomalies.push(a));
const postsRaw = () => calls.filter((c) => c.m === 'post');
const posts = () => postsRaw().map((c) => c.p.split('/').pop() + (c.data.multiplier != null ? ':x' + c.data.multiplier : ''));
const reset = (o) => { calls.length = 0; anomalies.length = 0; Object.assign(state, { bonusLocked: 0, bonusFail: null, claimable: 0, noDebit: false, timeout: false }, o || {}); };

(async () => {
  let n = 0; const ok = (t) => { n++; console.log('  ✅ ' + t); };

  reset(); mode = undefined;
  let r = await girox.creditUserBalance('jug', 1000, 'vip-rf-1', { description: 'REEMBOLSO diario' });
  assert.ok(r.success); assert.deepStrictEqual(posts(), ['bonus:x3']); assert.strictEqual(r.creditedAs, 'bonus'); assert.strictEqual(r.via, 'bonus'); assert.strictEqual(r.rolloverApplied, 3);
  assert.strictEqual(postsRaw()[0].data.amount, 1000); assert.strictEqual(r.mergedOld, undefined);
  ok('sin bono activo: sale como bono con el rollover global (igual que antes)');

  // ---- UNIFICAR (default) ----
  reset({ bonusLocked: 5000 }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2', {});
  assert.ok(r.success); assert.deepStrictEqual(posts(), ['bonus:x3'], 'un solo bono, nunca /deposit');
  let b = postsRaw()[0].data;
  assert.strictEqual(b.amount, 6000, 'bono nuevo = resto del viejo (5000) + regalo (1000)'); assert.strictEqual(b.reference, 'vip-rf-2');
  assert.strictEqual(r.creditedAs, 'bonus'); assert.strictEqual(r.rolloverApplied, 3); assert.strictEqual(r.mergedOld, 5000); assert.strictEqual(r.mergedTotal, 6000);
  assert.strictEqual(r.giftAmount, 1000, 'el regalo sigue siendo el monto pedido');
  assert.strictEqual(anomalies.length, 0);
  ok('jugador CON bono activo: se UNIFICA — bono nuevo por viejo + regalo, con rollover, misma reference, sin depósito');

  reset({ bonusLocked: 5000 }); mode = 'merge';
  r = await girox.creditGift('jug', 500, { rolloverX: 5, reference: 'vip-roulette-1', description: 'Premio ruleta' });
  b = postsRaw()[0].data;
  assert.deepStrictEqual(posts(), ['bonus:x3']); assert.strictEqual(b.amount, 5500); assert.ok(/bono anterior/.test(b.description));
  ok('ruleta / fueguito / reembolso en vivo (creditGift) con bono activo: también unifica');

  reset({ bonusLocked: 5000, noDebit: true }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2b', {});
  assert.ok(r.success); assert.strictEqual(anomalies.length, 1); assert.strictEqual(anomalies[0].gained, 6000); assert.strictEqual(anomalies[0].old, 5000); assert.strictEqual(anomalies[0].gift, 1000);
  ok('control: si 1girox NO debita el bono viejo (el saldo sube de más) → avisa para apagar la unificación');

  reset({ bonusLocked: 5000, claimable: 300 }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2c', { description: 'REEMBOLSO diario' });
  assert.deepStrictEqual(posts(), ['deposit:x3']); assert.strictEqual(r.creditedAs, 'deposit'); assert.strictEqual(postsRaw()[0].data.amount, 1000);
  assert.ok(/^BONO \(contar como BONO, NO como carga\): REEMBOLSO diario/.test(postsRaw()[0].data.description), 'la descripción avisa que es un bono');
  ok('tiene un bono cumplido sin reclamar: no se unifica → depósito con rollover (queda marcado y la descripción avisa)');

  reset({ bonusLocked: 499500 }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2d', {});
  assert.deepStrictEqual(posts(), ['deposit:x3']); assert.strictEqual(postsRaw()[0].data.amount, 1000);
  ok('unificado superaría el máximo de bono de la plataforma: depósito con rollover');

  reset({ bonusLocked: 40 }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2e', {});
  assert.deepStrictEqual(posts(), ['bonus:x3']); assert.strictEqual(postsRaw()[0].data.amount, 1000); assert.strictEqual(r.mergedOld, undefined);
  ok('resto de bono mínimo (hasta $50): bono normal, como siempre');

  reset({ bonusLocked: 5000, timeout: true }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2g', {});
  assert.strictEqual(r.success, false); assert.ok(postsRaw().every((c) => /\/bonus$/.test(c.p)), 'nunca cambia de vía ante un error transitorio');
  assert.ok(postsRaw().every((c) => c.data.reference === 'vip-rf-2g' && c.data.amount === 6000), 'los reintentos internos van con la misma reference y el mismo monto');
  ok('error transitorio al unificar (timeout): se devuelve el fallo, NO cae a depósito (podría pagar dos veces)');

  reset({ bonusLocked: 5000 }); mode = 'bonus0';
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-2f', {});
  assert.deepStrictEqual(posts(), ['bonus:x0']); assert.strictEqual(r.rolloverApplied, 0); assert.strictEqual(r.creditedAs, 'bonus'); assert.strictEqual(postsRaw()[0].data.amount, 1000);
  ok('opción del panel "bono sin rollover": sale como bono 0');

  reset({ bonusLocked: 5000 }); mode = 'deposit';
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-3', {});
  assert.ok(r.success); assert.deepStrictEqual(posts(), ['deposit:x3']); assert.strictEqual(r.creditedAs, 'deposit'); assert.strictEqual(r.via, 'deposit'); assert.strictEqual(r.rolloverApplied, 3); assert.ok(r.fallbackReason);
  assert.strictEqual(postsRaw()[0].data.reference, 'vip-rf-3');
  ok('opción del panel "depósito con rollover": se comporta como antes y avisa que fue depósito');

  reset({ bonusFail: 'bonus_out_of_range' }); mode = 'bonus0';
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-4', {});
  assert.ok(r.success); assert.deepStrictEqual(posts(), ['bonus:x3', 'bonus:x0']); assert.strictEqual(r.creditedAs, 'bonus');
  assert.strictEqual(postsRaw()[0].data.reference, postsRaw()[1].data.reference, 'misma reference en los dos intentos');
  ok('la plataforma rechaza el bono con rollover (modo bono 0): reintenta como bono sin rollover con la MISMA reference');

  reset({ bonusFail: 'bonus_out_of_range' }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-rf-4b', {});
  assert.ok(r.success); assert.deepStrictEqual(posts(), ['bonus:x3', 'deposit:x3']); assert.strictEqual(r.creditedAs, 'deposit');
  assert.strictEqual(postsRaw()[0].data.reference, postsRaw()[1].data.reference, 'misma reference');
  ok('la plataforma rechaza el bono con rollover (modo unificar): depósito con rollover, misma reference, marcado');

  reset({ bonusLocked: 5000 }); mode = 'bonus0';
  r = await girox.creditUserBalance('jug', 1, 'vip-rf-5', { description: 'REEMBOLSO diario del 2026-11-25' });
  assert.ok(r.success); assert.deepStrictEqual(posts(), ['deposit']); assert.strictEqual(r.creditedAs, 'deposit');
  assert.ok(/contar como BONO.*REEMBOLSO diario.*limitación de la API/.test(postsRaw()[0].data.description));
  ok('monto fuera de lo que 1girox acepta como bono (ej. $1), modo bono 0: depósito libre — queda marcado');

  reset(); mode = undefined;
  r = await girox.creditUserBalance('jug', 1, 'vip-rf-6', {});
  assert.deepStrictEqual(posts(), ['deposit:x3']); assert.strictEqual(r.creditedAs, 'deposit'); assert.ok(/^BONO \(contar como BONO/.test(postsRaw()[0].data.description));
  ok('monto fuera de rango, modo unificar: depósito con rollover — queda marcado');

  reset({ bonusLocked: 5000 }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-payoutref-bonus-1', { ignoreGlobalRollover: true, description: 'DEVOLUCIÓN de retiro rechazado' });
  assert.deepStrictEqual(posts(), ['bonus:x0']); assert.strictEqual(postsRaw()[0].data.amount, 1000); assert.strictEqual(r.mergedOld, undefined);
  ok('devolución / comisión (sin rollover global): no cambia, nunca unifica');

  reset({ bonusLocked: 5000 }); mode = undefined;
  r = await girox.creditUserBalance('jug', 1000, 'vip-bonus-1', { multiplier: 3, description: 'BONO manual' });
  assert.deepStrictEqual(posts(), ['bonus:x3']); assert.strictEqual(postsRaw()[0].data.amount, 1000); assert.strictEqual(r.mergedOld, undefined);
  ok('multiplier EXPLÍCITO (bono manual, lotes, código de bienvenida): /bonus directo por el monto pedido, sin unificar');

  console.warn = _cw; console.error = _ce;
  console.log('\n✅ Todo OK (' + n + ')');
})().catch((e) => { console.warn = _cw; console.error = _ce; console.error('❌ ' + (e && e.stack || e)); console.error(JSON.stringify(calls.slice(-6))); process.exit(1); });
