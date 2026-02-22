/**
 * Configuración centralizada de la aplicación.
 * Origen de datos: Google Sheet vía Apps Script (APP_SCRIPT_URL).
 * El documento y las hojas están definidos en appscript/Code.gs (SPREADSHEET_ID y TABLAS).
 */
(function (global) {
  'use strict';

  var Config = {
    /**
     * ID del Google Sheet. Debe coincidir con SPREADSHEET_ID en appscript/Code.gs.
     * Se obtiene de la URL de edición del Sheet: .../spreadsheets/d/ESTE_ID/edit
     */
    SPREADSHEET_ID: '1R05n3t2cgmzX-z58b9Sgx4He9k9Y9NAm9myQXbEwv3Q',

    /**
     * URL del Web App de Google Apps Script (despliegue).
     * productoLeer → hoja PRODUCTOS | clienteLeer → hoja CLIENTES | ventaAlta/ventaLeer → ENERO..DICIEMBRE
     */
    APP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwbOd1_5vHZhUVa83aXXPxHA7fcHVpJNXNIdT5WvvWbjDEFY3gekaEo87AY0sWK6GMR/exec',

    /** Nombres de las hojas del Sheet (deben coincidir con Code.gs y tables.js). */
    HOJA_PRODUCTOS: 'PRODUCTOS',
    HOJA_CLIENTES: 'CLIENTES',

    /**
     * Categorías para el filtro de productos en Nueva venta.
     * Deben coincidir con los valores de la columna CATEGORIA en la hoja PRODUCTOS.
     * El orden aquí define el orden en el combo. Editar para agregar, quitar o reordenar.
     */
    CATEGORIAS: [
      'ALFAJOR',
      'BUDINES',
      'HOJALDRE',
      'PANADERIA',
      'ROSCAS',
      'VARIOS'
    ],

    /** URL pública CSV del Sheet (Compartir > Publicar en la web). */
    SHEET_WEB_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT28rd4v_LKDBh45YSVSCW3qhW2_HFkMR6ktjKaFGYFtM5D7iTtd4XYgSMoI15uRd0fH5c4Ir8jAFzg/pub?output=csv',

    /**
     * Proxy CORS. Dejar vacío '' para enviar directo al Apps Script.
     */
    CORS_PROXY: ''
  };

  global.APP_CONFIG = Config;
})(typeof window !== 'undefined' ? window : this);
