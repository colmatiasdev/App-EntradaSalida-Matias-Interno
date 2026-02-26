/**
 * Configuración centralizada de la aplicación.
 *
 * ÚNICO ORIGEN DE DATOS: APP_SCRIPT_URL (Web App de Google Apps Script).
 * - Productos → productoLeer → hoja PRODUCTOS
 * - Clientes  → clienteLeer  → hoja CLIENTES
 * - Ventas   → ventaLeer / guardarVenta → hojas ENERO..DICIEMBRE
 * El Sheet usado está definido en appscript/Code.gs (SPREADSHEET_ID). Debe coincidir con SPREADSHEET_ID de abajo.
 */
(function (global) {
  'use strict';

  var Config = {
    /**
     * ID del Google Sheet. DEBE SER EL MISMO que en appscript/Code.gs (variable SPREADSHEET_ID).
     * Se obtiene de la URL de edición: .../spreadsheets/d/ESTE_ID/edit
     */
    SPREADSHEET_ID: '1FOjy3jePjs0u76-tVf7QdRiufVWGbdHZVtHJH9beePU',

    /**
     * URL del Web App de Google Apps Script (despliegue). ÚNICA fuente de datos de la app.
     * Copiar aquí la URL que da "Implementar" > "Aplicación web" en el proyecto Apps Script vinculado al Sheet anterior.
     */
    APP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxJEkLvFbzA-Ixj8o3xj6VPoxbyMf9IqsDkF5XljtRjNvzJbxPzvWmMts8ifyZGTdSM/exec',

    /** Nombres de las hojas (igual que en Code.gs y tables.js). */
    HOJA_PRODUCTOS: 'PRODUCTOS',
    HOJA_CLIENTES: 'CLIENTES',

    /**
     * Usuario logueado (columna USUARIO al guardar ventas/compras).
     * Se establece en el módulo "Cambiar usuario" y se guarda en localStorage (APP_USUARIO).
     * Etiqueta y color se obtienen de la hoja USUARIOS (USUARIO-ETIQUETA, COLOR) vía usuarioLeer.
     */
    USUARIO: '',

    /**
     * PERFIL del usuario logueado (columna PERFIL de la hoja USUARIOS).
     * Se guarda en localStorage (APP_USUARIO_PERFIL) al cambiar de usuario o al cargar usuarioLeer.
     * Solo perfiles ADMIN y GERENTE: ven la columna USUARIO en listados y los montos/cantidades
     * de "Total del día" y "Total del Mes" (Listado Compras) o "Total" (Listado Ventas).
     */
    USUARIO_PERFIL: '',

    /**
     * Map de usuario → { etiqueta, color }. Se llena desde la hoja USUARIOS (usuarioLeer):
     * etiqueta = columna USUARIO-ETIQUETA, color = columna COLOR.
     * Los listados y el panel lo rellenan al cargar usuarioLeer.
     */
    USUARIO_ETIQUETAS: {},

    /**
     * Unidades de medida (PRESENTACION-UNIDAD-MEDIDA) que usan cantidad decimal en el resumen de venta.
     * Para estos valores la cantidad es un campo numérico libre con 2 decimales (ej. GRAMOS, KG).
     * Cualquier otra unidad usa cantidad entera con botones +/-.
     */
    UNIDADES_CANTIDAD_DECIMAL: ['GRAMOS', 'KG'],

    /**
     * Cálculo de la columna "Precio Unitario" en el resumen de venta (Nueva Venta Market).
     * Precio Unitario = columnaCosto / columnaCantidad (2 decimales).
     */
    PRECIO_UNITARIO_CALCULO: {
      columnaCosto: 'COSTO',
      columnaCantidad: 'PRESENTACION-CANTIDAD-UNIDAD-MEDIDA'
    },

    /**
     * Categorías para el filtro en Nueva venta. Mismo orden que en la hoja PRODUCTOS (columna CATEGORIA).
     */
    CATEGORIAS: [
      'ALFAJOR',
      'BUDINES',
      'ROSCAS',
      'HOJALDRE',
      'GALLETAS',
      'PANADERIA',
      'ESPECIALIDADES',
      'VARIOS'
    ],

    /** Proxy CORS. Dejar '' para usar directo APP_SCRIPT_URL. */
    CORS_PROXY: ''
  };

  // Usuario logueado: el elegido en "Cambiar usuario" (localStorage APP_USUARIO y APP_USUARIO_PERFIL)
  if (global.localStorage) {
    if (global.localStorage.getItem('APP_USUARIO')) {
      Config.USUARIO = global.localStorage.getItem('APP_USUARIO');
    }
    if (global.localStorage.getItem('APP_USUARIO_PERFIL') !== null) {
      Config.USUARIO_PERFIL = (global.localStorage.getItem('APP_USUARIO_PERFIL') || '').trim();
    }
  }

  global.APP_CONFIG = Config;
})(typeof window !== 'undefined' ? window : this);
