import {
  validarAdultoPuedeActuarComoPadre,
  validarHijoPuedeVincular,
  validarIdSolicitud,
  validarTokenPadre,
  validarUsuarioAutenticado,
} from './family.validators.js';

class FamilyServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function crearError(statusCode, message) {
  return new FamilyServiceError(statusCode, message);
}

function lanzarSiInvalido(validation) {
  if (!validation.valid) throw crearError(validation.statusCode, validation.message);
}

export function crearFamilyService(deps, repository) {
  const {
    supabase,
    puedeActuarComoPadre,
    generarTokenPadre,
    normalizarUsuarioRelacionado,
    validateLinkingLimits,
    logSecurityEvent,
    notificarUsuarioSinFallo,
    obtenerNombreVisibleUsuario,
  } = deps;

  function requireSupabase() {
    if (!supabase) throw crearError(503, 'Supabase no esta configurado en el backend');
  }

  async function validarPadreActual(parentId, message) {
    const { data: parent, error } = await repository.obtenerUsuarioRol(parentId);
    if (error) throw error;

    lanzarSiInvalido(validarAdultoPuedeActuarComoPadre(parent, puedeActuarComoPadre, message));
    return parent;
  }

  return {
    async obtenerTokenPadre(user) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioAutenticado(user));

      const { data: storedUser, error } = await repository.obtenerUsuarioParaToken(user.id);
      if (error || !storedUser) throw crearError(404, 'Usuario no encontrado');

      lanzarSiInvalido(validarAdultoPuedeActuarComoPadre(
        storedUser,
        puedeActuarComoPadre,
        'Solo los adultos pueden tener token de vinculación',
      ));

      if (storedUser.parent_token) return { tokenPadre: storedUser.parent_token };

      const newToken = generarTokenPadre();
      const { error: updateError } = await repository.actualizarTokenPadre(user.id, newToken);
      if (updateError) throw updateError;

      return { tokenPadre: newToken };
    },

    async solicitarVinculacion(user, body, req) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioAutenticado(user));

      const tokenValidation = validarTokenPadre(body?.tokenPadre);
      lanzarSiInvalido(tokenValidation);

      const { data: child } = await repository.obtenerHijoParaVinculacion(user.id);
      const childValidation = validarHijoPuedeVincular(child);
      lanzarSiInvalido(childValidation);

      const { data: parentData } = await repository.obtenerPadrePorToken(tokenValidation.tokenPadre);
      const parent = normalizarUsuarioRelacionado(parentData);

      if (!parent || !puedeActuarComoPadre(parent)) {
        await logSecurityEvent(supabase, {
          idUsuario: user.id,
          actionType: 'link_invalid_token',
          severity: 'medium',
          details: { token: tokenValidation.tokenPadre },
          req,
        });
        throw crearError(404, 'Token de padre no válido');
      }

      const validation = await validateLinkingLimits(supabase, { childId: user.id, parentId: parent.id });
      if (!validation.valid) {
        await logSecurityEvent(supabase, {
          idUsuario: user.id,
          actionType: 'link_limit_exceeded',
          severity: validation.severity,
          details: { reason: validation.reason, parentId: parent.id },
          req,
        });
        throw crearError(400, validation.reason);
      }

      const { data: link, error } = await repository.crearSolicitudVinculacion(parent.id, user.id);
      if (error) {
        if (error.code === '23505') {
          throw crearError(400, 'Ya existe una relación o solicitud previa con este padre');
        }
        throw error;
      }

      await logSecurityEvent(supabase, {
        idUsuario: user.id,
        actionType: 'link_request_created',
        severity: 'low',
        details: { parentId: parent.id, linkId: link.id },
        req,
      });

      await notificarUsuarioSinFallo(parent.id, {
        type: 'link_request_created',
        title: 'Nueva solicitud de vinculacion',
        body: `${obtenerNombreVisibleUsuario(child)} quiere vincularse contigo en la app.`,
        data: { linkId: link.id, childId: user.id, targetScreen: 'link-requests' },
      });

      return {
        statusCode: 201,
        message: 'Solicitud de vinculación enviada',
        link: { id: link.id, parentName: parent?.name || null, status: link.status },
      };
    },

    async listarSolicitudes(user) {
      requireSupabase();
      await validarPadreActual(user.id, 'Solo los adultos pueden ver solicitudes familiares');

      const { data: requests, error } = await repository.listarSolicitudesPendientes(user.id);
      if (error) throw error;

      return {
        requests: (requests || []).map((request) => ({
          ...request,
          child: normalizarUsuarioRelacionado(request.child),
        })),
      };
    },

    async aprobarSolicitud(user, params, body, req) {
      requireSupabase();
      const idValidation = validarIdSolicitud(params.id);
      lanzarSiInvalido(idValidation);

      const { data: link, error: linkError } = await repository.obtenerSolicitudPendiente(
        idValidation.id,
        user.id,
        '*, child:child_id(id, nombre, email)',
      );

      if (linkError) throw linkError;
      if (!link) throw crearError(404, 'Solicitud no encontrada');

      const limiteGasto = body?.limiteGasto ?? 20.0;
      const { data: updated, error } = await repository.aprobarSolicitud(idValidation.id, limiteGasto);
      if (error) throw error;

      await repository.marcarUsuarioComoPadre(user.id);

      await logSecurityEvent(supabase, {
        idUsuario: user.id,
        actionType: 'link_approved',
        severity: 'low',
        details: { linkId: idValidation.id, childId: link.child_id, limiteGasto },
        req,
      });

      await notificarUsuarioSinFallo(link.child_id, {
        type: 'link_request_approved',
        title: 'Vinculacion aprobada',
        body: 'Tu solicitud de vinculacion familiar ha sido aprobada.',
        data: { linkId: idValidation.id, parentId: user.id, targetScreen: 'profile-family' },
      });

      return { message: 'Vinculación aprobada', link: updated };
    },

    async rechazarSolicitud(user, params, body, req) {
      requireSupabase();
      const idValidation = validarIdSolicitud(params.id);
      lanzarSiInvalido(idValidation);

      const { data: link } = await repository.obtenerSolicitudPendiente(idValidation.id, user.id);
      if (!link) throw crearError(404, 'Solicitud no encontrada');

      const reason = body?.reason;
      const { error } = await repository.rechazarSolicitud(idValidation.id, reason);
      if (error) throw error;

      await logSecurityEvent(supabase, {
        idUsuario: user.id,
        actionType: 'link_rejected',
        severity: 'low',
        details: { linkId: idValidation.id, childId: link.child_id, reason },
        req,
      });

      await notificarUsuarioSinFallo(link.child_id, {
        type: 'link_request_rejected',
        title: 'Vinculacion rechazada',
        body: reason || 'Tu solicitud de vinculacion ha sido rechazada.',
        data: { linkId: idValidation.id, parentId: user.id, targetScreen: 'profile-family' },
      });

      return { message: 'Vinculación rechazada' };
    },

    async listarMisPadres(user) {
      requireSupabase();
      lanzarSiInvalido(validarUsuarioAutenticado(user));

      const { data: links, error } = await repository.listarPadresDeHijo(user.id);
      if (error) throw error;

      return {
        parents: (links || []).map((link) => ({
          ...link,
          parent: normalizarUsuarioRelacionado(link.parent),
        })),
      };
    },

    async listarMisHijos(user) {
      requireSupabase();
      await validarPadreActual(user.id, 'Solo los adultos pueden ver sus hijos vinculados');

      const { data: links, error } = await repository.listarHijosDePadre(user.id);
      if (error) throw error;

      return {
        children: (links || []).map((link) => ({
          ...link,
          child: normalizarUsuarioRelacionado(link.child),
        })),
      };
    },
  };
}
