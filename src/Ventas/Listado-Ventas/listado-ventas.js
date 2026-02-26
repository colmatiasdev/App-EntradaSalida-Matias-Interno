(function () {
  'use strict';

  var APP_CONFIG = window.APP_CONFIG;
  var APP_TABLES = window.APP_TABLES;
  var APP_SCRIPT_URL = APP_CONFIG && APP_CONFIG.APP_SCRIPT_URL;
  var CORS_PROXY = APP_CONFIG && APP_CONFIG.CORS_PROXY;
  var NOMBRES_MESES = (APP_TABLES && APP_TABLES.NOMBRES_HOJAS_MES) || [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  var COLUMNAS_VENTAS_MARKET = (APP_TABLES && APP_TABLES.VENTAS_MARKET && APP_TABLES.VENTAS_MARKET.columns)
    ? APP_TABLES.VENTAS_MARKET.columns
    : ['ID-VENTA', 'AÑO', 'FECHA_OPERATIVA', 'HORA', 'NOMBRE-APELLIDO', 'TIPO-LISTA-PRECIO', 'ID-PRODUCTO', 'CATEGORIA', 'PRODUCTO', 'CANTIDAD', 'PRESENTACION-UNIDAD-MEDIDA', 'PRECIO', 'MONTO', 'USUARIO'];

  var columnasOcultas = ['AÑO', 'ID-VENTA', 'ID-PRODUCTO', 'FECHA_OPERATIVA', 'TIPO-LISTA-PRECIO', 'NOMBRE-APELLIDO'];

  var allData = [];
  var filteredData = [];
  var currentColumnas = [];
  var currentMesLabel = '';
  var currentPage = 1;
  var pageSize = 25;

  function normalizarFilaVenta(fila, columnasEsperadas) {
    var cols = columnasEsperadas || COLUMNAS_VENTAS_MARKET;
    var out = {};
    var keys = Object.keys(fila || {});
    cols.forEach(function (col) {
      var val = fila[col];
      if (val === undefined) {
        var colLower = col.toLowerCase();
        for (var k = 0; k < keys.length; k++) {
          if (keys[k].toLowerCase() === colLower) { val = fila[keys[k]]; break; }
        }
      }
      out[col] = val !== undefined && val !== null ? val : '';
    });
    return out;
  }

  function fmtMoney(n) {
    return '$\u00a0' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  /** Convierte hex (#RRGGBB o RRGGBB) a rgba(r,g,b,a). */
  function hexToRgba(hex, alpha) {
    if (!hex) return 'transparent';
    hex = String(hex).replace(/^#/, '');
    if (hex.length !== 6) return 'transparent';
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha != null ? alpha : 1) + ')';
  }

  function fmtFecha(val) {
    if (val === undefined || val === null || val === '') return '';
    var s = String(val).trim();
    if (!s) return '';
    if (s.indexOf('T') !== -1) s = s.substring(0, s.indexOf('T'));
    var parts = s.split(/[-/]/);
    if (parts.length === 3 && parts[0].length === 4 && parts[1].length <= 2 && parts[2].length <= 2) {
      var dd = ('0' + parts[2]).slice(-2);
      var mm = ('0' + parts[1]).slice(-2);
      var yyyy = parts[0];
      return dd + '-' + mm + '-' + yyyy;
    }
    var d = new Date(val);
    if (isNaN(d.getTime())) return s;
    var dd = ('0' + d.getDate()).slice(-2);
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var yyyy = d.getFullYear();
    return dd + '-' + mm + '-' + yyyy;
  }

  /** Devuelve el número de mes (1-12) a partir de FECHA_OPERATIVA. */
  function getMesNumero(fechaOp) {
    if (fechaOp === undefined || fechaOp === null || fechaOp === '') return null;
    var d = new Date(fechaOp);
    if (isNaN(d.getTime())) return null;
    return d.getMonth() + 1;
  }

  function fmtHora(val) {
    if (val === undefined || val === null || val === '') return '';
    var s = String(val).trim();
    if (!s) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return s;
    var h = d.getHours();
    var m = d.getMinutes();
    return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
  }

  function getMesActual() {
    if (!NOMBRES_MESES || !NOMBRES_MESES.length) return '';
    var idx = new Date().getMonth();
    return NOMBRES_MESES[idx] || NOMBRES_MESES[0];
  }

  function getAnioActual() {
    return new Date().getFullYear();
  }

  function getAniosDisponibles() {
    var actual = getAnioActual();
    var lista = [];
    for (var a = actual; a >= actual - 4; a--) lista.push(a);
    return lista;
  }

  /** Carga usuarios desde la hoja USUARIOS y rellena APP_CONFIG.USUARIO_ETIQUETAS (etiqueta, color, perfil). */
  function cargarUsuarioEtiquetas() {
    if (!APP_SCRIPT_URL || !window.APP_CONFIG) return;
    var url = (CORS_PROXY && CORS_PROXY.length > 0) ? CORS_PROXY + encodeURIComponent(APP_SCRIPT_URL) : APP_SCRIPT_URL;
    var body = 'data=' + encodeURIComponent(JSON.stringify({ accion: 'usuarioLeer' }));
    fetch(url, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (res) { return res.ok ? res.json() : { ok: false }; })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.datos)) return;
        var map = {};
        data.datos.forEach(function (r) {
          var codigo = (r.USUARIO != null ? String(r.USUARIO) : '').trim();
          if (!codigo) return;
          map[codigo] = {
            etiqueta: (r['USUARIO-ETIQUETA'] != null ? String(r['USUARIO-ETIQUETA']) : '').trim() || codigo,
            color: (r.COLOR != null ? String(r.COLOR).trim() : '') || '#42a5f5',
            perfil: (r.PERFIL != null ? String(r.PERFIL) : '').trim().toUpperCase()
          };
        });
        window.APP_CONFIG.USUARIO_ETIQUETAS = map;
        var codigo = (APP_CONFIG.USUARIO || '').trim();
        if (codigo && map[codigo] && map[codigo].perfil !== undefined) {
          try {
            localStorage.setItem('APP_USUARIO_PERFIL', map[codigo].perfil || '');
            window.APP_CONFIG.USUARIO_PERFIL = (map[codigo].perfil || '').trim();
          } catch (e) {}
        }
      })
      .catch(function () {});
  }

  /** true si el usuario logueado tiene PERFIL ADMIN o GERENTE (muestra columna USUARIO). */
  function esAdminOGerente() {
    var config = APP_CONFIG || {};
    var perfil = (config.USUARIO_PERFIL || '').trim().toUpperCase();
    if (perfil) return perfil === 'ADMIN' || perfil === 'GERENTE';
    var codigo = (config.USUARIO || '').trim();
    if (!codigo) return false;
    var info = config.USUARIO_ETIQUETAS && config.USUARIO_ETIQUETAS[codigo];
    perfil = (info && info.perfil) ? String(info.perfil).toUpperCase() : '';
    return perfil === 'ADMIN' || perfil === 'GERENTE';
  }

  function init() {
    cargarUsuarioEtiquetas();
    var selectAnio = document.getElementById('listado-ventas-anio');
    var selectMes = document.getElementById('listado-ventas-mes');
    var btnCargar = document.getElementById('listado-ventas-btn-cargar');
    if (!selectMes || !btnCargar) return;

    if (selectAnio) {
      getAniosDisponibles().forEach(function (anio) {
        var opt = document.createElement('option');
        opt.value = anio;
        opt.textContent = anio;
        selectAnio.appendChild(opt);
      });
      selectAnio.value = getAnioActual();
    }

    if (NOMBRES_MESES && NOMBRES_MESES.length) {
      NOMBRES_MESES.forEach(function (nombre) {
        var opt = document.createElement('option');
        opt.value = nombre;
        opt.textContent = nombre;
        selectMes.appendChild(opt);
      });
      selectMes.value = getMesActual();
      cargarVentasMarket();
    }

    btnCargar.addEventListener('click', cargarVentasMarket);

    var tableSearch = document.getElementById('table-search');
    if (tableSearch) {
      tableSearch.addEventListener('input', function () {
        currentPage = 1;
        renderTable(this.value);
      });
    }

    var pageSizeSelect = document.getElementById('table-page-size');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', function () {
        pageSize = parseInt(this.value, 10) || 25;
        currentPage = 1;
        renderTable(document.getElementById('table-search').value);
      });
    }
  }

  function mostrarMensaje(texto, esError) {
    var msg = document.getElementById('listado-ventas-mensaje');
    if (!msg) return;
    msg.textContent = texto;
    msg.className = 'listado-ventas__mensaje' + (esError ? ' listado-ventas__mensaje--error' : '');
  }

  function cargarVentasMarket() {
    var selectAnio = document.getElementById('listado-ventas-anio');
    var selectMes = document.getElementById('listado-ventas-mes');
    var mesNombre = selectMes ? selectMes.value : '';
    var anio = selectAnio ? parseInt(selectAnio.value, 10) : getAnioActual();
    var mesIndex = NOMBRES_MESES.indexOf(mesNombre);
    var mesNum = mesIndex >= 0 ? mesIndex + 1 : null;

    if (!mesNombre) {
      mostrarMensaje('Seleccioná un mes.', true);
      return;
    }
    if (!APP_SCRIPT_URL) {
      mostrarMensaje('No está configurada la URL del Apps Script (APP_SCRIPT_URL).', true);
      return;
    }

    mostrarMensaje('Cargando ventas Market…');
    var payload = { accion: 'ventaLeer', hoja: 'VENTAS_MARKET' };
    var body = 'data=' + encodeURIComponent(JSON.stringify(payload));
    var url = (CORS_PROXY && CORS_PROXY.length > 0)
      ? CORS_PROXY + encodeURIComponent(APP_SCRIPT_URL)
      : APP_SCRIPT_URL;

    fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var ct = (res.headers.get('Content-Type') || '').toLowerCase();
        if (ct.indexOf('json') !== -1) return res.json();
        return res.text().then(function (t) {
          try { return JSON.parse(t); } catch (e) { return { ok: false, error: t }; }
        });
      })
      .then(function (data) {
        if (data && data.ok && Array.isArray(data.datos)) {
          var datos = data.datos
            .map(function (r) { return normalizarFilaVenta(r, COLUMNAS_VENTAS_MARKET); })
            .filter(function (r) {
              var rowAnio = r.AÑO !== undefined && r.AÑO !== null && r.AÑO !== '' ? parseInt(String(r.AÑO), 10) : null;
              if (rowAnio !== null && rowAnio !== anio) return false;
              if (mesNum !== null) {
                var rowMes = getMesNumero(r.FECHA_OPERATIVA);
                if (rowMes !== null && rowMes !== mesNum) return false;
              }
              return true;
            });
          pintarTabla(mesNombre, anio, datos);
          mostrarMensaje('Se cargaron ' + datos.length + ' registro(s) de Ventas Market — ' + mesNombre + ' ' + anio + '.');
        } else {
          mostrarMensaje(data && (data.error || data.mensaje) || 'No se recibieron datos.', true);
          ocultarTabla();
        }
      })
      .catch(function (err) {
        var txt = err && err.message ? err.message : String(err);
        if (/failed to fetch|cors|blocked|access-control/i.test(txt)) {
          mostrarMensaje('No se pudo conectar con el servidor (CORS). Comprobá APP_SCRIPT_URL y despliegue.', true);
        } else {
          mostrarMensaje('Error: ' + txt, true);
        }
        ocultarTabla();
      });
  }

  function pintarTabla(nombreMes, anio, datos) {
    var wrapper = document.getElementById('listado-ventas-tabla-wrapper');
    var subtitulo = document.getElementById('listado-ventas-subtitulo');
    var thead = document.getElementById('listado-ventas-thead');
    var tbody = document.getElementById('listado-ventas-tbody');
    if (!wrapper || !thead || !tbody) return;

    allData = datos;
    currentMesLabel = nombreMes + ' ' + anio;
    subtitulo.textContent = 'Ventas Market — ' + nombreMes + ' ' + anio;
    var tableSearch = document.getElementById('table-search');
    if (tableSearch) tableSearch.value = '';

    var columnas = COLUMNAS_VENTAS_MARKET.filter(function (c) {
      if (columnasOcultas.indexOf(c) !== -1) return false;
      if (c === 'USUARIO' && !esAdminOGerente()) return false;
      return true;
    });
    currentColumnas = columnas;

    thead.innerHTML = '';
    var trHead = document.createElement('tr');
    columnas.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = col === 'FECHA_OPERATIVA' ? 'FECHA' : (col === 'PRESENTACION-UNIDAD-MEDIDA' ? 'U.M.' : col);
      if (['CANTIDAD', 'PRECIO', 'MONTO'].indexOf(col) !== -1) th.className = 'th-num';
      if (col === 'USUARIO') th.className = (th.className ? th.className + ' ' : '') + 'listado-ventas__th-usuario';
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    currentPage = 1;
    var pageSizeEl = document.getElementById('table-page-size');
    if (pageSizeEl) pageSize = parseInt(pageSizeEl.value, 10) || 25;
    renderTable('', currentMesLabel, currentColumnas);
    wrapper.hidden = false;
  }

  function agruparPorFechaYCliente(datos) {
    var claveFecha = function (r) {
      var f = r.FECHA_OPERATIVA;
      if (f === undefined || f === null) return '';
      var s = String(f).trim();
      if (s.indexOf('T') !== -1) s = s.substring(0, s.indexOf('T'));
      return s;
    };
    var claveHora = function (r) {
      var h = r.HORA;
      if (h === undefined || h === null) return '';
      var s = String(h).trim();
      if (s.indexOf('T') !== -1) {
        var d = new Date(h);
        return isNaN(d.getTime()) ? s : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      }
      return s;
    };
    var ordenarFila = function (a, b) {
      var fa = claveFecha(a), fb = claveFecha(b);
      if (fa !== fb) return fa > fb ? -1 : 1;
      var ha = claveHora(a), hb = claveHora(b);
      if (ha !== hb) return ha < hb ? -1 : (ha > hb ? 1 : 0);
      var na = (a['NOMBRE-APELLIDO'] || '').trim(), nb = (b['NOMBRE-APELLIDO'] || '').trim();
      if (na !== nb) return na < nb ? -1 : 1;
      var ta = (a['TIPO-LISTA-PRECIO'] || '').trim(), tb = (b['TIPO-LISTA-PRECIO'] || '').trim();
      return ta < tb ? -1 : (ta > tb ? 1 : 0);
    };
    var ordenado = datos.slice().sort(ordenarFila);
    var grupos = [];
    var i = 0;
    while (i < ordenado.length) {
      var fechaKey = claveFecha(ordenado[i]);
      var filasFecha = [];
      while (i < ordenado.length && claveFecha(ordenado[i]) === fechaKey) {
        filasFecha.push(ordenado[i]);
        i++;
      }
      grupos.push({ fechaKey: fechaKey, filas: filasFecha });
    }
    return grupos;
  }

  function renderTable(searchTerm, mesLabel, columnas) {
    var tbody = document.getElementById('listado-ventas-tbody');
    var footer = document.getElementById('table-footer');
    var pagination = document.getElementById('table-pagination');
    var paginationInfo = document.getElementById('table-pagination-info');
    var paginationPages = document.getElementById('table-pagination-pages');
    if (!tbody || !footer) return;

    var s = (searchTerm || '').toLowerCase().trim();
    filteredData = s
      ? allData.filter(function (r) {
          return Object.values(r).some(function (v) {
            return String(v).toLowerCase().indexOf(s) !== -1;
          });
        })
      : allData;

    if (!columnas) {
      columnas = currentColumnas.length ? currentColumnas : COLUMNAS_VENTAS_MARKET.filter(function (c) {
        if (columnasOcultas.indexOf(c) !== -1) return false;
        if (c === 'USUARIO' && !esAdminOGerente()) return false;
        return true;
      });
    }
    if (!mesLabel) mesLabel = currentMesLabel;

    var totalFilt = filteredData.reduce(function (sum, r) {
      return sum + (parseFloat(r.MONTO) || 0);
    }, 0);

    var grupos = agruparPorFechaYCliente(filteredData);
    var pageSizeEl = document.getElementById('table-page-size');
    var gruposPerPage = Math.max(1, parseInt(pageSizeEl && pageSizeEl.value, 10) || 10);
    var totalPages = Math.max(1, Math.ceil(grupos.length / gruposPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    var startGroup = (currentPage - 1) * gruposPerPage;
    var endGroup = Math.min(startGroup + gruposPerPage, grupos.length);
    var pageGrupos = grupos.slice(startGroup, endGroup);

    tbody.innerHTML = '';
    pageGrupos.forEach(function (grupo) {
      var subtotalFecha = grupo.filas.reduce(function (sum, r) { return sum + (parseFloat(r.MONTO) || 0); }, 0);
      var subtotalCant = grupo.filas.reduce(function (sum, r) { return sum + (parseFloat(r.CANTIDAD) || 0); }, 0);

      var trFecha = document.createElement('tr');
      trFecha.className = 'listado-ventas__fila-fecha';
      var tdFecha = document.createElement('td');
      tdFecha.colSpan = columnas.length;
      tdFecha.textContent = 'FECHA: ' + fmtFecha(grupo.fechaKey);
      tdFecha.className = 'listado-ventas__celda-fecha';
      trFecha.appendChild(tdFecha);
      tbody.appendChild(trFecha);

      grupo.filas.forEach(function (fila) {
        var tr = document.createElement('tr');
        columnas.forEach(function (col) {
          var td = document.createElement('td');
          var val = fila[col];
          if (val === undefined || val === null) val = '';
          if (col === 'FECHA_OPERATIVA') val = fmtFecha(val);
          if (col === 'HORA') val = fmtHora(val);
          if (col === 'USUARIO') {
            var usuarioKey = String(val).trim();
            var etiquetas = APP_CONFIG && APP_CONFIG.USUARIO_ETIQUETAS;
            var info = etiquetas && etiquetas[usuarioKey];
            if (info && info.etiqueta) {
              var span = document.createElement('span');
              span.className = 'listado-ventas__usuario-badge';
              span.textContent = info.etiqueta;
              span.title = usuarioKey;
              if (info.color) {
                span.style.borderLeftColor = info.color;
                span.style.backgroundColor = hexToRgba(info.color, 0.1);
              }
              td.appendChild(span);
            } else {
              td.textContent = val;
            }
          } else if (col === 'CATEGORIA') {
            var cat = String(val).toLowerCase();
            var badgeClass = 'badge-cat';
            if (cat.indexOf('promo') !== -1) badgeClass += ' badge-cat--promos';
            else if (cat.indexOf('bebida') !== -1) badgeClass += ' badge-cat--bebida';
            else if (cat.indexOf('empanada') !== -1) badgeClass += ' badge-cat--empanada';
            else if (cat.indexOf('postre') !== -1) badgeClass += ' badge-cat--postre';
            td.innerHTML = '<span class="' + badgeClass + '">' + (val || '') + '</span>';
          } else if (col === 'MONTO' && (typeof val === 'number' || !isNaN(parseFloat(val)))) {
            td.className = 'td-num td-monto';
            td.textContent = fmtMoney(parseFloat(val));
          } else if (['CANTIDAD', 'PRECIO'].indexOf(col) !== -1) {
            var num = typeof val === 'number' ? val : parseFloat(val);
            td.className = 'td-num';
            td.textContent = !isNaN(num) ? Number(num).toLocaleString('es-AR') : val;
          } else {
            td.textContent = val;
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      var trSub = document.createElement('tr');
      trSub.className = 'listado-ventas__fila-subtotal';
      var idxCant = columnas.indexOf('CANTIDAD');
      var idxMonto = columnas.indexOf('MONTO');
      var colspanLabel = idxCant >= 0 ? idxCant : columnas.length - 2;
      if (colspanLabel < 1) colspanLabel = 1;

      var tdLabel = document.createElement('td');
      tdLabel.className = 'listado-ventas__subtotal-label';
      tdLabel.colSpan = colspanLabel;
      tdLabel.textContent = 'Total del día';
      trSub.appendChild(tdLabel);

      for (var i = colspanLabel; i < columnas.length; i++) {
        var col = columnas[i];
        var td = document.createElement('td');
        td.className = col === 'MONTO' || col === 'CANTIDAD' ? 'td-num' : '';
        if (col === 'MONTO') {
          td.textContent = fmtMoney(subtotalFecha);
          td.classList.add('td-monto');
        } else if (col === 'CANTIDAD') {
          td.textContent = ''; // cantidad total oculta
        } else {
          td.textContent = '';
        }
        trSub.appendChild(td);
      }
      tbody.appendChild(trSub);
    });

    var totalRegistros = filteredData.length;
    footer.innerHTML =
      '<span>Mostrando <strong>' + (grupos.length ? startGroup + 1 + '-' + endGroup + ' (fechas)' : '0') + '</strong> · ' + totalRegistros + ' registro(s)' +
      (allData.length !== filteredData.length ? ' (filtrado de ' + allData.length + ')' : '') + '</span>' +
      '<span>Total: <strong>' + fmtMoney(totalFilt) + '</strong></span>';

    if (pagination && paginationInfo && paginationPages) {
      var firstBtn = document.getElementById('table-pagination-first');
      var prevBtn = document.getElementById('table-pagination-prev');
      var nextBtn = document.getElementById('table-pagination-next');
      var lastBtn = document.getElementById('table-pagination-last');

      paginationInfo.textContent = 'Página ' + currentPage + ' de ' + totalPages + ' (por fecha)';
      paginationPages.textContent = currentPage + ' / ' + totalPages;

      if (firstBtn) {
        firstBtn.disabled = currentPage <= 1;
        firstBtn.onclick = function () { currentPage = 1; renderTable(document.getElementById('table-search').value); };
      }
      if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = function () { currentPage = currentPage - 1; renderTable(document.getElementById('table-search').value); };
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = function () { currentPage = currentPage + 1; renderTable(document.getElementById('table-search').value); };
      }
      if (lastBtn) {
        lastBtn.disabled = currentPage >= totalPages;
        lastBtn.onclick = function () { currentPage = totalPages; renderTable(document.getElementById('table-search').value); };
      }
    }
  }

  function ocultarTabla() {
    var wrapper = document.getElementById('listado-ventas-tabla-wrapper');
    if (wrapper) wrapper.hidden = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
