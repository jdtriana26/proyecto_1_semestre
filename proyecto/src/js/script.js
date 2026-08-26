const LIMITE_FOB_4X4 = 400;
const LIMITE_CANTIDAD_4X4 = 4;
const LIMITE_ENVIOS_4X4 = 4;
const ARANCEL_FIJO_4X4 = 20;
const FODINFA_PORCENTAJE = 0.005;
const IVA_PORCENTAJE = 0.15;

const arancelesPorCategoria = {
  electronica: 0.10,
  ropa: 0.20,
  hogar: 0.15,
  otros: 0.20,
};

const form = document.getElementById('form-4x4');
const modalEl = document.getElementById('modal-resultado');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
let chartInstance = null;
let datosUltimoCalculo = null;

function leerDatosFormulario() {
  const valorICE = document.getElementById('icePorcentaje').value;
  return {
    valorFOB: parseFloat(document.getElementById('valorFOB').value) || 0,
    cantidad: parseInt(document.getElementById('cantidad').value, 10) || 0,
    categoria: document.getElementById('categoria').value || 'otros',
    enviosPrevios: parseInt(document.getElementById('enviosPrevios').value, 10) || 0,
    flete: parseFloat(document.getElementById('flete').value) || 0,
    seguro: parseFloat(document.getElementById('seguro').value) || 0,
    icePorcentaje: valorICE === '' ? 0 : (parseFloat(valorICE) || 0),
  };
}

function evaluarCalificacion(cantidad, valorFOB, enviosPrevios) {
  const p1 = cantidad <= LIMITE_CANTIDAD_4X4;
  const p2 = valorFOB <= LIMITE_FOB_4X4;
  const p3 = enviosPrevios < LIMITE_ENVIOS_4X4;
  const califica = p1 && p2 && p3;
  return { p1, p2, p3, califica };
}

function calcularCIF(valorFOB, seguro, flete) {
  return valorFOB + seguro + flete;
}

function calcularGeneral(cif, categoria, icePorcentaje) {
  const tasaAdValorem = arancelesPorCategoria[categoria] ?? 0.20;
  const adValorem = cif * tasaAdValorem;
  const fodinfa = cif * FODINFA_PORCENTAJE;
  const ice = cif * (icePorcentaje / 100);

  const baseImponibleIVA = cif + adValorem + fodinfa + ice;
  const iva = baseImponibleIVA * IVA_PORCENTAJE;
  const total = baseImponibleIVA + iva;

  return { tasaAdValorem, adValorem, fodinfa, ice, iva, total };
}

function calcular4x4(cif) {
  const fodinfa = cif * FODINFA_PORCENTAJE;
  const total = ARANCEL_FIJO_4X4 + fodinfa;
  return { fodinfa, total };
}

