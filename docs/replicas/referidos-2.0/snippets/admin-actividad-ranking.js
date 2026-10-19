
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
