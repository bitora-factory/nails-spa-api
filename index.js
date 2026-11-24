// Archivo principal: inicializa Express, configura middlewares, conecta las rutas y levanta el servidor.
const express = require('express');
const turnosRoutes = require('./routes/turnos.routes');
const serviciosRoutes = require('./routes/servicios.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/turnos', turnosRoutes);
app.use('/api/servicios', serviciosRoutes);

// Ruta inexistente -> 404 en JSON
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// JSON mal formado -> 400; cualquier otro error -> 500 sin detener el servidor
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Nails Spa API escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;
