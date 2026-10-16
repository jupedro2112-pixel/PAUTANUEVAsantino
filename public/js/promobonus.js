// =====================================================================
// REGALOS DE FICHAS PARA RECLAMAR (#330, réplica del #177/#191 de CARGASGIROX)
// Un lote de notificación "fichas por tiempo" NO acredita nada al enviarse:
// cada cliente ve una card dorada "Tenés $X en fichas de regalo — RECLAMAR"
// (home, hub 🎁 PREMIOS y modal "Reclamar Bono con Código") y las fichas se
// acreditan al instante cuando toca el botón (GET /api/gift/pending +
// POST /api/gift/claim). Sin polling periódico (ver WORKLOG #235): se
// refresca al entrar, al volver a la app, al llegar un mensaje del sistema y
// al abrir PREMIOS / el modal.
// =====================================================================
(function () {
    'use strict';
    window.VIP = window.VIP || {};

    let _gifts = [];
    let _claiming = false;
    let _loading = false;

    function _money(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-AR'); }
    function _esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function _hasta(d) {
        try { return new Date(d).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; }
    }

    async function loadGifts() {
        if (_loading || !VIP.state || !VIP.state.currentToken) return;
        _loading = true;
        try {
            const r = await fetch(VIP.config.API_URL + '/api/gift/pending', {
                headers: { 'Authorization': 'Bearer ' + VIP.state.currentToken }
            });
            if (r.ok) {
                const d = await r.json();
                _gifts = (d && Array.isArray(d.gifts)) ? d.gifts : [];
                _renderAll();
            }
        } catch (e) { /* best-effort */ }
        _loading = false;
    }
    function load() { return loadGifts(); }

    function _giftHtml(g, compact) {
        const roll = Number(g.rolloverX) > 0 ? ' Entra como bono con rollover x' + Number(g.rolloverX) + '.' : '';
        return '<div data-gift="' + _esc(g.batchId) + '" style="' + (compact ? 'margin:0 0 10px;' : 'margin:0;') + 'background:linear-gradient(135deg,#3b2300,#7a4a00);border:2px solid #ffd700;border-radius:12px;padding:12px 14px;box-shadow:0 0 18px rgba(255,215,0,0.4);">'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<span style="font-size:30px;">🎁</span>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="color:#ffd700;font-weight:900;font-size:15px;">¡Tenés ' + _money(g.amount) + ' en fichas de regalo!</div>'
            + '<div style="color:#fff;font-size:11.5px;margin-top:2px;">Tocá RECLAMAR y se acreditan al instante en tu cuenta.' + roll + ' Vence ' + _hasta(g.expiresAt) + '.</div>'
            + '</div>'
            + '<button type="button" onclick="VIP.promoBonus.claim(\'' + _esc(g.batchId) + '\', this)" style="background:linear-gradient(135deg,#ffd700,#f0a500);color:#1a0b2e;border:none;border-radius:10px;padding:10px 14px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);">RECLAMAR</button>'
            + '</div>'
            + '<div class="gift-claim-msg" style="display:none;margin-top:8px;font-size:12.5px;font-weight:900;"></div>'
            + '</div>';
    }

    // Card de la home (debajo del banner del bono por instalar la app).
    function _renderHome() {
        const card = document.getElementById('giftClaimCard');
        if (!card) return;
        if (!_gifts.length) { card.style.display = 'none'; card.innerHTML = ''; return; }
        card.innerHTML = _gifts.map(function (g) { return _giftHtml(g, false); }).join('<div style="height:8px;"></div>');
        card.style.display = '';
    }
    // Lista dentro de cualquier contenedor por id (hub PREMIOS, modal de código).
    function renderPending(containerId) {
        const box = document.getElementById(containerId);
        if (!box) return;
        if (!_gifts.length) { box.innerHTML = ''; return; }
        box.innerHTML = '<div style="color:#ffd700;font-weight:900;font-size:13px;margin:0 0 8px;">🎁 Regalos para reclamar</div>'
            + _gifts.map(function (g) { return _giftHtml(g, true); }).join('');
    }
    function _renderAll() { _renderHome(); renderPending('giftPendingBox'); renderPending('rwGiftsBox'); }

    async function claim(batchId, btn) {
        if (_claiming || !VIP.state || !VIP.state.currentToken) return;
        _claiming = true;
        const cards = document.querySelectorAll('[data-gift="' + batchId + '"]');
        cards.forEach(function (c) { const b = c.querySelector('button'); if (b) { b.disabled = true; b.textContent = '...'; } });
        const say = function (txt, color) {
            cards.forEach(function (c) { const m = c.querySelector('.gift-claim-msg'); if (m) { m.style.display = ''; m.style.color = color; m.textContent = txt; } });
        };
        try {
            const r = await fetch(VIP.config.API_URL + '/api/gift/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + VIP.state.currentToken },
                body: JSON.stringify({ batchId: batchId })
            });
            const d = await r.json().catch(function () { return {}; });
            if (r.ok && d && d.success) {
                say('✅ ' + (d.message || '¡Acreditado!'), '#8dffb0');
                try { if (VIP.ui && VIP.ui.syncBalance) VIP.ui.syncBalance(); } catch (_) {}
                try { if (VIP.ui && VIP.ui.showToast) VIP.ui.showToast(d.message || '¡Fichas acreditadas!', 'success'); } catch (_) {}
                try { if (VIP.chat && VIP.chat.loadMessages) VIP.chat.loadMessages(); } catch (_) {}
                setTimeout(function () { _gifts = _gifts.filter(function (g) { return g.batchId !== batchId; }); _renderAll(); }, 2500);
            } else {
                say('❌ ' + ((d && d.error) || 'No se pudo reclamar. Probá de nuevo.'), '#ffb3b3');
                cards.forEach(function (c) { const b = c.querySelector('button'); if (b) { b.disabled = false; b.textContent = 'RECLAMAR'; } });
                if (r.status === 400 || r.status === 404) setTimeout(loadGifts, 2500); // venció / ya reclamado → lista real
            }
        } catch (e) {
            say('❌ Sin conexión. Probá de nuevo.', '#ffb3b3');
            cards.forEach(function (c) { const b = c.querySelector('button'); if (b) { b.disabled = false; b.textContent = 'RECLAMAR'; } });
        }
        _claiming = false;
    }

    VIP.promoBonus = { load: load, loadGifts: loadGifts, renderPending: renderPending, claim: claim };

    document.addEventListener('DOMContentLoaded', function () {
        let tries = 0;
        const tick = function () {
            if (VIP.state && VIP.state.currentToken) load();
            else if (tries++ < 20) setTimeout(tick, 1500);
        };
        setTimeout(tick, 1000);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') load();
    });
})();
