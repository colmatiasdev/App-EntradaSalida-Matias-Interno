/**
 * Común a todas las cabeceras de módulos: actualiza fecha (live-date) y usuario (header-user).
 * Incluir después de config.js. Requiere elementos con id: live-date, header-user-name, header-user-dot.
 */
(function () {
  'use strict';

  var config = window.APP_CONFIG || {};
  var dateEl = document.getElementById('live-date');
  var nameEl = document.getElementById('header-user-name');
  var dotEl = document.getElementById('header-user-dot');

  if (dateEl) {
    var now = new Date();
    dateEl.textContent = now.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  var codigo = (config.USUARIO || '').trim();
  function pintarUsuario(etiqueta, color) {
    if (nameEl) nameEl.textContent = etiqueta || 'Sin usuario';
    if (dotEl) dotEl.style.background = color || '#29b6f6';
  }

  if (!codigo) {
    pintarUsuario('Sin usuario', 'rgba(255,255,255,0.4)');
    return;
  }

  pintarUsuario(codigo.replace(/^USR-/, ''), '#29b6f6');

  var appScriptUrl = config.APP_SCRIPT_URL || '';
  var corsProxy = config.CORS_PROXY || '';
  if (!appScriptUrl) return;

  var body = 'data=' + encodeURIComponent(JSON.stringify({ accion: 'usuarioLeer' }));
  var url = (corsProxy && corsProxy.length) ? corsProxy + encodeURIComponent(appScriptUrl) : appScriptUrl;
  fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  })
    .then(function (res) { return res.ok ? res.json() : { ok: false }; })
    .then(function (data) {
      if (!data || !data.ok || !Array.isArray(data.datos)) return;
      var row = data.datos.filter(function (r) {
        return String(r.USUARIO || '').trim() === codigo;
      })[0];
      if (row) {
        var etiqueta = (row['USUARIO-ETIQUETA'] != null ? String(row['USUARIO-ETIQUETA']) : '').trim() || codigo.replace(/^USR-/, '');
        var color = (row.COLOR != null ? String(row.COLOR).trim() : '') || '#29b6f6';
        pintarUsuario(etiqueta, color);
        var perfil = (row.PERFIL != null ? String(row.PERFIL) : '').trim();
        try {
          localStorage.setItem('APP_USUARIO_PERFIL', perfil);
          if (window.APP_CONFIG) window.APP_CONFIG.USUARIO_PERFIL = perfil;
        } catch (e) {}
      }
    })
    .catch(function () {});
})();
