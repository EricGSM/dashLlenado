// Configuración de la API
const API_BASE_URL = "http://45.224.144.34:5000/Llenado/api";

// Variables globales
let reportesData = [];
let detalleLoteData = null;
let productosData = [];
window.productosModalFiltrados = [];
let lineasData = [];
let empresasData = [
  { id: "agromarnsr", nombre: "Agromar Industrial SA" },
  { id: "aceitesnsr", nombre: "Aceites Esenciales" },
  { id: "agrofrutosnsr", nombre: "Agrofrutos Trading" },
  { id: "citricosnsr", nombre: "Citricos Peruanos" },
];
let filtrosActuales = {
  fechaInicio: "",
  fechaFin: "",
  empresa: "agromarnsr",
  sucursal: "003",
  producto: null,
  controlador: null,
};

// Inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Inicializar el selector de fechas
  initDateRangePicker();

  // Cargar empresas
  cargarEmpresas();

  // Cargar datos iniciales
  cargarDatosIniciales();

  // Cargar líneas productivas
  cargarLineasProductivas();

  // Configurar eventos
  configurarEventos();

  // Inicializar gráficos
  inicializarGraficos();
});

// Inicializar el selector de rango de fechas
function initDateRangePicker() {
  flatpickr("#rangoFechas", {
    mode: "range",
    dateFormat: "Y-m-d",
    locale: "es",
    defaultDate: [new Date().setDate(new Date().getDate() - 7), new Date()],
    onChange: function (selectedDates, dateStr) {
      if (selectedDates.length === 2) {
        filtrosActuales.fechaInicio = formatDate(selectedDates[0]);
        filtrosActuales.fechaFin = formatDate(selectedDates[1]);
      }
    },
  });

  // Establecer fechas por defecto (últimos 7 días)
  const fechaFin = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - 7);

  filtrosActuales.fechaInicio = formatDate(fechaInicio);
  filtrosActuales.fechaFin = formatDate(fechaFin);
}

// Formatear fecha a YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

// Cargar datos iniciales
async function cargarDatosIniciales() {
  try {
    // Mostrar carga
    document.getElementById("tablaLotes").innerHTML = `
      <tr>
        <td colspan="10" class="px-6 py-4 text-center">
          <div class="flex justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p class="mt-2 text-sm text-gray-500">Cargando datos...</p>
        </td>
      </tr>`;

    // Cargar lotes
    await cargarLotes();
  } catch (error) {
    console.error("Error al cargar datos iniciales:", error);
    mostrarError("Error al cargar los datos. Por favor, intente nuevamente.");
  }
}

// Cargar líneas productivas
async function cargarLineasProductivas() {
  try {
    const response = await fetch(`${API_BASE_URL}/controlador-list`);
    if (!response.ok) throw new Error("Error al cargar las líneas productivas");

    const data = await response.json();

    // Verificar si la respuesta tiene la estructura esperada
    if (data.success && Array.isArray(data.data)) {
      // Accedemos correctamente al array dentro de data.data
      lineasData = data.data;
    } else if (Array.isArray(data)) {
      // Si por alguna razón la respuesta es directamente un array
      lineasData = data;
    } else {
      throw new Error("Formato de respuesta inesperado");
    }

    const selectLinea = document.getElementById("filtroLinea");
    if (!selectLinea) {
      console.error("No se encontró el elemento select de líneas");
      return;
    }

    // Limpiar opciones existentes excepto la primera
    while (selectLinea.options.length > 1) {
      selectLinea.remove(1);
    }

    // Agregar opciones de líneas
    lineasData.forEach((linea) => {
      const option = document.createElement("option");
      option.value = linea.id;
      option.textContent = linea.controlador || `Línea ${linea.id}`;
      selectLinea.appendChild(option);
    });

    // Actualizar el filtro actual con el primer valor
    if (lineasData.length > 0) {
      filtrosActuales.controlador = lineasData[0].id;
    }
  } catch (error) {
    console.error("Error al cargar líneas productivas:", error);
    mostrarError("No se pudieron cargar las líneas productivas");
  }
}

// Cargar empresas en el select
function cargarEmpresas() {
  const selectEmpresa = document.getElementById("filtroEmpresa");
  if (!selectEmpresa) return;

  // Limpiar opciones existentes excepto la primera
  selectEmpresa.innerHTML = "";

  // Agregar opciones de empresas
  empresasData.forEach((empresa) => {
    const option = document.createElement("option");
    option.value = empresa.id;
    option.textContent = empresa.nombre;
    selectEmpresa.appendChild(option);
  });
}

