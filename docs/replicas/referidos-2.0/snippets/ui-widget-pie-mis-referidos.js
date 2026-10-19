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
