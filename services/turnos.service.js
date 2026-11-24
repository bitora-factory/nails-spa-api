// Capa de servicios: lógica de negocio y gestión de los datos de los turnos (citas).
// Los turnos se guardan en un arreglo en memoria que se persiste en un archivo .json local,
// para no perder las citas al reiniciar el servidor (RNF-05).
const fs = require('fs');
const path = require('path');
const catalogoService = require('./catalogo.service');
const tarifaService = require('./tarifa.service');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'turnos.json');

let turnos = cargar();

function cargar() {
  try {
    const contenido = fs.readFileSync(DATA_FILE, 'utf8');
    const datos = JSON.parse(contenido);
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardar() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const temporal = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporal, JSON.stringify(turnos, null, 2));
  fs.renameSync(temporal, DATA_FILE); // escritura atómica: no deja el archivo a medias
}

class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function aHora(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function siguienteId() {
  return turnos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
}

function listar(filtros = {}) {
  return turnos.filter(
    (t) =>
      (!filtros.manicurista || t.manicurista.toLowerCase() === filtros.manicurista.toLowerCase()) &&
      (!filtros.fecha || t.fecha === filtros.fecha) &&
      (!filtros.estado || t.estado === filtros.estado)
  );
}

function obtenerPorId(id) {
  return turnos.find((t) => t.id === id) || null;
}

/**
 * Registra un nuevo turno aplicando las reglas de negocio de Nails Spa:
 *  - Solo se reservan servicios del catálogo.
 *  - La duración de la cita corresponde al servicio seleccionado.
 *  - Una manicurista no puede tener citas superpuestas (RF-05, RI-01).
 *  - Se calcula la tarifa con el recargo del equipo (parámetro N).
 */
function crear(datos) {
  const servicio = catalogoService.buscarServicio(datos.servicio);
  if (!servicio) {
    throw new ErrorNegocio(400, `El servicio "${datos.servicio}" no existe en el catálogo.`);
  }

  const inicio = aMinutos(datos.hora);
  const fin = inicio + servicio.duracionMinutos;
  if (fin > 24 * 60) {
    throw new ErrorNegocio(400, 'La cita debe terminar el mismo día en que inicia.');
  }

  // Regla anti-cruce: inicioNuevo < finExistente Y finNuevo > inicioExistente.
  // Node.js procesa esta función de forma síncrona, así que la verificación y el registro
  // ocurren sin que otra petición se intercale entre ellos.
  const cruce = turnos.find(
    (t) =>
      t.estado === 'activa' &&
      t.manicurista.toLowerCase() === datos.manicurista.toLowerCase() &&
      t.fecha === datos.fecha &&
      inicio < aMinutos(t.horaFin) &&
      fin > aMinutos(t.horaInicio)
  );
  if (cruce) {
    throw new ErrorNegocio(
      409,
      `La manicurista ${cruce.manicurista} ya tiene una cita de ${cruce.horaInicio} a ${cruce.horaFin} ` +
        `el ${cruce.fecha}. Elija otro horario u otra manicurista.`
    );
  }

  const tarifa = tarifaService.calcularTarifa(datos.precioBase, datos.prioritario);

  const turno = {
    id: siguienteId(),
    cliente: datos.cliente,
    telefono: datos.telefono,
    servicio: servicio.codigo,
    nombreServicio: servicio.nombre,
    manicurista: datos.manicurista,
    fecha: datos.fecha,
    horaInicio: aHora(inicio),
    horaFin: aHora(fin),
    duracionMinutos: servicio.duracionMinutos,
    prioritario: datos.prioritario === true,
    ...tarifa,
    estado: 'activa',
    creadoEn: new Date().toISOString(),
  };

  turnos.push(turno);
  guardar();
  return turno;
}

/** Cancela un turno: cambia el estado (no se borra) y el horario queda libre. */
function cancelar(id) {
  const turno = obtenerPorId(id);
  if (!turno) return null;
  if (turno.estado === 'cancelada') {
    throw new ErrorNegocio(400, `El turno ${id} ya estaba cancelado.`);
  }
  turno.estado = 'cancelada';
  turno.canceladoEn = new Date().toISOString();
  guardar();
  return turno;
}

module.exports = { listar, obtenerPorId, crear, cancelar, ErrorNegocio };