// Buscar productos
async function buscarProductos(producto = "") {
  const empresaSelect = document.getElementById("filtroEmpresa");

  // Validar que se haya seleccionado una empresa
  if (!empresaSelect || !empresaSelect.value) {
    mostrarError("Por favor seleccione una empresa antes de buscar productos");
    return [];
  }

  const empresa = empresaSelect.value;

  try {
    const response = await fetch(
      `http://45.224.144.34:5000/paletas/api/buscar_todos_producto`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa: empresa, // Cambiado de 'empresa' a 'idempresa'
          producto: producto,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error buscando productos:", error);
    return [];
  }
}

// Cargar productos para el modal
async function cargarProductosParaModal() {
  try {
    // Mostrar indicador de carga
    const resultadosDiv = document.getElementById("resultadosProductos");
    if (resultadosDiv) {
      resultadosDiv.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500">
            <div class="flex justify-center">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            <p class="mt-2">Cargando productos...</p>
          </td>
        </tr>`;
    }

    // Obtener productos para la empresa seleccionada
    const productos = await buscarProductos();
    productosData = Array.isArray(productos) ? productos : [];
    // Initialize productosModalFiltrados with all products
    window.productosModalFiltrados = [...productosData];
    actualizarResultadosProductos();
  } catch (error) {
    console.error("Error al cargar productos:", error);
    mostrarError("Error al cargar productos: " + error.message);
  }
}

// Actualizar resultados de búsqueda de productos
function actualizarResultadosProductos() {
  const tablaBody = document.getElementById("tablaProductos");
  const sinProductos = document.getElementById("sinProductos");
  const sinResultados = document.getElementById("sinResultados");

  if (!tablaBody) return;

  tablaBody.innerHTML = "";

  // Make sure productosModalFiltrados is defined
  const productos = window.productosModalFiltrados || productosData || [];

  if (productos.length === 0) {
    if (document.getElementById("filtroEmpresa")?.value === "") {
      if (sinProductos) sinProductos.classList.remove("hidden");
      if (sinResultados) sinResultados.classList.add("hidden");
    } else {
      if (sinProductos) sinProductos.classList.add("hidden");
      if (sinResultados) sinResultados.classList.remove("hidden");
    }
    return;
  }

  if (sinProductos) sinProductos.classList.add("hidden");
  if (sinResultados) sinResultados.classList.add("hidden");

  productos.forEach((producto) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50";

    row.innerHTML = `
      <td class="px-4 py-3 text-sm font-medium text-gray-900">${
        producto.idproducto || "N/A"
      }</td>
      <td class="px-4 py-3 text-sm text-gray-900">${
        producto.descripcion || "N/A"
      }</td>
      <td class="px-4 py-3 text-sm">
          <button class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors" 
                  onclick="seleccionarProducto('${
                    producto.idproducto || ""
                  }', '${(producto.descripcion || "").replace(/'/g, "\\'")}')">
              Seleccionar
          </button>
      </td>
    `;

    tablaBody.appendChild(row);
  });
}

// Seleccionar producto
function seleccionarProducto(id, nombre) {
  // Actualizar el input del producto
  const inputProducto = document.getElementById("filtroProducto");
  const productoIdInput = document.getElementById("productoId");

  if (inputProducto && productoIdInput) {
    inputProducto.value = nombre || "";
    productoIdInput.value = id || "";

    // Actualizar filtros actuales
    filtrosActuales.producto = id ? id.toString() : null;

    // Cerrar el modal
    const modal = document.getElementById("modalProductos");
    if (modal) {
      modal.classList.add("hidden");
    }

    // Limpiar la búsqueda
    const buscarInput = document.getElementById("buscarProducto");
    if (buscarInput) {
      buscarInput.value = "";
    }

    // Limpiar resultados
    productosData = [];
    const resultadosDiv = document.getElementById("resultadosProductos");
    if (resultadosDiv) {
      resultadosDiv.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500">
            Ingrese al menos 2 caracteres para buscar
          </td>
        </tr>`;
    }
  }
}

// Limpiar selección de producto
function limpiarProducto() {
  const inputProducto = document.getElementById("filtroProducto");
  const productoIdInput = document.getElementById("productoId");

  if (inputProducto && productoIdInput) {
    inputProducto.value = "";
    productoIdInput.value = "";
    filtrosActuales.producto = null;

    // Limpiar la búsqueda
    const buscarInput = document.getElementById("buscarProducto");
    if (buscarInput) {
      buscarInput.value = "";
    }

    // Limpiar resultados
    productosData = [];
    const resultadosDiv = document.getElementById("resultadosProductos");
    if (resultadosDiv) {
      resultadosDiv.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500">
            Ingrese al menos 2 caracteres para buscar
          </td>
        </tr>`;
    }
  }
}

// Cargar lotes según filtros
async function cargarLotes() {
  try {
    // Mostrar indicador de carga
    const tbody = document.getElementById("tablaLotes");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="px-6 py-4 text-center text-sm text-gray-500">
            <div class="flex justify-center">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            <p class="mt-2 text-sm text-gray-500">Cargando datos...</p>
          </td>
        </tr>`;
    }

    // Crear objeto con los filtros para el cuerpo de la petición
    const filtros = {
      fechaInicio: filtrosActuales.fechaInicio || formatDate(new Date()),
      fechaFin: filtrosActuales.fechaFin || formatDate(new Date()),
      empresa: filtrosActuales.empresa || null,
      sucursal: filtrosActuales.sucursal || null,
      // Si el producto es 'TODOS' o está vacío, enviar null, de lo contrario el valor
      producto:
        !filtrosActuales.producto || filtrosActuales.producto === "TODOS"
          ? null
          : filtrosActuales.producto,
      // Si el controlador es 'TODOS' o está vacío, enviar null, de lo contrario el valor
      controlador:
        !filtrosActuales.controlador || filtrosActuales.controlador === "TODOS"
          ? null
          : filtrosActuales.controlador,
    };

    // Mostrar los filtros que se enviarán en la consola para depuración
    console.log("Enviando filtros:", JSON.stringify(filtros, null, 2));

    // Realizar la petición POST
    const response = await fetch(`${API_BASE_URL}/resumen-lote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filtros),
    });

    // Mostrar la respuesta de la API en la consola para depuración
    const responseData = await response.clone().json();
    console.log("Respuesta de la API:", JSON.stringify(responseData, null, 2));

    // Verificar si la respuesta tiene éxito y contiene datos
    if (!responseData.success) {
      throw new Error("La respuesta de la API no fue exitosa");
    }

    // Actualizar la tabla con los datos
    actualizarTablaLotes(responseData);
  } catch (error) {
    console.error("Error al cargar lotes:", error);
    mostrarError("Error al cargar los lotes. Por favor, intente nuevamente.");
  }
}

// Actualizar tabla de lotes
// Actualizar tabla de lotes
function actualizarTablaLotes(lotes) {
  const tbody = document.getElementById("tablaLotes");
  console.log(lotes);
  if (!lotes || lotes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="px-6 py-4 text-center text-sm text-gray-500">
          No se encontraron lotes con los filtros seleccionados
        </td>
      </tr>`;
    return;
  }

  // Ensure we're working with the data array from the response
  const lotesData = Array.isArray(lotes.data) ? lotes.data : [];
  console.log(lotesData);
  if (lotesData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="px-6 py-4 text-center text-sm text-gray-500">
          No se encontraron lotes con los filtros seleccionados
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = lotesData
    .map((lote) => {
      // Format the date for display
      const fecha = lote.Fecha
        ? new Date(lote.Fecha).toLocaleDateString()
        : "N/A";

      return `
      <tr class="hover:bg-gray-50 cursor-pointer">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${fecha}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lote.DescripcionProducto || "N/A"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lote.Lote || "N/A"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lote.Cilindros || "0"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lote.TotalKG ? `${lote.TotalKG} kg` : "N/A"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lote.TiempoCilindros_Bruto || "N/A"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lote.TiempoTotalConCortes_Neto || "N/A"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            (lote.Rendimiento || 0) >= 90
              ? "bg-green-100 text-green-800"
              : (lote.Rendimiento || 0) >= 70
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }">
            ${lote.Rendimiento || 0}%
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            lote.Estado === "Completado"
              ? "bg-green-100 text-green-800"
              : lote.Estado === "En Proceso"
              ? "bg-blue-100 text-blue-800"
              : lote.Estado === "Detenida"
              ? "bg-yellow-100 text-yellow-800"
              : lote.Estado === "Mantenimiento"
              ? "bg-purple-100 text-purple-800"
              : lote.Estado === "ERROR"
              ? "bg-red-100 text-red-800"
              : lote.Estado === "Limpieza"
              ? "bg-indigo-100 text-indigo-800"
              : "bg-gray-100 text-gray-800"
          }">
            ${lote.Estado || "N/A"}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="event.stopPropagation(); verDetalleLote('${
            lote.Lote || ""
          }')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="text-green-600 hover:text-green-900" onclick="event.stopPropagation(); exportarLote('${
            lote.Lote || ""
          }')">
            <i class="fas fa-file-export"></i>
          </button>
        </td>
      </tr>`;
    })
    .join("");
}

// Función auxiliar para convertir segundos a formato legible
function formatDuracion(segundos) {
  if (!segundos || segundos === null) return "En proceso";
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = Math.floor(segundos % 60);
  
  if (horas > 0) {
    return `${horas}h ${minutos}m ${segs}s`;
  } else if (minutos > 0) {
    return `${minutos}m ${segs}s`;
  } else {
    return `${segs}s`;
  }
}

// Función auxiliar para calcular diferencia de tiempo en formato legible
function calcularTiempoTotal(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return "N/A";
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffMs = fin - inicio;
  const diffSegundos = Math.floor(diffMs / 1000);
  return formatDuracion(diffSegundos);
}

// Ver detalle de un lote
async function verDetalleLote(loteId) {
  try {
    // Mostrar indicador de carga
    const detalleLoteElement = document.getElementById("detalleLote");
    if (detalleLoteElement) {
      detalleLoteElement.classList.remove("hidden");
      const tabContenido = document.getElementById("tab-contenido");
      if (tabContenido) {
        tabContenido.innerHTML = `
          <div class="flex justify-center items-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-4 text-sm text-gray-500">Cargando datos del lote...</p>
            </div>
          </div>
        `;
      }
    }

    // Llamar al endpoint para obtener los datos del batch
    const response = await fetch(`${API_BASE_URL}/datos-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch: loteId }),
    });

    if (!response.ok) {
      throw new Error(`Error al cargar datos: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data || result.data.length === 0) {
      throw new Error("No se encontraron datos para este lote");
    }

    const datos = result.data;

    // Obtener el primer registro para datos generales del lote
    const primerRegistro = datos[0];
    const ultimoRegistro = datos[datos.length - 1];

    // Calcular totales
    const totalNeto = datos
      .filter((d) => d.Diferencia !== null)
      .reduce((sum, d) => sum + parseFloat(d.Diferencia || 0), 0);
    
    const totalBruto = datos
      .filter((d) => d.PesoLleno !== null)
      .reduce((sum, d) => sum + parseFloat(d.PesoLleno || 0), 0);

    // Calcular tiempo total del proceso
    const fechaInicioProceso = primerRegistro.FechaHoraProceso;
    const fechaFinProceso = datos
      .filter((d) => d.FechaMaxCilindro !== null)
      .map((d) => d.FechaMaxCilindro)
      .sort()
      .pop() || ultimoRegistro.FechaHoraProceso;

    const tiempoTotal = calcularTiempoTotal(fechaInicioProceso, fechaFinProceso);

    // Mapear cilindros
    const cilindros = datos.map((d, index) => {
      const duracion = d.CycleTime_Segundos !== null 
        ? formatDuracion(d.CycleTime_Segundos)
        : "En proceso";
      
      return {
        id: index + 1,
        tara: d.PesoVacio || 0,
        bruto: d.PesoLleno || null,
        neto: d.Diferencia || null,
        hora_inicio: d.FechaMinCilindro ? formatTime(d.FechaMinCilindro) : "N/A",
        hora_fin: d.FechaMaxCilindro ? formatTime(d.FechaMaxCilindro) : "N/A",
        duracion: duracion,
        estado: d.estado || "N/A",
        fecha_inicio: d.FechaMinCilindro,
        fecha_fin: d.FechaMaxCilindro,
        cycleTime_Segundos: d.CycleTime_Segundos,
        tasaProduccion_Cilindro: d.TasaProduccion_Cilindro_kg_min,
        metaCilindro: d.MetaCilindro,
      };
    });

    // Estructurar datos para el detalle
    detalleLoteData = {
      id: loteId,
      lote: primerRegistro.Batch || loteId,
      producto: primerRegistro.DescripcionProducto || "N/A",
      fecha_inicio: fechaInicioProceso,
      fecha_fin: fechaFinProceso,
      total_kg: totalNeto,
      tiempo_total: tiempoTotal,
      rendimiento: 0, // Se calculará si hay datos suficientes
      estado: ultimoRegistro.estado || "N/A",
      cilindros: cilindros,
      // Datos adicionales del endpoint
      id_proceso: primerRegistro.id_proceso,
      idempresa: primerRegistro.idempresa,
      idsucursal: primerRegistro.idsucursal,
      IdProducto: primerRegistro.IdProducto,
      id_controlador: primerRegistro.id_controlador,
      TasaProduccion_Batch_kg_min: primerRegistro.TasaProduccion_Batch_kg_min,
      ProduccionPorHora_kg_h: primerRegistro.ProduccionPorHora_kg_h,
      TiempoCicloPromedio_Segundos: primerRegistro.TiempoCicloPromedio_Segundos,
      MetaCilindro: primerRegistro.MetaCilindro,
    };

    // Actualizar la interfaz con los detalles del lote
    actualizarDetalleLote();

    // Desplazarse al panel de detalle
    if (detalleLoteElement) {
      detalleLoteElement.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    console.error("Error al cargar detalle del lote:", error);
    
    // Mostrar mensaje de error
    const tabContenido = document.getElementById("tab-contenido");
    if (tabContenido) {
      tabContenido.innerHTML = `
        <div class="flex justify-center items-center py-12">
          <div class="text-center">
            <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <p class="text-lg font-medium text-gray-900">Error al cargar datos</p>
            <p class="mt-2 text-sm text-gray-500">${error.message}</p>
          </div>
        </div>
      `;
    }
  }
}

// Actualizar la interfaz con los detalles del lote
function actualizarDetalleLote() {
  if (!detalleLoteData) return;

  // Calcular rendimiento basado en MetaCilindro y promedio
  let rendimiento = 0;
  if (detalleLoteData.cilindros && detalleLoteData.cilindros.length > 0) {
    const cilindrosCompletados = detalleLoteData.cilindros.filter(
      (c) => c.neto !== null && c.estado === "COMPLETO"
    );
    if (cilindrosCompletados.length > 0 && detalleLoteData.MetaCilindro) {
      const promedioNeto = cilindrosCompletados.reduce(
        (sum, c) => sum + parseFloat(c.neto || 0),
        0
      ) / cilindrosCompletados.length;
      rendimiento = (promedioNeto / detalleLoteData.MetaCilindro) * 100;
    }
  }

  // Actualizar información general
  const numeroLoteEl = document.getElementById("numeroLote");
  if (numeroLoteEl) numeroLoteEl.textContent = detalleLoteData.lote;
  
  const detalleProductoEl = document.getElementById("detalleProducto");
  if (detalleProductoEl) detalleProductoEl.textContent = detalleLoteData.producto;
  
  const detallePesoTotalEl = document.getElementById("detallePesoTotal");
  if (detallePesoTotalEl) {
    detallePesoTotalEl.textContent = `${detalleLoteData.total_kg.toFixed(2)} kg`;
  }
  
  const detalleTiempoEl = document.getElementById("detalleTiempo");
  if (detalleTiempoEl) detalleTiempoEl.textContent = detalleLoteData.tiempo_total;
  
  const detalleRendimientoEl = document.getElementById("detalleRendimiento");
  if (detalleRendimientoEl) {
    detalleRendimientoEl.textContent = `${rendimiento.toFixed(1)}%`;
  }

  // Actualizar pestaña de línea de tiempo
  actualizarLineaTiempo();

  // Actualizar pestaña de detalle por cilindro
  actualizarDetalleCilindros();

  // Actualizar pestaña de métricas
  actualizarMetricas();

  // Activar la primera pestaña por defecto
  cambiarPestana("linea-tiempo");
}

// Actualizar línea de tiempo de eventos
function actualizarLineaTiempo() {
  const contenedor = document.getElementById("tab-contenido");
  if (!contenedor || !detalleLoteData) return;

  // Calcular rendimiento
  let rendimiento = 0;
  if (detalleLoteData.cilindros && detalleLoteData.cilindros.length > 0) {
    const cilindrosCompletados = detalleLoteData.cilindros.filter(
      (c) => c.neto !== null && c.estado === "COMPLETO"
    );
    if (cilindrosCompletados.length > 0 && detalleLoteData.MetaCilindro) {
      const promedioNeto = cilindrosCompletados.reduce(
        (sum, c) => sum + parseFloat(c.neto || 0),
        0
      ) / cilindrosCompletados.length;
      rendimiento = (promedioNeto / detalleLoteData.MetaCilindro) * 100;
    }
  }

  // Crear HTML para la línea de tiempo
  let html = `
    <div class="space-y-8">
      <div class="relative">
        <!-- Línea vertical -->
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <!-- Eventos -->
        <div class="space-y-8">
          <!-- Evento Inicio -->
          <div class="relative flex items-start group">
            <div class="absolute left-4 -ml-1.5 mt-1.5 w-3 h-3 rounded-full bg-green-500 border-4 border-white group-hover:bg-green-600"></div>
            <div class="ml-8 flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="flex justify-between items-center">
                <h4 class="font-medium text-gray-900">Inicio del lote</h4>
                <span class="text-sm text-gray-500">${formatDateTime(
                  detalleLoteData.fecha_inicio
                )}</span>
              </div>
              <p class="mt-1 text-sm text-gray-600">Se inició el proceso de llenado del lote ${
                detalleLoteData.lote
              }</p>
            </div>
          </div>
          
          <!-- Eventos de llenado de cilindros -->
          ${detalleLoteData.cilindros
            .map(
              (cilindro) => {
                const estadoColor = cilindro.estado === "COMPLETO" 
                  ? "text-green-600" 
                  : cilindro.estado === "EN PROCESO"
                  ? "text-blue-600"
                  : "text-yellow-600";
                const estadoBg = cilindro.estado === "COMPLETO" 
                  ? "bg-blue-500" 
                  : cilindro.estado === "EN PROCESO"
                  ? "bg-yellow-500"
                  : "bg-gray-500";
                
                return `
            <div class="relative flex items-start group">
              <div class="absolute left-4 -ml-1.5 mt-1.5 w-3 h-3 rounded-full ${estadoBg} border-4 border-white group-hover:opacity-80"></div>
              <div class="ml-8 flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="flex justify-between items-center">
                  <h4 class="font-medium text-gray-900">Cilindro ${
                    cilindro.id
                  } ${cilindro.estado === "COMPLETO" ? "completado" : cilindro.estado.toLowerCase()}</h4>
                  <span class="text-sm text-gray-500">${cilindro.fecha_fin ? formatDateTime(cilindro.fecha_fin) : formatDateTime(cilindro.fecha_inicio)}</span>
                </div>
                <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div><span class="text-gray-500">Peso neto:</span> ${
                    cilindro.neto !== null ? `${cilindro.neto.toFixed(2)} kg` : "En proceso"
                  }</div>
                  <div><span class="text-gray-500">Duración:</span> ${
                    cilindro.duracion
                  }</div>
                  <div><span class="text-gray-500">Estado:</span> <span class="${estadoColor} font-medium">${cilindro.estado}</span></div>
                </div>
              </div>
            </div>
          `;
              }
            )
            .join("")}
          
          <!-- Evento Fin (solo si hay cilindros completados) -->
          ${detalleLoteData.cilindros.some(c => c.estado === "COMPLETO") ? `
          <div class="relative flex items-start group">
            <div class="absolute left-4 -ml-1.5 mt-1.5 w-3 h-3 rounded-full bg-red-500 border-4 border-white group-hover:bg-red-600"></div>
            <div class="ml-8 flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="flex justify-between items-center">
                <h4 class="font-medium text-gray-900">Lote ${detalleLoteData.estado === "COMPLETO" ? "completado" : detalleLoteData.estado.toLowerCase()}</h4>
                <span class="text-sm text-gray-500">${formatDateTime(
                  detalleLoteData.fecha_fin
                )}</span>
              </div>
              <p class="mt-1 text-sm text-gray-600">Estado del lote ${
                detalleLoteData.lote
              } con ${detalleLoteData.cilindros.length} cilindros</p>
              <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div><span class="text-gray-500">Peso total:</span> ${detalleLoteData.total_kg.toFixed(
                  2
                )} kg</div>
                <div><span class="text-gray-500">Tiempo total:</span> ${
                  detalleLoteData.tiempo_total
                }</div>
                <div><span class="text-gray-500">Rendimiento:</span> <span class="font-medium">${rendimiento.toFixed(1)}%</span></div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>`;

  contenedor.innerHTML = html;
}

// Actualizar detalle por cilindro
function actualizarDetalleCilindros() {
  if (!detalleLoteData || !detalleLoteData.cilindros) return;

  const contenedor = document.getElementById("tab-contenido");
  if (!contenedor) return;

  // Calcular totales solo de cilindros completados
  const cilindrosCompletados = detalleLoteData.cilindros.filter(
    (c) => c.neto !== null
  );
  const totalNeto = cilindrosCompletados.reduce(
    (sum, c) => sum + parseFloat(c.neto || 0),
    0
  );

  // Crear HTML para la tabla de cilindros
  let html = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Cilindro</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tara (kg)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bruto (kg)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Neto (kg)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Inicio</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Fin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${detalleLoteData.cilindros
            .map(
              (cilindro) => {
                const estadoClass = cilindro.estado === "COMPLETO"
                  ? "bg-green-100 text-green-800"
                  : cilindro.estado === "EN PROCESO"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800";
                
                return `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${cilindro.id}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cilindro.tara.toFixed(2)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cilindro.bruto !== null ? cilindro.bruto.toFixed(2) : "-"}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${cilindro.neto !== null ? cilindro.neto.toFixed(2) : "-"}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cilindro.hora_inicio}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cilindro.hora_fin}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${cilindro.duracion}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoClass}">
                  ${cilindro.estado}
                </span>
              </td>
            </tr>
          `;
              }
            )
            .join("")}
        </tbody>
        <tfoot class="bg-gray-50">
          <tr>
            <td class="px-6 py-3 text-sm font-medium text-gray-900" colspan="3">Total</td>
            <td class="px-6 py-3 text-sm font-medium text-gray-900">${totalNeto.toFixed(2)} kg</td>
            <td class="px-6 py-3 text-sm text-gray-500" colspan="2"></td>
            <td class="px-6 py-3 text-sm font-medium text-gray-900">${
              detalleLoteData.tiempo_total
            }</td>
            <td class="px-6 py-3"></td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  contenedor.innerHTML = html;
}

// Actualizar métricas del lote
function actualizarMetricas() {
  if (!detalleLoteData) return;

  const contenedor = document.getElementById("tab-contenido");
  if (!contenedor) return;

  // Calcular métricas usando datos reales
  const cilindros = detalleLoteData.cilindros || [];
  const cilindrosCompletados = cilindros.filter((c) => c.neto !== null);
  const totalNeto = cilindrosCompletados.reduce(
    (sum, c) => sum + parseFloat(c.neto || 0),
    0
  );
  const promedioNeto =
    cilindrosCompletados.length > 0
      ? totalNeto / cilindrosCompletados.length
      : 0;
  const metaPorCilindro = detalleLoteData.MetaCilindro || 0;
  const eficiencia =
    metaPorCilindro > 0 ? (promedioNeto / metaPorCilindro) * 100 : 0;

  // Obtener datos del endpoint
  const tasaProduccionBatch =
    detalleLoteData.TasaProduccion_Batch_kg_min || 0;
  const produccionPorHora = detalleLoteData.ProduccionPorHora_kg_h || 0;
  const tiempoCicloPromedio =
    detalleLoteData.TiempoCicloPromedio_Segundos || 0;
  const tiempoCicloPromedioFormato = formatDuracion(tiempoCicloPromedio);

  // Calcular tiempo de ciclo promedio de cilindros completados
  const tiemposCiclo = cilindrosCompletados
    .filter((c) => c.cycleTime_Segundos !== null)
    .map((c) => c.cycleTime_Segundos);
  const tiempoCicloPromedioCalculado =
    tiemposCiclo.length > 0
      ? tiemposCiclo.reduce((sum, t) => sum + t, 0) / tiemposCiclo.length
      : 0;

  // Crear HTML para las métricas
  let html = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Tarjeta de Resumen -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Resumen del Lote</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Producto:</span>
            <span class="text-sm font-medium">${detalleLoteData.producto}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Fecha:</span>
            <span class="text-sm">${formatDate(
              new Date(detalleLoteData.fecha_inicio)
            )}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Hora Inicio/Fin:</span>
            <span class="text-sm">${formatTime(
              detalleLoteData.fecha_inicio
            )} - ${formatTime(detalleLoteData.fecha_fin)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Duración Total:</span>
            <span class="text-sm font-medium">${
              detalleLoteData.tiempo_total
            }</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Estado:</span>
            <span class="text-sm font-medium ${
              detalleLoteData.estado === "COMPLETO"
                ? "text-green-600"
                : detalleLoteData.estado === "EN PROCESO"
                ? "text-blue-600"
                : "text-yellow-600"
            }">${detalleLoteData.estado}</span>
          </div>
        </div>
      </div>
      
      <!-- Tarjeta de Producción -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Producción</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Total Cilindros:</span>
            <span class="text-sm font-medium">${cilindros.length}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Peso Total Neto:</span>
            <span class="text-sm font-medium">${totalNeto.toFixed(2)} kg</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Peso Promedio por Cilindro:</span>
            <span class="text-sm font-medium">${promedioNeto.toFixed(
              2
            )} kg</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Meta por Cilindro:</span>
            <span class="text-sm">${metaPorCilindro} kg</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">Eficiencia:</span>
            <div class="flex items-center">
              <div class="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                <div class="bg-green-600 h-2.5 rounded-full" style="width: ${Math.min(
                  100,
                  eficiencia
                )}%"></div>
              </div>
              <span class="text-sm font-medium">${eficiencia.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tarjeta de Indicadores -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Indicadores de Producción</h3>
        <div class="space-y-3">
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium text-gray-600">Tiempo de Ciclo Promedio</span>
              <span class="text-sm font-medium text-blue-600">${tiempoCicloPromedioFormato}</span>
            </div>
            <p class="mt-1 text-xs text-gray-500">Tiempo promedio de ciclo del batch</p>
          </div>
          
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium text-gray-600">Tasa de Producción (Batch)</span>
              <span class="text-sm font-medium text-green-600">${tasaProduccionBatch.toFixed(2)} kg/min</span>
            </div>
            <p class="mt-1 text-xs text-gray-500">Tasa de producción del batch completo</p>
          </div>
          
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium text-gray-600">Producción por Hora</span>
              <span class="text-sm font-medium text-purple-600">${produccionPorHora.toFixed(2)} kg/h</span>
            </div>
            <p class="mt-1 text-xs text-gray-500">Producción estimada por hora</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Gráficos -->
    <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Gráfico de Pesos por Cilindro -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Pesos por Cilindro</h3>
        <div id="graficoPesos" class="h-64"></div>
      </div>
      
      <!-- Gráfico de Tiempos por Cilindro -->
      <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Tiempos por Cilindro</h3>
        <div id="graficoTiempos" class="h-64"></div>
      </div>
    </div>`;

  contenedor.innerHTML = html;

  // Inicializar gráficos
  inicializarGraficosDetalle();
}

// Inicializar gráficos del dashboard
function inicializarGraficos() {
  // Gráfico de producción diaria
  const produccionOptions = {
    series: [
      {
        name: "Producción (kg)",
        data: [1200, 1350, 980, 1100, 1420, 1250, 1300],
      },
    ],
    chart: {
      height: "100%",
      type: "area",
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: false,
      },
    },
    colors: ["#4F46E5"],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return value + " kg";
        },
        style: {
          colors: "#6B7280",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    tooltip: {
      y: {
        formatter: function (value) {
          return value + " kg";
        },
      },
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 2,
    },
  };

  const produccionChart = new ApexCharts(
    document.querySelector("#graficoProduccionDiaria"),
    produccionOptions
  );
  produccionChart.render();

  // Gráfico de eficiencia por turno
  const eficienciaOptions = {
    series: [
      {
        name: "Eficiencia",
        data: [85, 92, 78, 88, 94, 90, 87],
      },
    ],
    chart: {
      height: "100%",
      type: "radialBar",
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 225,
        hollow: {
          margin: 0,
          size: "70%",
          background: "#fff",
          image: undefined,
          imageOffsetX: 0,
          imageOffsetY: 0,
          position: "front",
          dropShadow: {
            enabled: true,
            top: 3,
            left: 0,
            blur: 4,
            opacity: 0.24,
          },
        },
        track: {
          background: "#E5E7EB",
          strokeWidth: "67%",
          margin: 0,
          dropShadow: {
            enabled: false,
            top: -3,
            left: 0,
            blur: 4,
            opacity: 0.35,
          },
        },
        dataLabels: {
          show: true,
          name: {
            offsetY: -10,
            show: true,
            color: "#6B7280",
            fontSize: "13px",
          },
          value: {
            formatter: function (val) {
              return parseInt(val) + "%";
            },
            color: "#111",
            fontSize: "30px",
            show: true,
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        gradientToColors: ["#4F46E5"],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Eficiencia General"],
  };

  const eficienciaChart = new ApexCharts(
    document.querySelector("#graficoEficiencia"),
    eficienciaOptions
  );
  eficienciaChart.render();
}

// Inicializar gráficos del detalle del lote
function inicializarGraficosDetalle() {
  if (!detalleLoteData) return;

  // Datos de ejemplo para los gráficos
  const cilindros = detalleLoteData.cilindros || [];
  const categorias = cilindros.map((c) => `Cilindro ${c.id}`);
  const pesosNetos = cilindros.map((c) => parseFloat(c.neto));
  const tiempos = cilindros.map((c) => {
    // Convertir duración como "30m" a minutos numéricos
    const match = c.duracion.match(/(\d+)/);
    return match ? parseInt(match[0]) : 0;
  });

  // Gráfico de pesos netos
  const pesosOptions = {
    series: [
      {
        name: "Peso Neto (kg)",
        data: pesosNetos,
      },
    ],
    chart: {
      type: "bar",
      height: "100%",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
        columnWidth: "60%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: categorias,
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    yaxis: {
      title: {
        text: "Peso (kg)",
      },
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    fill: {
      opacity: 1,
      colors: ["#4F46E5"],
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " kg";
        },
      },
    },
  };

  const pesosChart = new ApexCharts(
    document.querySelector("#graficoPesos"),
    pesosOptions
  );
  pesosChart.render();

  // Gráfico de tiempos
  const tiemposOptions = {
    series: [
      {
        name: "Tiempo (min)",
        data: tiempos,
      },
    ],
    chart: {
      type: "line",
      height: "100%",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
      colors: ["#10B981"],
    },
    markers: {
      size: 5,
      colors: ["#10B981"],
      strokeWidth: 0,
      hover: {
        size: 7,
      },
    },
    xaxis: {
      categories: categorias,
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    yaxis: {
      title: {
        text: "Tiempo (minutos)",
      },
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " min";
        },
      },
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 2,
    },
  };

  const tiemposChart = new ApexCharts(
    document.querySelector("#graficoTiempos"),
    tiemposOptions
  );
  tiemposChart.render();
}

// Cambiar entre pestañas en el detalle del lote
function cambiarPestana(pestana) {
  // Actualizar botones de pestaña
  document.querySelectorAll(".tab-button").forEach((btn) => {
    if (btn.dataset.tab === pestana) {
      btn.classList.remove(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      );
      btn.classList.add("border-blue-500", "text-blue-600");
    } else {
      btn.classList.remove("border-blue-500", "text-blue-600");
      btn.classList.add(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      );
    }
  });

  // Actualizar contenido de la pestaña
  switch (pestana) {
    case "linea-tiempo":
      actualizarLineaTiempo();
      break;
    case "detalle-cilindros":
      actualizarDetalleCilindros();
      break;
    case "metricas":
      actualizarMetricas();
      break;
  }
}

// Configurar eventos de la interfaz
function configurarEventos() {
  // Configurar cambio de empresa
  const filtroEmpresa = document.getElementById("filtroEmpresa");
  if (filtroEmpresa) {
    filtroEmpresa.addEventListener("change", function () {
      filtrosActuales.empresa = this.value;
      // Limpiar producto cuando cambia la empresa
      limpiarProducto();
    });
  }

  // Configurar búsqueda de productos con tecla Enter
  const buscarProductoInput = document.getElementById("buscarProducto");
  if (buscarProductoInput) {
    buscarProductoInput.addEventListener("input", function () {
      const termino = this.value.trim();
      if (termino.length >= 2) {
        buscarProductos(filtrosActuales.empresa, termino)
          .then((productos) => {
            productosData = Array.isArray(productos) ? productos : [];
            actualizarResultadosProductos();
          })
          .catch((error) => {
            console.error("Error al buscar productos:", error);
            productosData = [];
            actualizarResultadosProductos();
          });
      } else if (termino.length === 0) {
        // Si se borra la búsqueda, cargar todos los productos
        cargarProductosParaModal();
      }
    });
  }

  // Abrir modal de búsqueda de productos
  const abrirProductosBtn = document.getElementById("abrirProductos");
  if (abrirProductosBtn) {
    abrirProductosBtn.addEventListener("click", function () {
      const modal = document.getElementById("modalProductos");
      if (modal) {
        modal.classList.remove("hidden");
        // Cargar productos al abrir el modal
        cargarProductosParaModal();
        // Enfocar el campo de búsqueda al abrir el modal
        const buscarInput = document.getElementById("buscarProducto");
        if (buscarInput) {
          buscarInput.focus();
        }
      }
    });
  }

  // Cerrar modal de productos
  const cerrarModalBtn = document.getElementById("cerrarModalProductos");
  if (cerrarModalBtn) {
    cerrarModalBtn.addEventListener("click", function () {
      const modal = document.getElementById("modalProductos");
      if (modal) {
        modal.classList.add("hidden");
        document.getElementById("buscarProductoModal").value = "";
        productosModalFiltrados = [];
      }
    });
  }

  // Botón cancelar en el modal
  const cancelarBtn = document.getElementById("cancelarSeleccion");
  if (cancelarBtn) {
    cancelarBtn.addEventListener("click", function () {
      const modal = document.getElementById("modalProductos");
      if (modal) {
        modal.classList.add("hidden");
      }
    });
  }

  // Cerrar modal al hacer clic fuera del contenido
  const modal = document.getElementById("modalProductos");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  }
  // Toggle de filtros
  const toggleFiltros = document.getElementById("toggleFiltros");
  const filtrosSection = document.getElementById("filtrosSection");
  const filtroIcon = document.getElementById("filtroIcon");
  const buscarProductoModal = document.getElementById("buscarProductoModal");

  // Inicializar el estado de los filtros (inicialmente colapsado)
  if (filtrosSection) {
    filtrosSection.classList.add("collapsed");
    if (filtroIcon) {
      filtroIcon.classList.remove("fa-chevron-up");
      filtroIcon.classList.add("fa-chevron-down");
    }
  }

  if (toggleFiltros && filtrosSection) {
    toggleFiltros.addEventListener("click", () => {
      // Toggle the collapsed/expanded state
      const wasCollapsed = filtrosSection.classList.contains("collapsed");

      // Toggle the visibility class
      filtrosSection.classList.toggle("hidden");

      // Toggle the collapsed/expanded classes
      if (wasCollapsed) {
        filtrosSection.classList.remove("collapsed");
        filtrosSection.classList.add("expanded");
      } else {
        filtrosSection.classList.remove("expanded");
        filtrosSection.classList.add("collapsed");
      }

      // Update the icon
      if (filtroIcon) {
        filtroIcon.className = wasCollapsed
          ? "fas fa-chevron-up ml-2 text-sm"
          : "fas fa-chevron-down ml-2 text-sm";
      }
    });
  }

  if (buscarProductoModal) {
    buscarProductoModal.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      if (searchTerm.trim() === "") {
        // Si no hay término de búsqueda, mostrar todos los productos
        window.productosModalFiltrados = [...productosData];
      } else {
        // Filtrar por ID o descripción
        window.productosModalFiltrados = productosData.filter((producto) => {
          const id = (producto.idproducto || "").toString().toLowerCase();
          const descripcion = (producto.descripcion || "").toLowerCase();
          return id.includes(searchTerm) || descripcion.includes(searchTerm);
        });
      }
      actualizarResultadosProductos();
    });
  }
  const limpiarBusquedaModalBtn = document.getElementById(
    "limpiarBusquedaModal"
  );
  if (limpiarBusquedaModalBtn) {
    limpiarBusquedaModalBtn.addEventListener("click", function () {
      document.getElementById("buscarProductoModal").value = "";
      filtrarProductosEnModal();
    });
  }
  // Aplicar filtros
  const aplicarFiltrosBtn = document.getElementById("aplicarFiltros");
  if (aplicarFiltrosBtn) {
    aplicarFiltrosBtn.addEventListener("click", () => {
      cargarLotes();
    });
  }

  // Limpiar filtros
  const limpiarFiltrosBtn = document.getElementById("limpiarFiltros");
  if (limpiarFiltrosBtn) {
    limpiarFiltrosBtn.addEventListener("click", () => {
      // Restablecer fechas a los últimos 7 días
      const fechaFin = new Date();
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 7);

      // Actualizar el datepicker
      const datePicker = document.querySelector("#rangoFechas")._flatpickr;
      if (datePicker) {
        datePicker.setDate([fechaInicio, fechaFin]);
      }

      // Restablecer filtros
      filtrosActuales.fechaInicio = formatDate(fechaInicio);
      filtrosActuales.fechaFin = formatDate(fechaFin);
      filtrosActuales.empresa = "agromarnsr";
      filtrosActuales.sucursal = "003";
      filtrosActuales.producto = null;
      filtrosActuales.controlador = null;

      // Recargar datos
      cargarLotes();
    });
  }

  // Cerrar detalle de lote
  const cerrarDetalleBtn = document.getElementById("cerrarDetalle");
  if (cerrarDetalleBtn) {
    cerrarDetalleBtn.addEventListener("click", function () {
      document.getElementById("detalleLote").classList.add("hidden");
    });
  }

  // Delegación de eventos para los botones de pestaña
  document.addEventListener("click", function (e) {
    if (e.target.closest(".tab-button")) {
      const button = e.target.closest(".tab-button");
      const tab = button.dataset.tab;
      if (tab) {
        cambiarPestana(tab);
      }
    }
  });

  // Exportar reporte
  const exportarReporteBtn = document.getElementById("exportarReporte");
  if (exportarReporteBtn) {
    exportarReporteBtn.addEventListener("click", function () {
      // Aquí iría la lógica para exportar el reporte
      alert("La funcionalidad de exportación se implementará próximamente.");
    });
  }
}

