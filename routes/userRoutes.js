const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/get-users', userController.getUsers);
router.get('/get-roles', userController.getRoles);
router.get('/get-partidos', userController.getPartidos);
router.get('/get-equipos', userController.getEquipos);
router.get('/get-jugadores', userController.getJugadores);
router.put('/update-partido', userController.updatePartido);
router.post('/crear-formaciones', userController.crearFormaciones);
router.post('/crear-goles', userController.crearGoles);
router.post('/crear-asistencias', userController.crearAsistencias);
router.post('/crear-rojas', userController.crearRojas);
router.post('/crear-amarillas', userController.crearAmarillas);
router.put('/update-jugadores', userController.insertarJugadoresEventuales);
router.get('/get-partidos-eventuales', userController.partidosJugadorEventual)


module.exports = router;
