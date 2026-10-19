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
