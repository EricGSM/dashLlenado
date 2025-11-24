// Configuración base de la API
const API_BASE_URL = "http://45.224.144.34:5000/llenado/api";
const PALETAS_API_URL = "http://45.224.144.34:5000/paletas/api";

// Variables globales para los gráficos
let charts = {};
let autoRefreshId = null;

// Variables para filtros
let filtrosActuales = {
  empresa: "",
  sucursal: "",
  producto: "",
  productoId: "",
  tiempo: "hoy",
  fechaInicio: "",
  fechaFin: "",
};

// Variables para productos
let productosDisponibles = [];
let productosFiltrados = [];

// Variables para el modal y toggle
let filtrosVisibles = false;
let productosModalFiltrados = [];

// Función para hacer llamadas a la API
async function fetchData(endpoint, params = {}) {
  try {
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // Agregar parámetros de filtros a la URL
    Object.keys(filtrosActuales).forEach((key) => {
      if (filtrosActuales[key] && key !== "producto") {
        url.searchParams.append(key, filtrosActuales[key]);
      }
    });

    // Agregar parámetros adicionales
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    // Retornar datos de ejemplo en caso de error
    return getMockData(endpoint);
  }
}

// Función para buscar productos
async function buscarProductos(empresa, producto = "") {
  try {
    const response = await fetch(`${PALETAS_API_URL}/buscar_todos_producto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresa: empresa,
        producto: producto,
      }),
    });

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

// Función para cargar productos cuando se selecciona empresa
async function cargarProductosPorEmpresa(empresa) {
  if (!empresa) {
    productosDisponibles = [];
    actualizarDropdownProductos();
    return;
  }

  try {
    const productos = await buscarProductos(empresa);
    productosDisponibles = productos;
    actualizarDropdownProductos();
  } catch (error) {
    console.error("Error cargando productos:", error);
    productosDisponibles = [];
    actualizarDropdownProductos();
  }
}

// Función para actualizar el dropdown de productos
function actualizarDropdownProductos() {
  const dropdown = document.getElementById("productoDropdown");
  const input = document.getElementById("productoFilter");
  const hiddenInput = document.getElementById("productoId");

  if (!dropdown || !input || !hiddenInput) return;

  dropdown.innerHTML = "";

  if (productosDisponibles.length === 0) {
    dropdown.innerHTML =
      '<div class="px-3 py-2 text-gray-500 text-sm">No hay productos disponibles</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  productosDisponibles.forEach((producto) => {
    const item = document.createElement("div");
    item.className = "px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm";
    item.innerHTML = `
            <div class="font-medium">${producto.descripcion}</div>
            <div class="text-gray-500 text-xs">ID: ${producto.idproducto}</div>
        `;

    item.addEventListener("click", () => {
      input.value = producto.descripcion;
      hiddenInput.value = producto.idproducto;
      filtrosActuales.producto = producto.descripcion;
      filtrosActuales.productoId = producto.idproducto;
      dropdown.classList.add("hidden");
    });

    dropdown.appendChild(item);
  });

  dropdown.classList.remove("hidden");
}

// Función para filtrar productos por texto
function filtrarProductosPorTexto(texto) {
  if (!texto || texto.trim() === "") {
    productosFiltrados = productosDisponibles;
  } else {
    productosFiltrados = productosDisponibles.filter(
      (producto) =>
        producto.descripcion.toLowerCase().includes(texto.toLowerCase()) ||
        producto.idproducto.toLowerCase().includes(texto.toLowerCase())
    );
  }

  // Actualizar dropdown con productos filtrados
  const dropdown = document.getElementById("productoDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = "";

  if (productosFiltrados.length === 0) {
    dropdown.innerHTML =
      '<div class="px-3 py-2 text-gray-500 text-sm">No se encontraron productos</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  productosFiltrados.forEach((producto) => {
    const item = document.createElement("div");
    item.className = "px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm";
    item.innerHTML = `
            <div class="font-medium">${producto.descripcion}</div>
            <div class="text-gray-500 text-xs">ID: ${producto.idproducto}</div>
        `;

    item.addEventListener("click", () => {
      document.getElementById("productoFilter").value = producto.descripcion;
      document.getElementById("productoId").value = producto.idproducto;
      filtrosActuales.producto = producto.descripcion;
      filtrosActuales.productoId = producto.idproducto;
      dropdown.classList.add("hidden");
    });

    dropdown.appendChild(item);
  });

  dropdown.classList.remove("hidden");
}

// Función para obtener fechas según el filtro de tiempo
function obtenerFechasPorTiempo(tiempo) {
  const ahora = new Date();
  let fechaInicio, fechaFin;

  switch (tiempo) {
    case "hoy":
      fechaInicio = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
      );
      fechaFin = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        23,
        59,
        59
      );
      break;
    case "semana":
      fechaInicio = new Date(ahora);
      fechaInicio.setDate(ahora.getDate() - ahora.getDay());
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + 6);
      fechaFin.setHours(23, 59, 59);
      break;
    case "mes":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaFin = new Date(
        ahora.getFullYear(),
        ahora.getMonth() + 1,
        0,
        23,
        59,
        59
      );
      break;
    case "año":
      fechaInicio = new Date(ahora.getFullYear(), 0, 1);
      fechaFin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
      break;
    case "personalizado":
      const inicioInput = document.getElementById("fechaInicio");
      const finInput = document.getElementById("fechaFin");
      fechaInicio = inicioInput.value ? new Date(inicioInput.value) : null;
      fechaFin = finInput.value ? new Date(finInput.value) : null;
      break;
    default:
      fechaInicio = fechaFin = null;
  }

  return {
    inicio: fechaInicio ? fechaInicio.toISOString().split("T")[0] : "",
    fin: fechaFin ? fechaFin.toISOString().split("T")[0] : "",
  };
}

// Función para actualizar el texto de filtros activos
function actualizarFiltrosActivos() {
  const filtrosActivosElement = document.getElementById("filtrosActivos");
  if (!filtrosActivosElement) return;

  const filtros = [];

  // Obtener empresa (primera palabra del texto seleccionado)
  const empresaSelect = document.getElementById("empresaFilter");
  if (empresaSelect && empresaSelect.value) {
    const empresaOption = empresaSelect.options[empresaSelect.selectedIndex];
    if (empresaOption && empresaOption.text) {
      const primeraPalabra = empresaOption.text.split(" ")[0];
      filtros.push(primeraPalabra);
    }
  }

  // Obtener sucursal
  const sucursalSelect = document.getElementById("sucursalFilter");
  if (sucursalSelect && sucursalSelect.value) {
    const sucursalOption = sucursalSelect.options[sucursalSelect.selectedIndex];
    if (sucursalOption && sucursalOption.text) {
      filtros.push(sucursalOption.text);
    }
  }

  // Obtener producto
  const productoInput = document.getElementById("productoFilter");
  if (
    productoInput &&
    productoInput.value &&
    productoInput.value.trim() !== ""
  ) {
    filtros.push(productoInput.value);
  }

  // Obtener período
  const tiempoSelect = document.getElementById("tiempoFilter");
  if (tiempoSelect && tiempoSelect.value) {
    const periodoMap = {
      hoy: "Hoy",
      semana: "Por Semana",
      mes: "Este Mes",
      año: "Este Año",
      personalizado: "Fechas Personalizadas",
    };
    const periodoTexto = periodoMap[tiempoSelect.value];
    if (periodoTexto) {
      filtros.push(periodoTexto);
    }
  }

  // Actualizar el texto
  if (filtros.length > 0) {
    filtrosActivosElement.textContent = filtros.join(" - ");
  } else {
    filtrosActivosElement.textContent = "";
  }
}

// Función para aplicar filtros
function aplicarFiltros() {
  // Recopilar valores de los filtros
  filtrosActuales.empresa = document.getElementById("empresaFilter").value;
  filtrosActuales.sucursal = document.getElementById("sucursalFilter").value;
  filtrosActuales.tiempo = document.getElementById("tiempoFilter").value;

  // Obtener fechas según el filtro de tiempo
  const fechas = obtenerFechasPorTiempo(filtrosActuales.tiempo);
  filtrosActuales.fechaInicio = fechas.inicio;
  filtrosActuales.fechaFin = fechas.fin;

  console.log("Filtros aplicados:", filtrosActuales);

  // Validar que se haya seleccionado empresa y sucursal
  if (!filtrosActuales.empresa || !filtrosActuales.sucursal) {
    alert(
      "Por favor selecciona una empresa y sucursal antes de aplicar los filtros"
    );
    return;
  }

  // Actualizar texto de filtros activos
  actualizarFiltrosActivos();

  // Recargar datos con los filtros aplicados
  loadDashboardData();
}

// Función para limpiar filtros
function limpiarFiltros() {
  // Limpiar inputs
  document.getElementById("empresaFilter").value = "";
  document.getElementById("sucursalFilter").value = "";
  document.getElementById("productoFilter").value = "";
  document.getElementById("productoId").value = "";
  document.getElementById("tiempoFilter").value = "hoy";
  document.getElementById("fechaInicio").value = "";
  document.getElementById("fechaFin").value = "";

  // Ocultar fechas personalizadas
  document.getElementById("fechasPersonalizadas").classList.add("hidden");

  // Limpiar variables
  filtrosActuales = {
    empresa: "",
    sucursal: "",
    producto: "",
    productoId: "",
    tiempo: "hoy",
    fechaInicio: "",
    fechaFin: "",
  };

  productosDisponibles = [];
  productosFiltrados = [];

  // Actualizar texto de filtros activos
  actualizarFiltrosActivos();

  // Recargar datos sin filtros
  loadDashboardData();
}

// Funciones para el toggle de filtros
function toggleFiltros() {
  const filtrosSection = document.getElementById("filtrosSection");
  const toggleBtn = document.getElementById("toggleFiltros");

  if (filtrosVisibles) {
    // Ocultar filtros
    filtrosSection.classList.remove("visible");
    filtrosSection.classList.add("oculto");
    toggleBtn.innerHTML = '<i class="fas fa-filter text-lg"></i>';
    filtrosVisibles = false;
  } else {
    // Mostrar filtros
    filtrosSection.classList.remove("oculto");
    filtrosSection.classList.add("visible");
    toggleBtn.innerHTML = '<i class="fas fa-times text-lg"></i>';
    filtrosVisibles = true;
  }
}

function ocultarFiltros() {
  const filtrosSection = document.getElementById("filtrosSection");
  const toggleBtn = document.getElementById("toggleFiltros");

  filtrosSection.classList.remove("visible");
  filtrosSection.classList.add("oculto");
  toggleBtn.innerHTML = '<i class="fas fa-filter text-lg"></i>';
  filtrosVisibles = false;
}

function mostrarFiltros() {
  const filtrosSection = document.getElementById("filtrosSection");
  const toggleBtn = document.getElementById("toggleFiltros");

  filtrosSection.classList.remove("oculto");
  filtrosSection.classList.add("visible");
  toggleBtn.innerHTML = '<i class="fas fa-times text-lg"></i>';
  filtrosVisibles = true;
}

// Funciones para el modal de productos
function abrirModalProductos() {
  const empresa = document.getElementById("empresaFilter").value;

  if (!empresa) {
    alert("Por favor selecciona una empresa primero");
    return;
  }

  const modal = document.getElementById("modalProductos");
  modal.classList.remove("hidden");

  // Cargar productos para el modal
  cargarProductosParaModal(empresa);
}

function cerrarModalProductos() {
  const modal = document.getElementById("modalProductos");
  modal.classList.add("hidden");

  // Limpiar búsqueda del modal
  document.getElementById("buscarProductoModal").value = "";
  productosModalFiltrados = [];
}

async function cargarProductosParaModal(empresa) {
  try {
    const productos = await buscarProductos(empresa);
    productosModalFiltrados = productos;
    actualizarTablaProductos();
  } catch (error) {
    console.error("Error cargando productos para modal:", error);
    productosModalFiltrados = [];
    actualizarTablaProductos();
  }
}

function actualizarTablaProductos() {
  const tablaBody = document.getElementById("tablaProductos");
  const sinProductos = document.getElementById("sinProductos");
  const sinResultados = document.getElementById("sinResultados");

  if (!tablaBody) return;

  tablaBody.innerHTML = "";

  if (productosModalFiltrados.length === 0) {
    if (document.getElementById("empresaFilter").value === "") {
      sinProductos.classList.remove("hidden");
      sinResultados.classList.add("hidden");
    } else {
      sinProductos.classList.add("hidden");
      sinResultados.classList.remove("hidden");
    }
    return;
  }

  sinProductos.classList.add("hidden");
  sinResultados.classList.add("hidden");

  productosModalFiltrados.forEach((producto) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50";

    row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${
              producto.idproducto
            }</td>
            <td class="px-4 py-3 text-sm text-gray-900">${
              producto.descripcion
            }</td>
            <td class="px-4 py-3 text-sm">
                <button class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors" 
                        onclick="seleccionarProducto('${
                          producto.idproducto
                        }', '${producto.descripcion.replace(/'/g, "\\'")}')">
                    Seleccionar
                </button>
            </td>
        `;

    tablaBody.appendChild(row);
  });
}