// Exportar lote a PDF/Excel
function exportarLote(loteId) {
  // Aquí iría la lógica para exportar el lote
  alert(`Exportando lote ${loteId}...`);
}

// Función auxiliar para formatear fechas
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "N/A";

  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Función auxiliar para formatear solo la hora
function formatTime(timeString) {
  if (!timeString) return "N/A";

  // Si es una fecha completa, extraer solo la hora
  const date = new Date(timeString);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // Si ya es una hora en formato HH:MM, devolverla tal cual
  const timeRegex = /^\d{1,2}:\d{2}(?::\d{2})?$/;
  if (timeRegex.test(timeString)) {
    return timeString;
  }

  return "N/A";
}

// Función auxiliar para obtener la clase CSS según el estado
function getEstadoClass(estado) {
  if (!estado) return "bg-gray-100 text-gray-800";

  const estadoLower = estado.toLowerCase();

  if (
    estadoLower.includes("complet") ||
    estadoLower.includes("finaliz") ||
    estadoLower === "ok"
  ) {
    return "bg-green-100 text-green-800";
  } else if (
    estadoLower.includes("proceso") ||
    estadoLower.includes("en curso")
  ) {
    return "bg-blue-100 text-blue-800";
  } else if (
    estadoLower.includes("pausa") ||
    estadoLower.includes("detenido")
  ) {
    return "bg-yellow-100 text-yellow-800";
  } else if (
    estadoLower.includes("error") ||
    estadoLower.includes("fallo") ||
    estadoLower.includes("rechazado")
  ) {
    return "bg-red-100 text-red-800";
  } else {
    return "bg-gray-100 text-gray-800";
  }
}

