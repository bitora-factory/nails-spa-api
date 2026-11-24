// Capa de servicios: catálogo de servicios de Nails Spa (RF-02).
// La duración de cada cita depende del servicio seleccionado (regla de negocio).
const SERVICIOS = [
  { codigo: 'manicura', nombre: 'Manicura', duracionMinutos: 45 },
  { codigo: 'pedicura', nombre: 'Pedicura', duracionMinutos: 60 },
  { codigo: 'esmaltado-tradicional', nombre: 'Esmaltado tradicional', duracionMinutos: 30 },
  { codigo: 'esmaltado-semipermanente', nombre: 'Esmaltado semipermanente', duracionMinutos: 60 },
  { codigo: 'unas-acrilicas', nombre: 'Uñas acrílicas', duracionMinutos: 120 },
  { codigo: 'unas-gel', nombre: 'Uñas en gel', duracionMinutos: 90 },
  { codigo: 'diseno-personalizado', nombre: 'Diseño personalizado', duracionMinutos: 75 },
];

function listarServicios() {
  return SERVICIOS;
}

function buscarServicio(codigo) {
  return SERVICIOS.find((s) => s.codigo === codigo) || null;
}

module.exports = { listarServicios, buscarServicio };
