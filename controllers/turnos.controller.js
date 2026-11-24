// Capa de controladores: gestiona la petición (req) y la respuesta (res),
// valida los datos de entrada y asigna los códigos de estado HTTP.
const turnosService = require('../services/turnos.service');

const CAMPOS_TEXTO = ['cliente', 'telefono', 'servicio', 'manicurista', 'fecha', 'hora'];
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function esFechaValida(texto) {
  if (!FORMATO_FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/** Devuelve la lista de errores de validación del cuerpo de un POST (vacía si es válido). */
function validarTurno(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return ['El cuerpo de la petición debe ser un objeto JSON.'];
  }

  const errores = [];

  const faltantes = [...CAMPOS_TEXTO, 'precioBase'].filter(
    (campo) => body[campo] === undefined || body[campo] === null || body[campo] === ''
  );
  if (faltantes.length > 0) {
    errores.push(`Faltan campos obligatorios: ${faltantes.join(', ')}.`);
  }

  for (const campo of CAMPOS_TEXTO) {
    if (body[campo] !== undefined && body[campo] !== null && body[campo] !== '') {
      if (typeof body[campo] !== 'string' || body[campo].trim() === '') {
        errores.push(`El campo "${campo}" debe ser un texto no vacío.`);
      }
    }
  }

  if (typeof body.fecha === 'string' && body.fecha !== '' && !esFechaValida(body.fecha)) {
    errores.push('El campo "fecha" debe tener el formato AAAA-MM-DD y ser una fecha real.');
  }
  if (typeof body.hora === 'string' && body.hora !== '' && !FORMATO_HORA.test(body.hora)) {
    errores.push('El campo "hora" debe tener el formato HH:mm (24 horas).');
  }

  if (body.precioBase !== undefined && body.precioBase !== null && body.precioBase !== '') {
    if (typeof body.precioBase !== 'number' || !Number.isFinite(body.precioBase)) {
      errores.push('El campo "precioBase" debe ser numérico.');
    } else if (body.precioBase <= 0) {
      errores.push('El campo "precioBase" debe ser mayor que cero.');
    }
  }

  if (body.prioritario !== undefined && typeof body.prioritario !== 'boolean') {
    errores.push('El campo "prioritario" debe ser true o false.');
  }

  return errores;
}

/** Convierte el parámetro :id en entero positivo; devuelve null si no lo es. */
function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function noEncontrado(res, idTexto) {
  return res.status(404).json({ error: `No existe un turno con id ${idTexto}.` });
}

function listar(req, res) {
  const { manicurista, fecha, estado } = req.query;
  res.status(200).json(turnosService.listar({ manicurista, fecha, estado }));
}

function obtenerPorId(req, res) {
  const id = leerId(req);
  const turno = id && turnosService.obtenerPorId(id);
  if (!turno) return noEncontrado(res, req.params.id);
  res.status(200).json(turno);
}

function crear(req, res, next) {
  const errores = validarTurno(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: 'Datos inválidos.', detalles: errores });
  }

  const { cliente, telefono, servicio, manicurista, fecha, hora, precioBase, prioritario } = req.body;
  try {
    const turno = turnosService.crear({
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      servicio: servicio.trim().toLowerCase(),
      manicurista: manicurista.trim(),
      fecha,
      hora,
      precioBase,
      prioritario,
    });
    res.status(201).json(turno);
  } catch (err) {
    if (err instanceof turnosService.ErrorNegocio) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

function cancelar(req, res, next) {
  const id = leerId(req);
  if (!id) return noEncontrado(res, req.params.id);
  try {
    const turno = turnosService.cancelar(id);
    if (!turno) return noEncontrado(res, req.params.id);
    res.status(200).json(turno);
  } catch (err) {
    if (err instanceof turnosService.ErrorNegocio) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, cancelar };