function seleccionarProducto(id, descripcion) {
  // Actualizar el input de producto
  document.getElementById("productoFilter").value = descripcion;
  document.getElementById("productoId").value = id;
  filtrosActuales.producto = descripcion;
  filtrosActuales.productoId = id;

  // Actualizar texto de filtros activos
  actualizarFiltrosActivos();

  // Cerrar modal
  cerrarModalProductos();
}

function filtrarProductosEnModal() {
  const busqueda = document
    .getElementById("buscarProductoModal")
    .value.toLowerCase();
  const empresa = document.getElementById("empresaFilter").value;

  if (!empresa) {
    productosModalFiltrados = [];
  } else if (busqueda.trim() === "") {
    // Si no hay búsqueda, mostrar todos los productos de la empresa
    cargarProductosParaModal(empresa);
    return;
  } else {
    // Filtrar productos por búsqueda
    productosModalFiltrados = productosDisponibles.filter(
      (producto) =>
        producto.descripcion.toLowerCase().includes(busqueda) ||
        producto.idproducto.toLowerCase().includes(busqueda)
    );
  }

  actualizarTablaProductos();
}

function limpiarProductoSeleccionado() {
  document.getElementById("productoFilter").value = "";
  document.getElementById("productoId").value = "";
  filtrosActuales.producto = "";
  filtrosActuales.productoId = "";

  // Actualizar texto de filtros activos
  actualizarFiltrosActivos();
}

