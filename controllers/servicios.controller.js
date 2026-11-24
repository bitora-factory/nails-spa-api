// Capa de controladores: gestiona req/res del catálogo de servicios.
const catalogoService = require('../services/catalogo.service');

function listar(req, res) {
  res.status(200).json(catalogoService.listarServicios());
}

module.exports = { listar };
