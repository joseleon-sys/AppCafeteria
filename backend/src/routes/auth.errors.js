export class AuthServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function crearError(statusCode, message) {
  return new AuthServiceError(statusCode, message);
}

export function tieneErrorColumna(error, columnName) {
  return error?.message?.toLowerCase().includes(columnName);
}

export function requireSupabase(supabase, message = 'Supabase no esta configurado en el backend') {
  if (!supabase) throw crearError(503, message);
}
