require('dotenv').config(); // Läs .env-filen
const jwt = require('jsonwebtoken');

// Simulerad användarinformation för utvecklare
const userData = { id: 1, name: 'developer' };

// Skapa token
const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' }); // giltigt i 1 timme

console.log('Utvecklartoken:', token);
