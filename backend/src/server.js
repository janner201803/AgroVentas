const express = require('express');

const app = express();
const PORT = 3000;

// Permite recibir datos en formato JSON
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.send('¡Mi backend está funcionando! ');
});

// Ruta de prueba
app.get('/api/prueba', (req, res) => {
    res.json({
        mensaje: 'Conexión exitosa con el backend',
        estado: 'OK'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});