// Datos de ejemplo para cuando la API no esté disponible
function getMockData(endpoint) {
  const mockData = {
    "/kpis": {
      produccionTotal: 1250,
      cilindrosLlenados: 89,
      eficiencia: 94.5,
      calidad: 98.2,
      variaciones: {
        produccion: 5.2,
        cilindros: 3.1,
        eficiencia: 2.8,
        calidad: 1.5,
      },
    },
    "/produccion": {
      porDia: [
        { dia: "Lun", cantidad: 180 },
        { dia: "Mar", cantidad: 220 },
        { dia: "Mié", cantidad: 195 },
        { dia: "Jue", cantidad: 240 },
        { dia: "Vie", cantidad: 210 },
        { dia: "Sáb", cantidad: 165 },
        { dia: "Dom", cantidad: 140 },
      ],
      porTurno: [
        { turno: "Mañana", cantidad: 420 },
        { turno: "Tarde", cantidad: 380 },
        { turno: "Noche", cantidad: 450 },
      ],
    },
    "/cilindros": [
      {
        id: "C001",
        capacidad: 50,
        estado: "Lleno",
        ultimoLlenado: "2024-01-15",
        proximoMantenimiento: "2024-02-15",
      },
      {
        id: "C002",
        capacidad: 100,
        estado: "Vacio",
        ultimoLlenado: "2024-01-14",
        proximoMantenimiento: "2024-02-20",
      },
      {
        id: "C003",
        capacidad: 75,
        estado: "En Proceso",
        ultimoLlenado: "2024-01-15",
        proximoMantenimiento: "2024-02-10",
      },
      {
        id: "C004",
        capacidad: 50,
        estado: "Mantenimiento",
        ultimoLlenado: "2024-01-10",
        proximoMantenimiento: "2024-01-25",
      },
      {
        id: "C005",
        capacidad: 100,
        estado: "Lleno",
        ultimoLlenado: "2024-01-15",
        proximoMantenimiento: "2024-03-01",
      },
    ],
    "/calidad": {
      indicadores: {
        presion: 95,
        temperatura: 88,
        pureza: 99,
        volumen: 92,
        tiempo: 90,
      },
      inspecciones: [
        {
          fecha: "2024-01-15",
          cilindro: "C001",
          resultado: "Aprobado",
          inspector: "Juan Pérez",
        },
        {
          fecha: "2024-01-15",
          cilindro: "C003",
          resultado: "Aprobado",
          inspector: "María García",
        },
        {
          fecha: "2024-01-14",
          cilindro: "C002",
          resultado: "Rechazado",
          inspector: "Carlos López",
        },
        {
          fecha: "2024-01-14",
          cilindro: "C005",
          resultado: "Aprobado",
          inspector: "Ana Martínez",
        },
      ],
    },
    "/comparativos": {
      sucursales: [
        { nombre: "Sucursal A", produccion: 450 },
        { nombre: "Sucursal B", produccion: 380 },
        { nombre: "Sucursal C", produccion: 420 },
      ],
      eficiencia: [
        { nombre: "Sucursal A", eficiencia: 96 },
        { nombre: "Sucursal B", eficiencia: 89 },
        { nombre: "Sucursal C", eficiencia: 94 },
      ],
    },
  };
  return mockData[endpoint] || {};
}

