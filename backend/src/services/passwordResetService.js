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

function esTablaRefreshPendiente(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('auth_refresh_tokens');
}

async function buscarUsuarioAuthPorEmail(supabase, email) {
  if (!supabase?.auth?.admin?.listUsers) return null;

  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((authUser) => normalizarEmail(authUser?.email) === email);
    if (match) return match;
    if (users.length < perPage) break;
  }

  return null;
}

async function actualizarPasswordAuthSupabase(supabase, email, newPassword) {
  const authUser = await buscarUsuarioAuthPorEmail(supabase, email);
  if (!authUser?.id) return;

  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  });
  if (error) throw error;
}

async function revocarRefreshTokensUsuario(supabase, userId) {
  const { error } = await supabase
    .from('auth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error && !esTablaRefreshPendiente(error)) throw error;
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

  await actualizarPasswordAuthSupabase(supabase, normalizedEmail, newPassword);
  await revocarRefreshTokensUsuario(supabase, user.id);

  // Devolvemos lo minimo necesario para confirmar que el cambio se hizo.
  return {
    idUsuario: user.id,
    email: user.email,
  };
}
