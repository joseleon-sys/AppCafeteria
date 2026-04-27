import { asyncHandler } from '../utils/asyncHandler.js';

export function crearAuthController(authService) {
  function registrarError(metodo) {
    return async (error, req) => {
      await authService[metodo]?.(error, req);
    };
  }

  return {
    registrarUsuario: asyncHandler(
      async (req, res) => {
        const result = await authService.registrarUsuario(req.body, req);
        return res.status(201).json(result);
      },
      {
        publicMessage: 'Error al crear usuario',
        onError: registrarError('registrarErrorRegistro'),
      },
    ),

    loginUsuario: asyncHandler(
      async (req, res) => {
        const result = await authService.loginUsuario(req.body, req);
        return res.json(result);
      },
      {
        publicMessage: 'Error al iniciar sesión',
        onError: registrarError('registrarErrorLogin'),
      },
    ),

    refrescarSesion: asyncHandler(
      async (req, res) => {
        const result = await authService.refrescarSesion(req.body, req);
        return res.json(result);
      },
      { publicMessage: 'Error al refrescar sesión' },
    ),

    cerrarSesion: asyncHandler(
      async (req, res) => {
        const result = await authService.cerrarSesion(req.body);
        return res.json(result);
      },
      { publicMessage: 'Error al cerrar sesión' },
    ),

    restablecerContrasena: asyncHandler(
      async (req, res) => {
        const result = await authService.restablecerContrasena(req.body, req);
        return res.json(result);
      },
      {
        publicMessage: 'Error al restablecer la contrasena',
        onError: registrarError('registrarErrorRestablecerContrasena'),
      },
    ),

    obtenerUsuarioActual: asyncHandler(
      async (req, res) => {
        const result = await authService.obtenerUsuarioActual(req.user);
        return res.json(result);
      },
      { publicMessage: 'Error al obtener perfil' },
    ),

    registrarDispositivo: asyncHandler(
      async (req, res) => {
        const result = await authService.registrarDispositivo(req.body, req.user);
        return res.status(201).json(result);
      },
      { publicMessage: 'No se pudo registrar el dispositivo' },
    ),

    desactivarDispositivo: asyncHandler(
      async (req, res) => {
        const result = await authService.desactivarDispositivo(req.params.token, req.user);
        return res.json(result);
      },
      { publicMessage: 'No se pudo desactivar el dispositivo' },
    ),

    listarNotificaciones: asyncHandler(
      async (req, res) => {
        const result = await authService.listarNotificaciones(req.query, req.user);
        return res.json(result);
      },
      { publicMessage: 'No se pudieron obtener las notificaciones' },
    ),

    marcarNotificacionLeida: asyncHandler(
      async (req, res) => {
        const result = await authService.marcarNotificacionLeida(req.params, req.user);
        return res.json(result);
      },
      { publicMessage: 'No se pudo actualizar la notificacion' },
    ),

    obtenerFavoritos: asyncHandler(
      async (req, res) => {
        const result = await authService.obtenerFavoritos(req.user);
        return res.json(result);
      },
      { publicMessage: 'Error al obtener favoritos' },
    ),

    actualizarFavoritos: asyncHandler(
      async (req, res) => {
        const result = await authService.actualizarFavoritos(req.body, req.user);
        return res.json(result);
      },
      { publicMessage: 'Error al actualizar favoritos' },
    ),

    actualizarPerfil: asyncHandler(
      async (req, res) => {
        const result = await authService.actualizarPerfil(req.body, req.user);
        return res.json(result);
      },
      { publicMessage: 'Error al actualizar perfil' },
    ),
  };
}
