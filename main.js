let mapa = L.map("mapa").setView([4.609315965894516, -74.07217238043984], 15);

// Cargar capa base
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(mapa);

// Icono base
const iconoBase = L.icon({
  iconUrl: "punto_base.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});
L.marker([4.609315965894516, -74.07217238043984], { icon: iconoBase }).addTo(mapa).bindPopup(`
  <div class="popup-vivefy">
    <b>Fakedoor:</b> Boheme 10/22<br>
    <b>Localidad:</b> Santafe<br>
    <b>Área:</b> 25 - 32 - 40 m²<br>
    <b>Precio m²:</b> $9mm<br>
    <b>Ticket:</b> $225mm a $360mm<br>
    <b>Leads:</b> 89<br>
    <b>Perfilados:</b> 34<br>
    <b>Potenciales:</b> 10<br>
    <b>CPL:</b> $13.085<br>
    <b>Campaña:</b> $1.151.496
  </div>
`);

let marcadores = [];
let globalData = [];

// Cargar datos
fetch("data.json")
  .then((res) => res.json())
  .then((data) => {
    globalData = data;

    const distanciasPersonalizadas = [
      "<100m",
      "100m-200m",
      "200m-500m",
      "500m-1km",
      "1km-1.5km",
      "1.5km-2km",
      ">2km"
    ];

    crearCheckboxes("filtro-distancia", distanciasPersonalizadas);
    crearCheckboxes("filtro-distancia-usados", distanciasPersonalizadas);

    crearCheckboxes("filtro-segmento", [...new Set(data.map((d) => d.Segmento))].sort());
    crearCheckboxes("filtro-categoria", [...new Set(data.map((d) => d.Categoría))].sort());

    document.querySelectorAll(".scroll-box input[type='checkbox']").forEach((input) =>
      input.addEventListener("change", () => actualizarMapa(data))
    );

    actualizarMapa(data);
  });

function crearCheckboxes(id, valores) {
  const contenedor = document.getElementById(id);

  const labelTodos = document.createElement("label");
  labelTodos.innerHTML = `<input type="checkbox" class="check-todos" checked> Todos`;
  contenedor.appendChild(labelTodos);

  valores.forEach((v) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${v}" class="check-item" checked> ${v}`;
    contenedor.appendChild(label);
  });

  labelTodos.querySelector("input").addEventListener("change", (e) => {
    const checked = e.target.checked;
    contenedor.querySelectorAll(".check-item").forEach((cb) => (cb.checked = checked));
    actualizarMapa(globalData);
  });

  contenedor.querySelectorAll(".check-item").forEach((cb) => {
    cb.addEventListener("change", () => {
      const todos = contenedor.querySelector(".check-todos");
      const items = contenedor.querySelectorAll(".check-item");
      const activos = contenedor.querySelectorAll(".check-item:checked");
      todos.checked = items.length === activos.length;
      actualizarMapa(globalData);
    });
  });
}

function obtenerValoresSeleccionados(id) {
  return Array.from(document.querySelectorAll(`#${id} input:checked`)).map((cb) => cb.value);
}

function cumpleRangoDistancia(rango, d) {
  if (rango === "<100m") return d < 0.1;
  if (rango === "100m-200m") return d >= 0.1 && d <= 0.2;
  if (rango === "200m-500m") return d > 0.2 && d <= 0.5;
  if (rango === "500m-1km") return d > 0.5 && d <= 1;
  if (rango === "1km-1.5km") return d > 1 && d <= 1.5;
  if (rango === "1.5km-2km") return d > 1.5 && d <= 2;
  if (rango === ">2km") return d > 2;
  return false;
}

function actualizarMapa(data) {
  marcadores.forEach((m) => mapa.removeLayer(m));
  marcadores = [];

  const distancias = obtenerValoresSeleccionados("filtro-distancia");
  const segmentos = obtenerValoresSeleccionados("filtro-segmento");
  const categorias = obtenerValoresSeleccionados("filtro-categoria");

  const filtrados = data.filter((p) => {
    const d = p["Distancia (km)"];
    const cumpleDistancia = distancias.some((rango) => cumpleRangoDistancia(rango, d));
    return cumpleDistancia && segmentos.includes(p.Segmento) && categorias.includes(p.Categoría);
  });

  function colorPorDistancia(d) {
    if (d < 0.1) return "#43bee0";
    if (d <= 0.2) return "#156dcc";
    if (d <= 0.5) return "#002b53";
    if (d <= 1) return "#002baf";
    if (d <= 1.5) return "#2b84a9";
    if (d <= 2) return "#1079e9";
    return "#3d9adf";
  }

  filtrados.forEach((p) => {
    const popup = `
      <div class="popup-vivefy">
        <b>Distancia:</b> ${p["Distancia (km)"].toFixed(2)} km<br>
        <b>Nombre:</b> ${p.Nombre}<br>
        <b>Segmento:</b> ${p.Segmento}<br>
        <b>Categoría:</b> ${p.Categoría}<br>
        <b>Ubicación:</b> <a href="${p.Enlace}" target="_blank">Google Maps</a>
      </div>
    `;
    const color = colorPorDistancia(p["Distancia (km)"]);
    const marker = L.circleMarker([p.Latitud, p.Longitud], {
      radius: 5,
      color: color,
      fillColor: color,
      fillOpacity: 0.8,
    }).bindPopup(popup);
    marker.addTo(mapa);
    marcadores.push(marker);
  });
}

document.querySelectorAll(".acordeon-titulo").forEach((btn) => {
  btn.addEventListener("click", () => {
    const grupo = btn.parentElement;
    grupo.classList.toggle("abierto");
  });
});

// === LOCALES USADOS ===
let marcadoresUsados = [];

function colorPorAntiguedad(a, tipo) {
  if (tipo === "arriendo") {
    if (a === "menor a 1 año") return "#a9e5bb";
    if (a === "1 a 8 años") return "#3ddc97";
    if (a === "9 a 15 años") return "#31c487";
    if (a === "16 a 30 años") return "#2aad76";
    if (a === "más de 30 años") return "#1e8e66";
  } else {
    if (a === "menor a 1 año") return "#ff6b6b";
    if (a === "1 a 8 años") return "#f07c2f";
    if (a === "9 a 15 años") return "#ffc857";
    if (a === "16 a 30 años") return "#f9a03f";
    if (a === "más de 30 años") return "#c84c09";
  }
  return "#999";
}

fetch("data_usados.json")
  .then((res) => res.json())
  .then((usados) => {
    const antiguedades = [...new Set(usados.map((d) => d["antiguedad_real"]))].sort();
    crearCheckboxes("filtro-antiguedad", antiguedades);

    document.querySelectorAll("#filtro-antiguedad input[type='checkbox']").forEach((input) =>
      input.addEventListener("change", () => actualizarUsados(usados))
    );

    document.querySelectorAll("#filtro-distancia-usados input[type='checkbox']").forEach((input) =>
      input.addEventListener("change", () => actualizarUsados(usados))
    );

    actualizarUsados(usados);
  });

function actualizarUsados(data) {
  marcadoresUsados.forEach((m) => mapa.removeLayer(m));
  marcadoresUsados = [];

  const antiguedades = obtenerValoresSeleccionados("filtro-antiguedad");
  const distancias = obtenerValoresSeleccionados("filtro-distancia-usados");

  const filtrados = data.filter((p) => {
    const d = p["Distancia (km)"];
    const cumpleDistancia = distancias.some((rango) => cumpleRangoDistancia(rango, d));
    return cumpleDistancia && antiguedades.includes(p["antiguedad_real"]);
  });

  filtrados.forEach((p) => {
    const tipoLimpio = (p["tipo_operacion"] || "").toLowerCase().replace(/\s+/g, "").trim();
    const popup = `
      <div class="popup-vivefy">
        <b>Distancia:</b> ${p["Distancia (km)"].toFixed(2)} km<br>
        <b>Nombre:</b> ${p.nombre}<br>
        <b>Antigüedad:</b> ${p["antiguedad_real"]}<br>
        <b>Venta / Renta:</b> ${p["tipo_operacion"]}<br>
        <b>Barrio:</b> ${p.barrio}<br>
        <b>Área:</b> ${p.area} m²<br>
        <b>Precio:</b> ${p.precio}<br>
        <b>Precio m²:</b> ${p.precioM2}<br>
        <b>Ubicación:</b> <a href="${p.url}" target="_blank">Ver publicación</a>
      </div>
    `;
    const color = colorPorAntiguedad(p["antiguedad_real"], tipoLimpio);
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 5,
      color: color,
      fillColor: color,
      fillOpacity: 0.8,
    }).bindPopup(popup);

    marker.addTo(mapa);
    marcadoresUsados.push(marker);
  });
}