// Función para obtener KPIs del endpoint real
async function fetchKPIs() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "24010020007",
      tipoFiltro: obtenerTipoFiltro(filtrosActuales.tiempo),
    };

    console.log("Enviando petición KPIs:", body);

    const response = await fetch(`${API_BASE_URL}/consulta-kpis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0]; // Retornar el primer elemento del array
    } else {
      throw new Error("No hay datos disponibles");
    }
  } catch (error) {
    console.error("Error fetching KPIs:", error);
    // Retornar datos de ejemplo en caso de error
    return {
      ProduccionActualKg: 0,
      ProduccionAnteriorKg: 0,
      VariacionProduccion: 0,
      CilindrosActuales: 0,
      CilindrosAnteriores: 0,
      VariacionCilindros: 0,
      RendimientoActual: 0,
      RendimientoAnterior: 0,
      VariacionRendimiento: 0,
    };
  }
}

// Función para mapear el tipo de filtro de tiempo
function obtenerTipoFiltro(tiempo) {
  const mapeoTiempo = {
    hoy: "DIA",
    semana: "SEMANA",
    mes: "MES",
    año: "AÑO",
    personalizado: "RANGO", // RANGO para fechas personalizadas
  };
  return mapeoTiempo[tiempo] || "MES";
}

// Función para obtener datos de indicadores KPI (tiempo y pesos)
async function fetchKpiIndicadores() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const tipoFiltro = obtenerTipoFiltro(filtrosActuales.tiempo);
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "21000030115",
      tipoFiltro: tipoFiltro,
    };

    // Si el tipo de filtro es RANGO, agregar fechas
    if (tipoFiltro === "RANGO") {
      if (filtrosActuales.fechaInicio && filtrosActuales.fechaFin) {
        body.fechaInicio = filtrosActuales.fechaInicio;
        body.fechaFin = filtrosActuales.fechaFin;
      } else {
        // Si no hay fechas pero es RANGO, usar las fechas por defecto del período personalizado
        const fechas = obtenerFechasPorTiempo(filtrosActuales.tiempo);
        if (fechas.inicio && fechas.fin) {
          body.fechaInicio = fechas.inicio;
          body.fechaFin = fechas.fin;
        }
      }
    }

    console.log("Enviando petición KPI Indicadores:", body);

    const response = await fetch(`${API_BASE_URL}/kpi-indicadores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0]; // Retornar el primer elemento del array
    } else {
      throw new Error("No hay datos de indicadores disponibles");
    }
  } catch (error) {
    console.error("Error fetching KPI Indicadores:", error);
    // Retornar datos de ejemplo en caso de error
    return {
      TotalCiclos: 0,
      PromedioDuracion_mmss: "0:00",
      MejorTiempo_mmss: "0:00",
      PeorTiempo_mmss: "0:00",
      PromedioEspera_mmss: "0:00",
      PromedioPesoNeto: 0,
      PesoMinimo: 0,
      PesoMaximo: 0,
    };
  }
}

// Función para actualizar los indicadores KPI (tiempo y pesos)
async function updateKpiIndicadores() {
  try {
    const data = await fetchKpiIndicadores();

    // Actualizar los 8 indicadores KPI
    document.getElementById("total-ciclos").textContent = data.TotalCiclos || 0;
    document.getElementById("promedio-duracion").textContent =
      data.PromedioDuracion_mmss || "00:00";
    document.getElementById("mejor-tiempo").textContent =
      data.MejorTiempo_mmss || "00:00";
    document.getElementById("peor-tiempo").textContent =
      data.PeorTiempo_mmss || "00:00";
    document.getElementById("promedio-espera").textContent =
      data.PromedioEspera_mmss || "00:00";
    document.getElementById("peso-promedio").textContent = formatNumber(
      data.PromedioPesoNeto || 0
    );
    document.getElementById("peso-minimo").textContent = formatNumber(
      data.PesoMinimo || 0
    );
    document.getElementById("peso-maximo").textContent = formatNumber(
      data.PesoMaximo || 0
    );

    console.log("Indicadores KPI actualizados:", data);
  } catch (error) {
    console.error("Error updating KPI Indicadores:", error);
  }
}

// Función para actualizar los KPIs
async function updateKPIs() {
  try {
    const data = await fetchKPIs();

    // Mapear los datos del API a los elementos del DOM
    document.getElementById("produccion-total").textContent = formatNumber(
      data.ProduccionActualKg || 0
    );
    document.getElementById("cilindros-llenados").textContent = formatNumber(
      data.CilindrosActuales || 0
    );
    document.getElementById("rendimiento").textContent = `${formatNumber(
      data.RendimientoActual || 0
    )}%`;

    // Para Calidad, usaremos un valor por defecto ya que no viene en el API
    document.getElementById("calidad").textContent = "98.5%";

    // Actualizar variaciones
    document.getElementById("produccion-variacion").textContent =
      formatVariacion(data.VariacionProduccion || 0);
    document.getElementById("cilindros-variacion").textContent =
      formatVariacion(data.VariacionCilindros || 0);
    document.getElementById("rendimiento-variacion").textContent =
      formatVariacion(data.VariacionRendimiento || 0);
    document.getElementById("calidad-variacion").textContent = "+1.5%"; // Valor por defecto

    console.log("KPIs actualizados:", data);
  } catch (error) {
    console.error("Error updating KPIs:", error);
  }
}

// Función para formatear números
function formatNumber(num) {
  if (num === 0) return "0";
  if (num < 1) return num.toFixed(2);
  return num.toLocaleString("es-ES", { maximumFractionDigits: 1 });
}

// Función para formatear variaciones
function formatVariacion(variacion) {
  if (variacion === 0) return "0%";
  const signo = variacion > 0 ? "+" : "";
  return `${signo}${variacion.toFixed(1)}%`;
}

// Función para obtener datos de producción por semana
async function fetchProduccionPorSemana() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "24010020007",
    };

    console.log("Enviando petición Producción por Semana:", body);

    const response = await fetch(
      `${API_BASE_URL}/llenado_en_linea/consultaPorSemana`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error("No hay datos de producción disponibles");
    }
  } catch (error) {
    console.error("Error fetching producción por semana:", error);
    // Retornar datos de ejemplo en caso de error
    return [
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Lunes",
        KilosNetos: 0,
      },
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Martes",
        KilosNetos: 0,
      },
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Miércoles",
        KilosNetos: 0,
      },
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Jueves",
        KilosNetos: 0,
      },
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Viernes",
        KilosNetos: 0,
      },
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Sábado",
        KilosNetos: 0,
      },
      {
        FechaProduccion: new Date().toISOString(),
        DiaSemana: "Domingo",
        KilosNetos: 0,
      },
    ];
  }
}

// Función para generar datos completos de la semana
function generarDatosSemanaCompleta(datosAPI) {
  const diasSemana = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  const datosCompletos = [];

  // Crear un mapa de los datos recibidos por día
  const datosPorDia = {};
  datosAPI.forEach((item) => {
    datosPorDia[item.DiaSemana] = item.KilosNetos;
  });

  // Generar datos para todos los días de la semana
  diasSemana.forEach((dia) => {
    datosCompletos.push({
      dia: dia.substring(0, 3), // Abreviar a 3 caracteres
      cantidad: datosPorDia[dia] || 0, // 0 si no hay datos para ese día
    });
  });

  return datosCompletos;
}

