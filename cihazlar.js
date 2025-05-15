const API_BASE = "https://raspi5-mese-iot.mesebilisim.com";
const TOKEN = localStorage.getItem("token");

if (!TOKEN) window.location.href = "login.html";

const cihazIdMap = {
  "AracTakip": "c67edcc0-2821-11f0-80d8-0397a884a69d",
  "Deneme": "b89545f0-2fd7-11f0-9db0-7d98fa25fbcc",
  "Thermostat": "59085ad0-193b-11f0-83e2-ab8541a540e2",
  "Default": "56d32b50-193b-11f0-83e2-ab8541a540e2"
};

const deviceSelect = document.getElementById("device-select");
const loadingIndicator = document.getElementById("loading-indicator");
const dashboard = document.getElementById("dashboard");
const widgetsRow = document.getElementById("widgets-row");
const dataTableBody = document.getElementById("data-table-body");
const lastUpdated = document.getElementById("last-updated");
const refreshBtn = document.getElementById("refresh-btn");

const lastDataPoints = [];
const maxTableRows = 10;
let intervalId = null;
let activeKeys = [];

document.querySelector(".cıkıs-buton").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

document.addEventListener("DOMContentLoaded", () => {
  for (const name in cihazIdMap) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    deviceSelect.appendChild(option);
  }
  startDataPolling();
});

deviceSelect.addEventListener("change", startDataPolling);
refreshBtn.addEventListener("click", () => fetchDeviceData(true));

function startDataPolling() {
  if (intervalId) clearInterval(intervalId);
  widgetsRow.innerHTML = "";
  dataTableBody.innerHTML = "";
  lastDataPoints.length = 0;
  fetchDeviceData(true);
  intervalId = setInterval(fetchDeviceData, 1000);
}

function getRandom(min, max) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

async function fetchDeviceData(first = false) {
  const selectedDeviceName = deviceSelect.value;
  const deviceId = cihazIdMap[selectedDeviceName];
  if (!deviceId) return;

  if (first) {
    loadingIndicator.style.display = "block";
    dashboard.style.display = "none";
    activeKeys = await fetchTelemetryKeys(deviceId);
    if (activeKeys.length === 0) {
      activeKeys = ["temperature", "humidity", "pressure"];
    }
  }

  const keysParam = activeKeys.join(",");

  try {
    const response = await fetch(`${API_BASE}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keysParam}`, {
      headers: { "X-Authorization": `Bearer ${TOKEN}` }
    });

    let telemetry = {};
    if (response.ok) {
      telemetry = await response.json();
    }

    const now = new Date().toLocaleTimeString();
    const data = { timestamp: now };

    activeKeys.forEach((key) => {
      const realVal = telemetry[key]?.[0]?.value;
      const fallback = {
        temperature: getRandom(15, 35),
        humidity: getRandom(40, 80),
        pressure: getRandom(950, 1050)
      }[key] || getRandom(0, 100);

      data[key] = isNaN(realVal) || realVal === undefined
        ? fallback
        : parseFloat(realVal).toFixed(2);
    });

    updateWidgets(activeKeys, data);
    updateDataTable(activeKeys, data);
    lastUpdated.textContent = `Son güncelleme: ${now}`;
  } finally {
    if (first) {
      loadingIndicator.style.display = "none";
      dashboard.style.display = "block";
    }
  }
}

async function fetchTelemetryKeys(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`, {
      headers: { "X-Authorization": `Bearer ${TOKEN}` }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function updateWidgets(keys, data) {
  widgetsRow.innerHTML = "";
  keys.forEach((key) => {
    const div = document.createElement("div");
    div.className = "widget";
    div.innerHTML = `
      <div class="widget-header">
        <h3>${key}</h3>
        <span class="timestamp">${data.timestamp}</span>
      </div>
      <div class="widget-content">
        <div class="value">${data[key]}</div>
      </div>
    `;
    widgetsRow.appendChild(div);
  });
}

function updateDataTable(keys, data) {
  lastDataPoints.unshift(data);
  if (lastDataPoints.length > maxTableRows) lastDataPoints.pop();
  dataTableBody.innerHTML = "";
  lastDataPoints.forEach(point => {
    keys.forEach(key => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${key}</td>
        <td>${point[key]}</td>
        <td>${point.timestamp}</td>
      `;
      dataTableBody.appendChild(row);
    });
  });
}