// Función para mostrar mensajes de error
function mostrarError(mensaje) {
  // Aquí podrías implementar un sistema de notificaciones más sofisticado
  console.error(mensaje);
  alert(mensaje);
}

// Generar datos de ejemplo para la tabla
function generarDatosEjemploTabla() {
  const productos = ["Producto A", "Producto B", "Producto C", "Producto D"];
  const estados = ["Completado", "En Proceso", "Pausado", "Error"];
  const fechas = [
    "2023-11-10T08:30:00",
    "2023-11-09T14:15:00",
    "2023-11-08T10:45:00",
    "2023-11-07T16:20:00",
    "2023-11-06T09:10:00",
    "2023-11-05T11:30:00",
    "2023-11-04T13:45:00",
    "2023-11-03T15:20:00",
    "2023-11-02T08:55:00",
    "2023-11-01T12:10:00",
  ];

  return fechas.map((fecha, index) => ({
    id: `LOT-${1000 + index}`,
    fecha: fecha,
    producto: productos[Math.floor(Math.random() * productos.length)],
    lote: `LOT-${1000 + index}`,
    cilindros: Math.floor(Math.random() * 50) + 10,
    total_kg: Math.floor(Math.random() * 5000) + 1000,
    tiempo_total: `${Math.floor(Math.random() * 8) + 1}h ${Math.floor(
      Math.random() * 60
    )}m`,
    rendimiento: Math.floor(Math.random() * 30) + 70,
    estado: estados[Math.floor(Math.random() * estados.length)],
  }));
}
document.getElementById("sucursalFilter").value = "003";
// Hacer las funciones accesibles globalmente
window.verDetalleLote = verDetalleLote;
window.exportarLote = exportarLote;
window.cambiarPestana = cambiarPestana;
