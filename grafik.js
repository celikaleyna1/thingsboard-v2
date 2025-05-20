const chartData = {
  labels: [], 
  datasets: {} 
};


google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(onGoogleChartsLoaded);

let chart = null;
let chartOptions = null;


const chartColors = {
  temperature: 'red', 
  humidity: 'blue',    
  pressure: 'orange',        
};


function onGoogleChartsLoaded() {
  
  chartOptions = {
    title: 'Cihaz Telemetri Verileri',
    curveType: 'function',
    legend: { position: 'top' },
    chartArea: { width: '85%', height: '70%' },
    hAxis: {
      title: 'Zaman',
      textStyle: { fontSize: 10 }
    },
    vAxis: {
      title: 'Değer'
    },
    animation: {
      duration: 500,
      easing: 'out',
      startup: true
    },
    colors: Object.values(chartColors)
  };
}

function initializeChart(keys) {
  const chartContainer = document.getElementById('device-chart-container');
  if (!chartContainer) {
    console.error('Chart container bulunamadı!');
    return;
  }

  const dataTable = new google.visualization.DataTable();

  dataTable.addColumn('string', 'Zaman');
  
 
  keys.forEach(key => {
    dataTable.addColumn('number', key);
  });
 
  dataTable.addRow(['', ...Array(keys.length).fill(null)]);
  
  chart = new google.visualization.LineChart(chartContainer);
  chart.draw(dataTable, chartOptions);

  chartData.labels = [];
  chartData.datasets = {};
  keys.forEach(key => chartData.datasets[key] = []);
}

function updateChart(keys, data) {
  if (!chart) return;
 
  chartData.labels.push(data.timestamp);
  if (chartData.labels.length > 20) {
    chartData.labels.shift();
  }
  
  keys.forEach(key => {
    if (!chartData.datasets[key]) {
      chartData.datasets[key] = [];
    }
    
    chartData.datasets[key].push(parseFloat(data[key]));
    if (chartData.datasets[key].length > 20) {
      chartData.datasets[key].shift();
    }
  });

  const dataTable = new google.visualization.DataTable();
  dataTable.addColumn('string', 'Zaman');

  keys.forEach(key => {
    dataTable.addColumn('number', key);
  });
  
  chartData.labels.forEach((timestamp, i) => {
    const row = [timestamp];
  
    keys.forEach(key => {
      row.push(chartData.datasets[key][i]);
    });
    dataTable.addRow(row);
  });

  chart.draw(dataTable, chartOptions);
}

const originalFetchDeviceData = fetchDeviceData;
fetchDeviceData = async function(first = false) {
  await originalFetchDeviceData(first);
  
  if (first && activeKeys.length > 0 && google.visualization && google.visualization.LineChart) {
    initializeChart(activeKeys);
  }

  if (lastDataPoints.length > 0 && chart) {
    updateChart(activeKeys, lastDataPoints[0]);
  }
};

document.addEventListener("DOMContentLoaded", function() {

  const dashboardElement = document.getElementById('dashboard');
  

  const chartWidget = document.createElement('div');
  chartWidget.className = 'widget';
  chartWidget.style.height = '400px';
  chartWidget.style.marginBottom = '20px';
  chartWidget.innerHTML = `
    <div class="widget-header">
      <h3>Telemetri Grafiği</h3>
    </div>
    <div class="widget-content" style="height: 350px;">
      <div id="device-chart-container" style="width: 100%; height: 100%;"></div>
    </div>
  `;

  const widgetsRow = document.getElementById('widgets-row');
  dashboardElement.insertBefore(chartWidget, widgetsRow.nextSibling);
 
  const originalPdfClick = document.getElementById("pdfAktar").onclick;
  document.getElementById("pdfAktar").onclick = function() {
    if (originalPdfClick) originalPdfClick.call(this);
   
    if (chart) {
      setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text("Cihaz Telemetri Grafigi", 14, 120);
        
        try {
          const chartDiv = document.getElementById('device-chart-container');
          const chartImg = chartDiv.getElementsByTagName('svg')[0];
          
          if (chartImg) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const data = new XMLSerializer().serializeToString(chartImg);
            const DOMURL = window.URL || window.webkitURL || window;
            const img = new Image();
            const svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            const url = DOMURL.createObjectURL(svgBlob);
            
            img.onload = function() {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              const imgData = canvas.toDataURL('image/png');
              doc.addImage(imgData, 'PNG', 10, 130, 180, 100);
              doc.save(`${deviceSelect.value}_grafik.pdf`);
              DOMURL.revokeObjectURL(url);
            };
            
            img.src = url;
          } else {
            doc.text("Grafik resmi eklenemedi", 14, 140);
            doc.save(`${deviceSelect.value}_grafik.pdf`);
          }
        } catch (err) {
          console.error("PDF oluşturma hatası:", err);
          doc.text("Grafik eklenirken hata oluştu", 14, 140);
          doc.save(`${deviceSelect.value}_grafik.pdf`);
        }
      }, 300);
    }
  };
  
  const originalExcelClick = document.getElementById("excelbtn").onclick;
  document.getElementById("excelbtn").onclick = function() {
    if (originalExcelClick) originalExcelClick.call(this);
    
    if (chartData.labels.length > 0) {
      const graphWS = XLSX.utils.aoa_to_sheet([
        ["Grafik Verileri - " + deviceSelect.value],
        ["Zaman"].concat(activeKeys)
      ]);
      
      const rows = chartData.labels.map((time, i) => {
        const row = [time];
        activeKeys.forEach(key => {
          row.push(chartData.datasets[key][i]);
        });
        return row;
      });

      XLSX.utils.sheet_add_aoa(graphWS, rows, {origin: 2});

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, graphWS, "Grafik Verileri");
   
      XLSX.writeFile(wb, `${deviceSelect.value}_grafik_verileri.xlsx`);
    }
  };
});