// Función para obtener datos de kilos por turno
async function fetchKilosPorTurno() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "24010020007",
      tipoFiltro: obtenerTipoFiltro(filtrosActuales.tiempo),
    };

    console.log("Enviando petición Kilos por Turno:", body);

    const response = await fetch(`${API_BASE_URL}/kilos-turno`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error("No hay datos de turnos disponibles");
    }
  } catch (error) {
    console.error("Error fetching kilos por turno:", error);
    // Retornar datos de ejemplo en caso de error
    return [
      { turno: "DIA", KilosNetos: 0 },
      { turno: "TARDE", KilosNetos: 0 },
      { turno: "NOCHE", KilosNetos: 0 },
    ];
  }
}

// Función para generar datos completos de turnos
function generarDatosTurnosCompletos(datosAPI) {
  const turnosCompletos = ["DIA", "TARDE", "NOCHE"];
  const datosCompletos = [];

  // Crear un mapa de los datos recibidos por turno
  const datosPorTurno = {};
  datosAPI.forEach((item) => {
    datosPorTurno[item.turno] = item.KilosNetos;
  });

  // Generar datos para todos los turnos
  turnosCompletos.forEach((turno) => {
    datosCompletos.push({
      turno: turno,
      cantidad: datosPorTurno[turno] || 0, // 0 si no hay datos para ese turno
    });
  });

  return datosCompletos;
}

// Función para obtener datos de cilindros
async function fetchDatosCilindros() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "24010020007",
      tipoFiltro: obtenerTipoFiltro(filtrosActuales.tiempo),
    };

    console.log("Enviando petición Datos de Cilindros:", body);

    const response = await fetch(`${API_BASE_URL}/datos-cilindros`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error("No hay datos de cilindros disponibles");
    }
  } catch (error) {
    console.error("Error fetching datos de cilindros:", error);
  }
}

