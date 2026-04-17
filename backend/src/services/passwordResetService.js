import bcrypt from 'bcryptjs';

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function buildValidationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidBirthDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export async function resetUserPassword({
  email,
  birthDate,
  newPassword,
  supabase,
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedBirthDate = String(birthDate || '').trim();

  if (!normalizedEmail || !normalizedBirthDate || !newPassword) {
    throw buildValidationError('Email, fecha de nacimiento y nueva contraseña son obligatorios');
  }

  if (!isValidBirthDate(normalizedBirthDate)) {
    throw buildValidationError('La fecha de nacimiento no es válida');
  }

  if (newPassword.length < 6) {
    throw buildValidationError('La contraseña debe tener al menos 6 caracteres');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (!supabase) {
    throw buildValidationError('Supabase no esta configurado en el backend', 503);
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, email, birth_date, active')
    .ilike('email', normalizedEmail)
    .eq('active', true)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!user) throw buildValidationError('No se pudo validar la identidad del usuario', 404);

  const storedBirthDate = String(user.birth_date || '').slice(0, 10);
  if (storedBirthDate !== normalizedBirthDate) {
    throw buildValidationError('Los datos proporcionados no coinciden con ningún usuario activo', 400);
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  return {
    userId: user.id,
    email: user.email,
  };
}
