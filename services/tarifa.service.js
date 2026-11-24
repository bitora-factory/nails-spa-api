// Capa de servicios: regla de negocio parametrizada por el equipo (N).
//
// N = número de lista oficial del primer integrante del equipo, ordenado por apellido.
// Equipo ordenado por apellido: Mejía Almansa (#11), Rave Acosta (#16), Román Semprún (#17) -> N = 11.
const N = 11;

// porcentajeRecargo = N × 2 %
const PORCENTAJE_RECARGO = N * 2;

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

/**
 * Calcula la tarifa de un turno.
 *  - prioritario === true -> totalPagar = precioBase + precioBase × (porcentajeRecargo / 100)
 *  - en otro caso         -> totalPagar = precioBase
 */
function calcularTarifa(precioBase, prioritario) {
  const aplicaRecargo = prioritario === true;
  const recargo = aplicaRecargo ? redondear(precioBase * (PORCENTAJE_RECARGO / 100)) : 0;
  return {
    precioBase,
    porcentajeRecargo: aplicaRecargo ? PORCENTAJE_RECARGO : 0,
    recargo,
    totalPagar: redondear(precioBase + recargo),
  };
}

module.exports = { N, PORCENTAJE_RECARGO, calcularTarifa };
