import bcrypt from 'bcryptjs';

// Script para generar hash de contraseñas
// Uso: node utils/generateHash.js <password>

const password = process.argv[2] || 'admin';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generando hash:', err);
    process.exit(1);
  }
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  process.exit(0);
});
