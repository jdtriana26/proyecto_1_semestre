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
const resultadoEl = document.getElementById('resultado');

function leerDatosFormulario() {
  const valorICE = document.getElementById('icePorcentaje').value;
  return {
    valorFOB: parseFloat(document.getElementById('valorFOB').value),
    cantidad: parseInt(document.getElementById('cantidad').value, 10),
    categoria: document.getElementById('categoria').value,
    enviosPrevios: parseInt(document.getElementById('enviosPrevios').value, 10),
    flete: parseFloat(document.getElementById('flete').value),
    seguro: parseFloat(document.getElementById('seguro').value),
    icePorcentaje: valorICE === '' ? 0 : parseFloat(valorICE),
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
  const tasaAdValorem = arancelesPorCategoria[categoria];
  const adValorem = cif * tasaAdValorem;
  const fodinfa = cif * FODINFA_PORCENTAJE;
  const ice = cif * (icePorcentaje / 100);

  const baseImponibleIVA = cif + adValorem + fodinfa + ice;
  const iva = baseImponibleIVA * IVA_PORCENTAJE;

  const total = baseImponibleIVA + iva;

  return {
    tasaAdValorem,
    adValorem,
    fodinfa,
    ice,
    iva,
    total,
  };
}

function calcular4x4(cif) {
  const fodinfa = cif * FODINFA_PORCENTAJE;
  const total = ARANCEL_FIJO_4X4 + fodinfa;
  return { fodinfa, total };
}

function formatearMoneda(valor) {
  return valor.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function filaResultado(etiqueta, valor) {
  return `
    <div class="flex justify-between py-2 text-sm">
      <span class="text-gray-500">${etiqueta}</span>
      <span class="font-medium text-gray-900">${valor}</span>
    </div>`;
}

function formatearResultado(datos, evaluacion, cif, calculo) {
  const { califica, p1, p2, p3 } = evaluacion;

  const colorFondo = califica ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const colorTexto = califica ? 'text-green-700' : 'text-red-700';
  const icono = califica ? '🟢' : '🔴';
  const titulo = califica
    ? 'Tu envío califica para el régimen 4x4'
    : 'Tu envío NO califica para el régimen 4x4';

  const detalleCondiciones = `
    <ul class="mt-3 space-y-1 text-sm">
      <li>${p1 ? '✅' : '❌'} Cantidad: ${datos.cantidad} unidad(es) (máx. ${LIMITE_CANTIDAD_4X4})</li>
      <li>${p2 ? '✅' : '❌'} Valor FOB: ${formatearMoneda(datos.valorFOB)} (límite ${formatearMoneda(LIMITE_FOB_4X4)})</li>
      <li>${p3 ? '✅' : '❌'} Envíos previos este año: ${datos.enviosPrevios} (< ${LIMITE_ENVIOS_4X4})</li>
    </ul>`;

  let desgloseHTML = '';
  if (califica) {
    desgloseHTML = `
      ${filaResultado('CIF (FOB + Flete + Seguro)', formatearMoneda(cif))}
      ${filaResultado('Arancel fijo régimen 4x4', formatearMoneda(ARANCEL_FIJO_4X4))}
      ${filaResultado('FODINFA (0.5%)', formatearMoneda(calculo.fodinfa))}
      <div class="flex justify-between py-3 mt-1 border-t border-gray-200 text-base font-bold">
        <span>Total estimado a pagar</span>
        <span>${formatearMoneda(calculo.total)}</span>
      </div>`;
  } else {
    desgloseHTML = `
      ${filaResultado('CIF (FOB + Flete + Seguro)', formatearMoneda(cif))}
      ${filaResultado(`Ad-valorem (${(calculo.tasaAdValorem * 100).toFixed(0)}%)`, formatearMoneda(calculo.adValorem))}
      ${filaResultado('FODINFA (0.5%)', formatearMoneda(calculo.fodinfa))}
      ${calculo.ice > 0 ? filaResultado('ICE', formatearMoneda(calculo.ice)) : ''}
      ${filaResultado('IVA (15%)', formatearMoneda(calculo.iva))}
      <div class="flex justify-between py-3 mt-1 border-t border-gray-200 text-base font-bold">
        <span>Total estimado a pagar</span>
        <span>${formatearMoneda(calculo.total)}</span>
      </div>`;
  }

  resultadoEl.innerHTML = `
    <div class="border rounded-lg p-5 ${colorFondo}">
      <h3 class="flex items-center gap-2 text-lg font-bold ${colorTexto}">
        <span>${icono}</span> ${titulo}
      </h3>
      ${detalleCondiciones}
      <div class="mt-4 divide-y divide-gray-100 bg-white rounded-lg p-4">
        ${desgloseHTML}
      </div>
    </div>`;

  resultadoEl.classList.remove('hidden');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const datos = leerDatosFormulario();

  const evaluacion = evaluarCalificacion(datos.cantidad, datos.valorFOB, datos.enviosPrevios);
  const cif = calcularCIF(datos.valorFOB, datos.seguro, datos.flete);

  const calculo = evaluacion.califica
    ? calcular4x4(cif)
    : calcularGeneral(cif, datos.categoria, datos.icePorcentaje);

  formatearResultado(datos, evaluacion, cif, calculo);
});
