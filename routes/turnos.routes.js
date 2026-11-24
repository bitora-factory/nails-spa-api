// Capa de rutas: solo define los endpoints y los asocia con su controlador.
const { Router } = require('express');
const turnosController = require('../controllers/turnos.controller');

const router = Router();

router.get('/', turnosController.listar);
router.get('/:id', turnosController.obtenerPorId);
router.post('/', turnosController.crear);
router.patch('/:id/cancelar', turnosController.cancelar);

module.exports = router;