// Función para obtener parámetros de calidad
async function fetchParametrosCalidad() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "24010020007",
      tipoFiltro: obtenerTipoFiltro(filtrosActuales.tiempo),
    };

    console.log("Enviando petición Parámetros de Calidad:", body);

    const response = await fetch(`${API_BASE_URL}/parametros-calidad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0]; // Retornar el primer elemento del array
    } else {
      throw new Error("No hay datos de calidad disponibles");
    }
  } catch (error) {
    console.error("Error fetching parámetros de calidad:", error);
    // Retornar datos de ejemplo en caso de error
    return {
      Brix: 65,
      pH: 4.2,
      AcidityGLP: 5.1,
      Ratio: 14.2,
      PorcentajePulpa: 7.5,
    };
  }
}

// Parámetros nominales y tolerancias para cada indicador
const parametrosCalidad = {
  Brix: { nominal: 65, tolerancia: 1 },
  pH: { nominal: 4.5, tolerancia: 2.5 },
  AcidityGLP: { nominal: 5.25, tolerancia: 1.75 },
  Ratio: { nominal: 13.86, tolerancia: 4.46 },
  PorcentajePulpa: { nominal: 8, tolerancia: 2 },
};

// Función para calcular índice de calidad
function calcularIndiceCalidad(valor, parametro) {
  const config = parametrosCalidad[parametro];
  if (!config) return 0;

  const diferencia = Math.abs(valor - config.nominal);
  const indice = Math.max(0, 100 - (diferencia / config.tolerancia) * 100);
  return Math.round(indice * 100) / 100; // Redondear a 2 decimales
}

// Función para obtener color según el índice
function obtenerColorIndice(indice) {
  if (indice >= 80) return "rgba(34, 197, 94, 0.8)"; // Verde
  if (indice >= 50) return "rgba(249, 115, 22, 0.8)"; // Amarillo/Naranja
  return "rgba(239, 68, 68, 0.8)"; // Rojo
}

// Función para obtener color del borde según el índice
function obtenerColorBordeIndice(indice) {
  if (indice >= 80) return "rgb(34, 197, 94)"; // Verde
  if (indice >= 50) return "rgb(249, 115, 22)"; // Amarillo/Naranja
  return "rgb(239, 68, 68)"; // Rojo
}

// Función para procesar datos de calidad
function procesarDatosCalidad(datosAPI) {
  const parametros = ["Brix", "pH", "AcidityGLP", "Ratio", "PorcentajePulpa"];
  const datosProcesados = [];

  parametros.forEach((parametro) => {
    const valor = datosAPI[parametro] || 0;
    const indice = calcularIndiceCalidad(valor, parametro);

    datosProcesados.push({
      parametro: parametro,
      valor: valor,
      indice: indice,
      color: obtenerColorIndice(indice),
      colorBorde: obtenerColorBordeIndice(indice),
    });
  });

  return datosProcesados;
}

// Función para crear gráfico de producción por día
async function createProduccionChart() {
  const ctx = document.getElementById("produccionChart").getContext("2d");

  if (charts.produccion) {
    charts.produccion.destroy();
  }

  try {
    // Obtener datos reales del endpoint
    const datosAPI = await fetchProduccionPorSemana();
    const data = generarDatosSemanaCompleta(datosAPI);

    charts.produccion = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((item) => item.dia),
        datasets: [
          {
            label: "Producción (kg)",
            data: data.map((item) => item.cantidad),
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgb(59, 130, 246)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Producción: ${context.parsed.y.toLocaleString(
                  "es-ES"
                )} kg`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              callback: function (value) {
                return value.toLocaleString("es-ES") + " kg";
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });

    console.log("Gráfico de producción actualizado con datos reales:", data);
  } catch (error) {
    console.error("Error creando gráfico de producción:", error);

    // Fallback a datos de ejemplo si hay error
    const dataEjemplo = [
      { dia: "Lun", cantidad: 0 },
      { dia: "Mar", cantidad: 0 },
      { dia: "Mié", cantidad: 0 },
      { dia: "Jue", cantidad: 201.2 },
      { dia: "Vie", cantidad: 0 },
      { dia: "Sáb", cantidad: 0 },
      { dia: "Dom", cantidad: 0 },
    ];

    charts.produccion = new Chart(ctx, {
      type: "line",
      data: {
        labels: dataEjemplo.map((item) => item.dia),
        datasets: [
          {
            label: "Producción (kg)",
            data: dataEjemplo.map((item) => item.cantidad),
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }
}

// Función para crear gráfico de producción por turno
async function createTurnoChart() {
  const ctx = document.getElementById("turnoChart").getContext("2d");

  if (charts.turno) {
    charts.turno.destroy();
  }

  try {
    // Obtener datos reales del endpoint
    const datosAPI = await fetchKilosPorTurno();
    const data = generarDatosTurnosCompletos(datosAPI);

    charts.turno = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((item) => item.turno),
        datasets: [
          {
            data: data.map((item) => item.cantidad),
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)", // Verde para DIA
              "rgba(249, 115, 22, 0.8)", // Naranja para TARDE
              "rgba(147, 51, 234, 0.8)", // Púrpura para NOCHE
            ],
            borderColor: [
              "rgb(34, 197, 94)",
              "rgb(249, 115, 22)",
              "rgb(147, 51, 234)",
            ],
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value.toLocaleString(
                  "es-ES"
                )} kg (${percentage}%)`;
              },
            },
          },
        },
        cutout: "50%",
        animation: {
          animateRotate: true,
          animateScale: true,
        },
      },
    });

    console.log("Gráfico de turnos actualizado con datos reales:", data);
  } catch (error) {
    console.error("Error creando gráfico de turnos:", error);

    // Fallback a datos de ejemplo si hay error
    const dataEjemplo = [
      { turno: "DIA", cantidad: 201.2 },
      { turno: "TARDE", cantidad: 0 },
      { turno: "NOCHE", cantidad: 0 },
    ];

    charts.turno = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: dataEjemplo.map((item) => item.turno),
        datasets: [
          {
            data: dataEjemplo.map((item) => item.cantidad),
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)",
              "rgba(249, 115, 22, 0.8)",
              "rgba(147, 51, 234, 0.8)",
            ],
            borderColor: [
              "rgb(34, 197, 94)",
              "rgb(249, 115, 22)",
              "rgb(147, 51, 234)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }
}

// Función para actualizar tabla de cilindros
async function updateCilindrosTable() {
  const tbody = document.getElementById("cilindrosTableBody");
  tbody.innerHTML = "";

  try {
    // Obtener datos reales del endpoint
    const data = await fetchDatosCilindros();

    if (data.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        <i class="fas fa-database text-2xl mb-2"></i>
                        <p>No hay datos de cilindros disponibles</p>
                    </td>
                </tr>
            `;
      return;
    }

    data.forEach((cilindro) => {
      const row = document.createElement("tr");
      const estadoClass = getEstadoClass(cilindro.Estado);

      row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                  cilindro.cod_cilindro
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  cilindro.Peso
                }</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoClass}">
                        ${cilindro.Estado}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(
                  cilindro.FechaProduccion
                )}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  cilindro.TiempoLlenado
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                  cilindro.Lote
                }</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 mr-3" onclick="verDetalleCilindro('${
                      cilindro.cod_cilindro
                    }')">
                        <i class="fas fa-eye mr-1"></i>Ver
                    </button>
                    <button class="text-red-600 hover:text-red-900" onclick="editarCilindro('${
                      cilindro.cod_cilindro
                    }')">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    console.log("Tabla de cilindros actualizada con datos reales:", data);
  } catch (error) {
    console.error("Error actualizando tabla de cilindros:", error);

    // Mostrar mensaje de error
    tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Error al cargar datos de cilindros</p>
                    <p class="text-sm">Verifica la conexión e intenta nuevamente</p>
                </td>
            </tr>
        `;
  }
}

// Funciones auxiliares para acciones de cilindros
function verDetalleCilindro(codigo) {
  console.log("Ver detalle del cilindro:", codigo);
  // Aquí puedes implementar la funcionalidad para ver detalles
  alert(`Ver detalles del cilindro: ${codigo}`);
}

function editarCilindro(codigo) {
  console.log("Editar cilindro:", codigo);
  // Aquí puedes implementar la funcionalidad para editar
  alert(`Editar cilindro: ${codigo}`);
}

// Función para crear radar chart de calidad
async function createCalidadChart() {
  const ctx = document.getElementById("calidadChart").getContext("2d");

  if (charts.calidad) {
    charts.calidad.destroy();
  }

  try {
    // Obtener datos reales del endpoint
    const datosAPI = await fetchParametrosCalidad();
    const datosProcesados = procesarDatosCalidad(datosAPI);

    // Preparar datos para el gráfico
    const labels = datosProcesados.map((item) => item.parametro);
    const indices = datosProcesados.map((item) => item.indice);
    const colores = datosProcesados.map((item) => item.color);
    const coloresBorde = datosProcesados.map((item) => item.colorBorde);

    charts.calidad = new Chart(ctx, {
      type: "radar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Índice de Calidad (%)",
            data: indices,
            backgroundColor: "rgba(147, 51, 234, 0.1)",
            borderColor: "rgba(147, 51, 234, 1)",
            borderWidth: 2,
            pointBackgroundColor: colores,
            pointBorderColor: coloresBorde,
            pointBorderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 10,
            pointHoverBackgroundColor: colores,
            pointHoverBorderColor: coloresBorde,
            pointHoverBorderWidth: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            min: 0,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            angleLines: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            pointLabels: {
              font: {
                size: 12,
                weight: "bold",
              },
              color: "#374151",
            },
            ticks: {
              font: {
                size: 10,
              },
              color: "#6B7280",
              stepSize: 20,
              callback: function (value) {
                return value + "%";
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: function (context) {
                return context[0].label;
              },
              label: function (context) {
                const indice = context.parsed.r;
                const datos = datosProcesados[context.dataIndex];
                const config = parametrosCalidad[datos.parametro];

                return [
                  `Valor Real: ${datos.valor}`,
                  `Índice de Calidad: ${indice}%`,
                  `Nominal: ${config.nominal}`,
                  `Tolerancia: ±${config.tolerancia}`,
                ];
              },
              afterLabel: function (context) {
                const indice = context.parsed.r;
                if (indice >= 80) return "Estado: Excelente";
                if (indice >= 50) return "Estado: Bueno";
                return "Estado: Requiere Atención";
              },
            },
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: "#374151",
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
          },
        },
        animation: {
          duration: 2000,
          easing: "easeInOutQuart",
        },
        interaction: {
          intersect: false,
        },
      },
    });

    console.log(
      "Gráfico de calidad actualizado con datos reales:",
      datosProcesados
    );
  } catch (error) {
    console.error("Error creando gráfico de calidad:", error);

    // Fallback a datos de ejemplo si hay error
    const datosEjemplo = [
      {
        parametro: "Brix",
        valor: 65,
        indice: 100,
        color: "rgba(34, 197, 94, 0.8)",
        colorBorde: "rgb(34, 197, 94)",
      },
      {
        parametro: "pH",
        valor: 4.2,
        indice: 88,
        color: "rgba(34, 197, 94, 0.8)",
        colorBorde: "rgb(34, 197, 94)",
      },
      {
        parametro: "AcidityGLP",
        valor: 5.1,
        indice: 91,
        color: "rgba(34, 197, 94, 0.8)",
        colorBorde: "rgb(34, 197, 94)",
      },
      {
        parametro: "Ratio",
        valor: 14.2,
        indice: 92,
        color: "rgba(34, 197, 94, 0.8)",
        colorBorde: "rgb(34, 197, 94)",
      },
      {
        parametro: "PorcentajePulpa",
        valor: 7.5,
        indice: 75,
        color: "rgba(249, 115, 22, 0.8)",
        colorBorde: "rgb(249, 115, 22)",
      },
    ];

    const labels = datosEjemplo.map((item) => item.parametro);
    const indices = datosEjemplo.map((item) => item.indice);
    const colores = datosEjemplo.map((item) => item.color);
    const coloresBorde = datosEjemplo.map((item) => item.colorBorde);

    charts.calidad = new Chart(ctx, {
      type: "radar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Índice de Calidad (%)",
            data: indices,
            backgroundColor: "rgba(147, 51, 234, 0.1)",
            borderColor: "rgba(147, 51, 234, 1)",
            borderWidth: 2,
            pointBackgroundColor: colores,
            pointBorderColor: coloresBorde,
            pointBorderWidth: 3,
            pointRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }
}

// Función para actualizar tabla de calidad
function updateCalidadTable(data) {
  const tbody = document.getElementById("calidadTableBody");
  tbody.innerHTML = "";

  data.inspecciones.forEach((inspeccion) => {
    const row = document.createElement("tr");
    const resultadoClass =
      inspeccion.resultado === "Aprobado"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";

    row.innerHTML = `
            <td class="px-4 py-2 text-sm text-gray-900">${formatDate(
              inspeccion.fecha
            )}</td>
            <td class="px-4 py-2 text-sm text-gray-900">${
              inspeccion.cilindro
            }</td>
            <td class="px-4 py-2 text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${resultadoClass}">
                    ${inspeccion.resultado}
                </span>
            </td>
            <td class="px-4 py-2 text-sm text-gray-900">${
              inspeccion.inspector
            }</td>
        `;
    tbody.appendChild(row);
  });
}

// Función para obtener las últimas inspecciones
async function fetchUltimasInspecciones() {
  try {
    // Preparar el cuerpo de la petición con los filtros actuales
    const body = {
      idempresa: filtrosActuales.empresa || "agromarnsr",
      idsucursal: filtrosActuales.sucursal || "003",
      idproducto: filtrosActuales.productoId || "24010020007",
      tipoFiltro: obtenerTipoFiltro(filtrosActuales.tiempo),
    };

    console.log("Enviando petición para las Últimas Inspecciones:", body);

    const response = await fetch(`${API_BASE_URL}/datos-calidad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error("No hay datos de inspecciones disponibles");
    }
  } catch (error) {
    console.error("Error fetching las últimas inspecciones:", error);
    // Retornar datos de ejemplo en caso de error
    return [
      {
        FechaCreacion: new Date().toISOString(),
        Batch: "Lote de Ejemplo",
        Estado: "Aprobado",
        UsuarioCreacion: "Usuario de Ejemplo",
      },
    ];
  }
}