function formatearMoneda(valor) {
  return (valor || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function filaResultado(etiqueta, valor) {
  return `
    <div class="flex justify-between py-2 text-sm text-gray-600">
      <span>${etiqueta}</span>
      <span class="font-semibold text-gray-900">${valor}</span>
    </div>`;
}


function formatearResultadoModal(datos, evaluacion, cif, calculo) {
  const { califica, p1, p2, p3 } = evaluacion;

  const iconCheck = `<svg class="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`;
  const iconCross = `<svg class="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`;

  const bgHeader = califica ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  const textHeader = califica ? 'text-emerald-900' : 'text-red-900';
  const iconHeaderBg = califica ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600';
  const iconHeaderSVG = califica
    ? `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`
    : `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

  const titulo = califica
    ? 'Tu envío califica para el régimen 4x4'
    : 'Tu envío NO califica para el régimen 4x4';

  const subtitulo = califica
    ? 'Exento de aranceles generales. Solo paga tasa fija y FODINFA.'
    : 'Se aplicará la liquidación bajo régimen general (Ad-valorem, FODINFA, IVA).';

  const detalleCondiciones = `
    <div class="rounded-xl border border-gray-100 bg-white p-4 text-xs space-y-2 shadow-sm">
      <div class="flex items-center gap-2 font-medium ${p1 ? 'text-gray-700' : 'text-red-600'}">
        ${p1 ? iconCheck : iconCross}
        <span>Cantidad: <strong>${datos.cantidad} unidad(es)</strong> (máx. ${LIMITE_CANTIDAD_4X4})</span>
      </div>
      <div class="flex items-center gap-2 font-medium ${p2 ? 'text-gray-700' : 'text-red-600'}">
        ${p2 ? iconCheck : iconCross}
        <span>Valor FOB: <strong>${formatearMoneda(datos.valorFOB)}</strong> (límite ${formatearMoneda(LIMITE_FOB_4X4)})</span>
      </div>
      <div class="flex items-center gap-2 font-medium ${p3 ? 'text-gray-700' : 'text-red-600'}">
        ${p3 ? iconCheck : iconCross}
        <span>Envíos previos este año: <strong>${datos.enviosPrevios}</strong> (&lt; ${LIMITE_ENVIOS_4X4})</span>
      </div>
    </div>`;

  let desgloseHTML = '';
  if (califica) {
    desgloseHTML = `
      ${filaResultado('CIF (FOB + Flete + Seguro)', formatearMoneda(cif))}
      ${filaResultado('Arancel fijo régimen 4x4', formatearMoneda(ARANCEL_FIJO_4X4))}
      ${filaResultado('FODINFA (0.5%)', formatearMoneda(calculo.fodinfa))}`;
  } else {
    desgloseHTML = `
      ${filaResultado('CIF (FOB + Flete + Seguro)', formatearMoneda(cif))}
      ${filaResultado(`Ad-valorem (${(calculo.tasaAdValorem * 100).toFixed(0)}%)`, formatearMoneda(calculo.adValorem))}
      ${filaResultado('FODINFA (0.5%)', formatearMoneda(calculo.fodinfa))}
      ${calculo.ice > 0 ? filaResultado('ICE', formatearMoneda(calculo.ice)) : ''}
      ${filaResultado('IVA (15%)', formatearMoneda(calculo.iva))}`;
  }

  const contenedor = document.getElementById('modal-detalle-calculo');
  contenedor.innerHTML = `
    <div class="space-y-4 rounded-2xl border ${bgHeader} p-5 shadow-sm">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconHeaderBg}">
          ${iconHeaderSVG}
        </div>
        <div>
          <h3 class="text-base lg:text-lg font-bold ${textHeader}">${titulo}</h3>
          <p class="mt-0.5 text-xs text-gray-600">${subtitulo}</p>
        </div>
      </div>

      ${detalleCondiciones}

      <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm divide-y divide-gray-100">
        ${desgloseHTML}
        <div class="flex justify-between pt-3 mt-1 text-base font-bold text-[#123b8c]">
          <span>Total estimado a pagar</span>
          <span>${formatearMoneda(calculo.total)}</span>
        </div>
      </div>
    </div>`;
}


// GRÁFICO TIPO GEOGEBRA CON TOOLTIP DETALLADO EN HOVER
function renderizarGrafico(datos) {
  const ctx = document.getElementById('graficoAranceles').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Puntos del eje X (Valores FOB a simular)
  const puntosFOB = [50, 100, 200, 300, 400, 401, 500, 600, 750, 1000];
  
  // Calculamos el desglose completo para cada punto simulado
  const desglosePuntos = puntosFOB.map(fob => {
    const cif = fob + datos.seguro + datos.flete;
    const es4x4 = fob <= LIMITE_FOB_4X4 && datos.cantidad <= LIMITE_CANTIDAD_4X4 && datos.enviosPrevios < LIMITE_ENVIOS_4X4;
    
    const calculo = es4x4 
      ? calcular4x4(cif) 
      : calcularGeneral(cif, datos.categoria, datos.icePorcentaje);

    return {
      fob,
      cif,
      es4x4,
      calculo
    };
  });

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: puntosFOB.map(v => `$${v}`),
      datasets: [{
        label: 'Impuesto total ($)',
        data: desglosePuntos.map(p => p.calculo.total),
        borderColor: '#123b8c',
        borderWidth: 2.5,
        backgroundColor: 'rgba(18, 59, 140, 0.08)',
        fill: true,
        tension: 0,
        pointBackgroundColor: puntosFOB.map(v => Math.abs(v - datos.valorFOB) < 40 ? '#ef4444' : '#123b8c'),
        pointRadius: puntosFOB.map(v => Math.abs(v - datos.valorFOB) < 40 ? 6 : 4),
        pointHoverRadius: 8, // Agranda el punto al pasar el cursor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false, // Permite activar el tooltip al acercarse al eje vertical del punto
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)', // Fondo oscuro elegante
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            // Título del tooltip (Punto seleccionado)
            title: (tooltipItems) => {
              const idx = tooltipItems[0].dataIndex;
              const p = desglosePuntos[idx];
              return `Valor FOB: $${p.fob.toFixed(2)} USD (${p.es4x4 ? 'Régimen 4x4' : 'Régimen General'})`;
            },
            // Contenido completo del desglose para ese punto
            label: (context) => {
              const idx = context.dataIndex;
              const p = desglosePuntos[idx];
              
              if (p.es4x4) {
                return [
                  `------------------------------`,
                  `• CIF: $${p.cif.toFixed(2)}`,
                  `• Tasa Fija 4x4: $${ARANCEL_FIJO_4X4.toFixed(2)}`,
                  `• FODINFA (0.5%): $${p.calculo.fodinfa.toFixed(2)}`,
                  `------------------------------`,
                  ` TOTAL A PAGAR: $${p.calculo.total.toFixed(2)} USD`
                ];
              } else {
                const lineas = [
                  `------------------------------`,
                  `• CIF: $${p.cif.toFixed(2)}`,
                  `• Ad-Valorem (${(p.calculo.tasaAdValorem * 100).toFixed(0)}%): $${p.calculo.adValorem.toFixed(2)}`,
                  `• FODINFA (0.5%): $${p.calculo.fodinfa.toFixed(2)}`
                ];
                if (p.calculo.ice > 0) {
                  lineas.push(`• ICE: $${p.calculo.ice.toFixed(2)}`);
                }
                lineas.push(
                  `• IVA (15%): $${p.calculo.iva.toFixed(2)}`,
                  `------------------------------`,
                  ` TOTAL A PAGAR: $${p.calculo.total.toFixed(2)} USD`
                );
                return lineas;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Valor FOB del Paquete (USD)', font: { size: 11, weight: 'bold' } } 
        },
        y: { 
          title: { display: true, text: 'Total Impuestos (USD)', font: { size: 11, weight: 'bold' } }, 
          beginAtZero: true 
        }
      }
    }
  });
}

function abrirModal() {
  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
}

function cerrarModal() {
  modalEl.classList.add('hidden');
  modalEl.classList.remove('flex');
}

btnCerrarModal.addEventListener('click', cerrarModal);

function exportarDatos(tipo) {
  if (!datosUltimoCalculo) return;

  const { datos, evaluacion, cif, calculo } = datosUltimoCalculo;

  const filas = [
    ["REPORTE DE CÁLCULO ARANCELARIO ECUADOR (RÉGIMEN 4X4)"],
    ["Fecha", new Date().toLocaleDateString('es-EC')],
    [""],
    ["DATOS DE ENTRADA", "VALOR"],
    ["Valor FOB (USD)", datos.valorFOB],
    ["Cantidad de unidades", datos.cantidad],
    ["Categoría del producto", datos.categoria],
    ["Envíos previos este año", datos.enviosPrevios],
    ["Flete (USD)", datos.flete],
    ["Seguro (USD)", datos.seguro],
    ["ICE (%)", datos.icePorcentaje],
    [""],
    ["EVALUACIÓN DE CONDICIONES", "ESTADO"],
    ["¿Califica a Régimen 4x4?", evaluacion.califica ? "SÍ" : "NO"],
    ["Límite de Cantidad (<= 4)", evaluacion.p1 ? "Cumple" : "Incumple"],
    ["Límite Valor FOB (<= $400)", evaluacion.p2 ? "Cumple" : "Incumple"],
    ["Límite Envíos Anuales (< 4)", evaluacion.p3 ? "Cumple" : "Incumple"],
    [""],
    ["DESGLOSE FINANCIERO", "VALOR (USD)"],
    ["Valor CIF", cif.toFixed(2)],
  ];

  if (evaluacion.califica) {
    filas.push(["Tasa Fija 4x4", ARANCEL_FIJO_4X4.toFixed(2)]);
    filas.push(["FODINFA (0.5%)", calculo.fodinfa.toFixed(2)]);
  } else {
    filas.push([`Ad-valorem (${(calculo.tasaAdValorem * 100).toFixed(0)}%)`, calculo.adValorem.toFixed(2)]);
    filas.push(["FODINFA (0.5%)", calculo.fodinfa.toFixed(2)]);
    if (calculo.ice > 0) filas.push(["ICE", calculo.ice.toFixed(2)]);
    filas.push(["IVA (15%)", calculo.iva.toFixed(2)]);
  }

  filas.push(["TOTAL ESTIMADO A PAGAR", calculo.total.toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calculo_Arancel");

  if (tipo === 'excel') {
    XLSX.writeFile(wb, `Arancel_Ecuador_${Date.now()}.xlsx`);
  } else if (tipo === 'csv') {
    XLSX.writeFile(wb, `Arancel_Ecuador_${Date.now()}.csv`, { bookType: 'csv' });
  }
}

document.getElementById('btn-excel').addEventListener('click', () => exportarDatos('excel'));
document.getElementById('btn-csv').addEventListener('click', () => exportarDatos('csv'));

document.getElementById('btn-pdf').addEventListener('click', () => {
  const elemento = document.getElementById('reporte-imprimible');
  const opt = {
    margin: 0.4,
    filename: `Calculo_Arancel_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(elemento).save();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const datos = leerDatosFormulario();
  const evaluacion = evaluarCalificacion(datos.cantidad, datos.valorFOB, datos.enviosPrevios);
  const cif = calcularCIF(datos.valorFOB, datos.seguro, datos.flete);

  const calculo = evaluacion.califica
    ? calcular4x4(cif)
    : calcularGeneral(cif, datos.categoria, datos.icePorcentaje);


  datosUltimoCalculo = { datos, evaluacion, cif, calculo };

  formatearResultadoModal(datos, evaluacion, cif, calculo);
  renderizarGrafico(datos);
  abrirModal();
});