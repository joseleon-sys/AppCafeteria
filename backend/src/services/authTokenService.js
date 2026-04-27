import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30;

function normalizarDiasRefresh(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_TOKEN_TTL_DAYS;
}

function sumarDias(fecha, dias) {
  return new Date(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
}

function tieneTablaRefreshPendiente(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('auth_refresh_tokens');
}

export function crearAuthTokenService({
  jwtSecret,
  accessTokenTtl = process.env.JWT_ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TOKEN_TTL,
  refreshTokenTtlDays = process.env.JWT_REFRESH_TOKEN_TTL_DAYS,
} = {}) {
  const refreshDays = normalizarDiasRefresh(refreshTokenTtlDays);

  function crearPayloadUsuario(user, profileId) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdult: Boolean(user.is_adult ?? user.isAdult),
      profileId,
    };
  }

  function firmarAccessToken(user, profileId) {
    return jwt.sign(crearPayloadUsuario(user, profileId), jwtSecret, { expiresIn: accessTokenTtl });
  }

  function generarRefreshTokenPlano() {
    return crypto.randomBytes(48).toString('base64url');
  }

  function hashearRefreshToken(refreshToken) {
    return crypto.createHash('sha256').update(String(refreshToken || ''), 'utf8').digest('hex');
  }

  function obtenerFechaExpiracionRefresh(now = new Date()) {
    return sumarDias(now, refreshDays);
  }

  async function emitirTokens({ user, profileId, repository, req, reemplazaTokenHash = null }) {
    const accessToken = firmarAccessToken(user, profileId);
    const refreshToken = generarRefreshTokenPlano();
    const tokenHash = hashearRefreshToken(refreshToken);
    const expiresAt = obtenerFechaExpiracionRefresh();

    try {
      const { error } = await repository.guardarRefreshToken({
        idUsuario: user.id,
        tokenHash,
        expiresAt,
        userAgent: req?.headers?.['user-agent'] || null,
        ipAddress: req?.ip || req?.connection?.remoteAddress || null,
        reemplazaTokenHash,
      });
      if (error) throw error;
    } catch (error) {
      if (!tieneTablaRefreshPendiente(error)) throw error;
      return { accessToken, token: accessToken, refreshToken: null, refreshTokenExpiresAt: null };
    }

    return {
      accessToken,
      token: accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt.toISOString(),
    };
  }

  return {
    accessTokenTtl,
    refreshTokenTtlDays: refreshDays,
    firmarAccessToken,
    hashearRefreshToken,
    emitirTokens,
  };
}