// Función para actualizar la tabla de últimas inspecciones
async function updateUltimasInspeccionesTable() {
  const data = await fetchUltimasInspecciones();
  const tbody = document.getElementById("calidadTableBody");
  tbody.innerHTML = "";

  data.forEach((inspeccion) => {
    const row = document.createElement("tr");

    row.innerHTML = `
            <td class="px-4 py-2 text-sm text-gray-900">${formatDate(
              inspeccion.FechaCreacion
            )}</td>
            <td class="px-4 py-2 text-sm text-gray-900">${
              inspeccion.Batch || "N/A"
            }</td>
            <td class="px-4 py-2 text-sm text-gray-900">${
              inspeccion.Estado
            }</td>
            <td class="px-4 py-2 text-sm text-gray-900">${
              inspeccion.UsuarioCreacion || "N/A"
            }</td>
        `;
    tbody.appendChild(row);
  });
}

// Función para crear gráfico de producción por sucursal
function createSucursalChart(data) {
  const ctx = document.getElementById("sucursalChart").getContext("2d");

  if (charts.sucursal) {
    charts.sucursal.destroy();
  }

  charts.sucursal = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.sucursales.map((item) => item.nombre),
      datasets: [
        {
          label: "Producción",
          data: data.sucursales.map((item) => item.produccion),
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(249, 115, 22, 0.8)",
            "rgba(59, 130, 246, 0.8)",
          ],
          borderColor: [
            "rgb(34, 197, 94)",
            "rgb(249, 115, 22)",
            "rgb(59, 130, 246)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

// Funciones auxiliares
function getEstadoClass(estado) {
  const estados = {
    Lleno: "bg-green-100 text-green-800",
    Vacio: "bg-gray-100 text-gray-800",
    "En Proceso": "bg-blue-100 text-blue-800",
    Mantenimiento: "bg-yellow-100 text-yellow-800",
  };
  return estados[estado] || "bg-gray-100 text-gray-800";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Función principal para cargar todos los datos
async function loadDashboardData() {
  try {
    // Actualizar KPIs con datos reales del endpoint
    await updateKPIs();

    // Actualizar indicadores KPI (tiempo y pesos) con datos reales del endpoint
    await updateKpiIndicadores();

    // Cargar gráfico de producción por día con datos reales
    await createProduccionChart();

    // Cargar gráfico de producción por turno con datos reales
    await createTurnoChart();

    // Cargar datos de cilindros con datos reales
    await updateCilindrosTable();

    // Cargar gráfico de calidad con datos reales
    await createCalidadChart();

    // Cargar tabla de calidad (usar datos mock por ahora)
    //const calidadData = await fetchData('/calidad');
    await updateUltimasInspeccionesTable();

    // Cargar datos comparativos (usar datos mock por ahora)
    //const comparativosData = await fetchData('/comparativos');
    //createSucursalChart(comparativosData);;

    console.log("Dashboard cargado exitosamente");
  } catch (error) {
    console.error("Error cargando datos del dashboard:", error);
  }
}

// Función para refrescar datos cada 30 segundos
function startAutoRefresh() {
  if (autoRefreshId) {
    clearInterval(autoRefreshId);
  }
  autoRefreshId = setInterval(loadDashboardData, 30000);
}

// Inicializar el dashboard cuando se carga la página
document.addEventListener("DOMContentLoaded", function () {
  loadDashboardData();
  startAutoRefresh();

  // Agregar efecto de hover a las tarjetas
  const cards = document.querySelectorAll(".card-hover");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
      this.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "none";
    });
  });

  // Event Listeners para filtros
  setupFilterEventListeners();
});

