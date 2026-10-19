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
