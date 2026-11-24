// Capa de rutas: catálogo de servicios del salón.
const { Router } = require('express');
const serviciosController = require('../controllers/servicios.controller');

const router = Router();

router.get('/', serviciosController.listar);

module.exports = router;