function openNav() {
  document.getElementById("sidebar").style.width = "250px";
}

function closeNav() {
  document.getElementById("sidebar").style.width = "0";
}

// Función para configurar todos los event listeners de filtros
function setupFilterEventListeners() {
  // Toggle de filtros
  const toggleFiltros = document.getElementById("toggleFiltros");
  const cerrarFiltrosBtn = document.getElementById("cerrarFiltros");

  const filtrosSection = document.getElementById("filtrosSection");
  const filtroIcon = document.getElementById("filtroIcon");

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

  if (cerrarFiltrosBtn) {
    cerrarFiltrosBtn.addEventListener("click", ocultarFiltros);
  }

  // Filtro de empresa
  const empresaFilter = document.getElementById("empresaFilter");
  if (empresaFilter) {
    empresaFilter.addEventListener("change", function () {
      cargarProductosPorEmpresa(this.value);
    });
  }

  // Botones del filtro de producto
  const abrirProductosBtn = document.getElementById("abrirProductos");
  const limpiarProductoBtn = document.getElementById("limpiarProducto");

  if (abrirProductosBtn) {
    abrirProductosBtn.addEventListener("click", abrirModalProductos);
  }

  if (limpiarProductoBtn) {
    limpiarProductoBtn.addEventListener("click", limpiarProductoSeleccionado);
  }

  // Event listeners del modal de productos
  const cerrarModalBtn = document.getElementById("cerrarModalProductos");
  const cancelarSeleccionBtn = document.getElementById("cancelarSeleccion");
  const buscarProductoModal = document.getElementById("buscarProductoModal");
  const limpiarBusquedaModalBtn = document.getElementById(
    "limpiarBusquedaModal"
  );

  if (cerrarModalBtn) {
    cerrarModalBtn.addEventListener("click", cerrarModalProductos);
  }

  if (cancelarSeleccionBtn) {
    cancelarSeleccionBtn.addEventListener("click", cerrarModalProductos);
  }

  if (buscarProductoModal) {
    buscarProductoModal.addEventListener("input", filtrarProductosEnModal);
  }

  if (limpiarBusquedaModalBtn) {
    limpiarBusquedaModalBtn.addEventListener("click", function () {
      document.getElementById("buscarProductoModal").value = "";
      filtrarProductosEnModal();
    });
  }

  // Cerrar modal al hacer click fuera
  const modalProductos = document.getElementById("modalProductos");
  if (modalProductos) {
    modalProductos.addEventListener("click", function (event) {
      if (event.target === modalProductos) {
        cerrarModalProductos();
      }
    });
  }

  // Filtro de tiempo
  const tiempoFilter = document.getElementById("tiempoFilter");
  const fechasPersonalizadas = document.getElementById("fechasPersonalizadas");

  if (tiempoFilter && fechasPersonalizadas) {
    tiempoFilter.addEventListener("change", function () {
      if (this.value === "personalizado") {
        fechasPersonalizadas.classList.remove("hidden");
      } else {
        fechasPersonalizadas.classList.add("hidden");
      }
    });
  }

  // Botones de acción principales
  const aplicarFiltrosBtn = document.getElementById("aplicarFiltros");
  const limpiarFiltrosBtn = document.getElementById("limpiarFiltros");

  if (aplicarFiltrosBtn) {
    aplicarFiltrosBtn.addEventListener("click", aplicarFiltros);
  }

  if (limpiarFiltrosBtn) {
    limpiarFiltrosBtn.addEventListener("click", limpiarFiltros);
  }

  // Configurar estado inicial de los filtros
  setTimeout(async () => {
    const filtrosSection = document.getElementById("filtrosSection");
    const toggleBtn = document.getElementById("toggleFiltros");

    // Asegurar que los filtros estén ocultos inicialmente
    filtrosSection.classList.add("oculto");
    filtrosSection.classList.remove("visible");
    toggleBtn.innerHTML = '<i class="fas fa-filter text-lg"></i>';
    filtrosVisibles = false;

    // Establecer valores por defecto en los filtros
    document.getElementById("empresaFilter").value = "agromarnsr";
    document.getElementById("sucursalFilter").value = "003";
    document.getElementById("tiempoFilter").value = "mes";

    // Actualizar filtros actuales con valores por defecto
    filtrosActuales.empresa = "agromarnsr";
    filtrosActuales.sucursal = "003";
    filtrosActuales.tiempo = "mes";
    filtrosActuales.productoId = "21000030115";

    // Obtener fechas según el período por defecto
    const fechas = obtenerFechasPorTiempo("mes");
    filtrosActuales.fechaInicio = fechas.inicio;
    filtrosActuales.fechaFin = fechas.fin;

    // Cargar productos por defecto
    await cargarProductosPorEmpresa("agromarnsr");

    // Buscar el producto por defecto y establecer su descripción
    const productoPorDefecto = productosDisponibles.find(
      (p) => p.idproducto === "21000030115"
    );
    if (productoPorDefecto) {
      document.getElementById("productoFilter").value =
        productoPorDefecto.descripcion;
      filtrosActuales.producto = productoPorDefecto.descripcion;
    }

    // Actualizar texto de filtros activos
    actualizarFiltrosActivos();
  }, 100);
}
