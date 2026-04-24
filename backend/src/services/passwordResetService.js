// Servicio dedicado al cambio de contraseña usando datos basicos de verificacion.
import bcrypt from 'bcryptjs';

function normalizarEmail(email = '') {
  // Dejamos el email en un formato estable para comparar sin fallos por mayusculas o espacios.
  return String(email).trim().toLowerCase();
}

function crearErrorValidacion(message, statusCode = 400) {
  // Creamos errores con codigo HTTP para que la ruta pueda responder mejor.
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function esFechaNacimientoValida(value) {
  // Verificacion sencilla: que JavaScript pueda interpretar la fecha.
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export async function restablecerContrasenaUsuario({
  email,
  birthDate,
  newPassword,
  supabase,
}) {
  // Normalizamos entradas antes de validar o consultar en base de datos.
  const normalizedEmail = normalizarEmail(email);
  const normalizedBirthDate = String(birthDate || '').trim();

  if (!normalizedEmail || !normalizedBirthDate || !newPassword) {
    throw crearErrorValidacion('Email, fecha de nacimiento y nueva contraseña son obligatorios');
  }

  if (!esFechaNacimientoValida(normalizedBirthDate)) {
    throw crearErrorValidacion('La fecha de nacimiento no es válida');
  }

  if (newPassword.length < 6) {
    throw crearErrorValidacion('La contraseña debe tener al menos 6 caracteres');
  }

  // La contraseña nunca se guarda en texto plano; antes se convierte en hash.
  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (!supabase) {
    throw crearErrorValidacion('Supabase no esta configurado en el backend', 503);
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, email, birth_date, active')
    .ilike('email', normalizedEmail)
    .eq('active', true)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!user) throw crearErrorValidacion('No se pudo validar la identidad del usuario', 404);

  // Comparamos solo la parte YYYY-MM-DD para evitar problemas de zona horaria.
  const storedBirthDate = String(user.birth_date || '').slice(0, 10);
  if (storedBirthDate !== normalizedBirthDate) {
    throw crearErrorValidacion('Los datos proporcionados no coinciden con ningún usuario activo', 400);
  }

  const { error: errorActualizacion } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
    })
    .eq('id', user.id);

  if (errorActualizacion) throw errorActualizacion;

  // Devolvemos lo minimo necesario para confirmar que el cambio se hizo.
  return {
    idUsuario: user.id,
    email: user.email,
  };
}
