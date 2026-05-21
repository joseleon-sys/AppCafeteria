import { asyncHandler } from '../../utils/asyncHandler.js';

export function crearAdminController(adminService) {
  return {
    obtenerMetricas: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.obtenerMetricas());
      },
      { publicMessage: 'Error al obtener estadísticas' },
    ),

    listarFraudLogs: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.listarFraudLogs());
      },
      { publicMessage: 'Error al obtener fraude log' },
    ),

    listarUsuarios: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.listarUsuarios());
      },
      { publicMessage: 'Error al obtener usuarios' },
    ),

    actualizarBloqueoUsuario: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.actualizarBloqueoUsuario(req.params, req.body));
      },
      { publicMessage: 'Error al bloquear usuario' },
    ),

    actualizarUsuario: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.actualizarUsuario(req.params, req.body));
      },
      { publicMessage: 'Error al actualizar usuario' },
    ),

    eliminarUsuario: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.eliminarUsuario(req.params));
      },
      { publicMessage: 'Error al eliminar usuario' },
    ),

    listarColaPedidos: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.listarColaPedidos());
      },
      { publicMessage: 'Error al obtener la cola de cocina' },
    ),

    obtenerConfiguracionImpresora: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.obtenerConfiguracionImpresora());
      },
      { publicMessage: 'Error al obtener la configuracion de impresora' },
    ),

    guardarConfiguracionImpresora: asyncHandler(
      async (req, res) => {
        return res.json(await adminService.guardarConfiguracionImpresora(req.body));
      },
      { publicMessage: 'Error al guardar la configuracion de impresora' },
    ),
  };
}
