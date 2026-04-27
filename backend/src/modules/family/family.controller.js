import { asyncHandler } from '../../utils/asyncHandler.js';

export function crearFamilyController(familyService) {
  function responderResultado(res, result) {
    const { statusCode, ...payload } = result;
    return res.status(statusCode || 200).json(payload);
  }

  return {
    obtenerTokenPadre: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.obtenerTokenPadre(req.user));
      },
      { publicMessage: 'Error al obtener token' },
    ),

    solicitarVinculacion: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.solicitarVinculacion(req.user, req.body, req));
      },
      { publicMessage: 'Error al crear solicitud' },
    ),

    listarSolicitudes: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.listarSolicitudes(req.user));
      },
      { publicMessage: 'Error al obtener solicitudes' },
    ),

    aprobarSolicitud: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.aprobarSolicitud(req.user, req.params, req.body, req));
      },
      { publicMessage: 'Error al aprobar vinculación' },
    ),

    rechazarSolicitud: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.rechazarSolicitud(req.user, req.params, req.body, req));
      },
      { publicMessage: 'Error al rechazar vinculación' },
    ),

    listarMisPadres: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.listarMisPadres(req.user));
      },
      { publicMessage: 'Error al obtener padres' },
    ),

    listarMisHijos: asyncHandler(
      async (req, res) => {
        return responderResultado(res, await familyService.listarMisHijos(req.user));
      },
      { publicMessage: 'Error al obtener hijos' },
    ),
  };
}
