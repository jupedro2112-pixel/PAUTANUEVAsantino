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

