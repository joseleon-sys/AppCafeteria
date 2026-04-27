import {
  validarBloqueoUsuario,
  validarCambiosUsuario,
  validarIdUsuario,
} from './admin.validators.js';

class AdminServiceError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.exposeDetails = Boolean(options.exposeDetails);
    this.details = options.details;
  }
}

function crearError(statusCode, message, options) {
  return new AdminServiceError(statusCode, message, options);
}

function lanzarSiInvalido(validation) {
  if (!validation.valid) throw crearError(validation.statusCode, validation.message);
}

function obtenerPrimerRegistro(data) {
  return Array.isArray(data) ? data[0] : null;
}

export function crearAdminService(deps, repository) {
  const {
    supabase,
    construirEntradaColaPedidos,
    parsearArrayJson,
  } = deps;

  function requireSupabase() {
    if (!supabase) throw crearError(503, 'Supabase no esta configurado en el backend');
  }

  function envolverErrorSupabase(error, fallbackMessage, exposeDetails = false) {
    if (!error) return null;
    return crearError(500, fallbackMessage, {
      exposeDetails,
      details: error?.message || String(error),
    });
  }

  function contarHijosPorPadre(links = []) {
    return links.reduce((acc, link) => {
      const key = String(link.parent_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function construirMetricas({ users = [], orders = [], fraudLogs = [] }) {
    const todayDate = new Date().toISOString().slice(0, 10);

    return {
      summary: {
        total_users: users.length,
        total_orders: orders.length,
        total_revenue: 0,
        fraud_alerts: fraudLogs.length,
        average_order_value: 0,
      },
      users: {
        adults: users.filter((user) => user.role !== 'child' || user.is_adult).length,
        children: users.filter((user) => user.role === 'child' || user.is_adult === false).length,
        admins: users.filter((user) => user.role === 'admin').length,
      },
      orders: {
        completed: orders.filter((order) => ['PAGADO', 'COMPLETADA', 'APROBADO'].includes(order.estado)).length,
        pending: orders.filter((order) => ['PENDIENTE', 'PROCESANDO'].includes(order.estado)).length,
        rejected: orders.filter((order) => ['RECHAZADO', 'CANCELADO'].includes(order.estado)).length,
      },
      today: {
        new_orders: orders.filter((order) => String(order.fecha_creacion || '').slice(0, 10) === todayDate).length,
        new_users: users.filter((user) => String(user.created_at || '').slice(0, 10) === todayDate).length,
        fraud_incidents: fraudLogs.filter((log) => String(log.created_at || '').slice(0, 10) === todayDate).length,
      },
    };
  }

  function mapearUsuarioAdmin(user, childrenByParent) {
    return {
      id: user.id,
      email: user.email,
      name: user.nombre || 'N/A',
      role: user.role,
      is_adult: user.is_adult,
      created_at: user.created_at,
      bloqueado: user.bloqueado || false,
      children_count: childrenByParent[String(user.id)] || 0,
    };
  }

  function mapearEntradaColaPedido(order) {
    return construirEntradaColaPedidos({
      id: order.id,
      child_id: order.id_perfil,
      child_name: order.perfiles?.nombre_completo || 'Sin nombre',
      child_email: null,
      status: order.estado,
      notes: '',
      created_at: order.fecha_creacion,
    }, (order.lineas_pedido || []).map((item) => ({
      product_id: item.id_producto_menu,
      product_name: item.nombre_producto,
      quantity: 1,
      price: item.precio_compra,
      subtotal: item.precio_compra,
      notes: item.notas || '',
      allergens: parsearArrayJson(item.productos_menu?.alergenos),
    })));
  }

  return {
    async obtenerMetricas() {
      requireSupabase();

      const [
        { data: users, error: usersError },
        { data: orders, error: ordersError },
        { data: fraudLogs, error: fraudError },
      ] = await repository.obtenerDatosMetricas();

      if (usersError) throw usersError;
      if (ordersError) throw ordersError;
      if (fraudError) throw fraudError;

      return construirMetricas({
        users: users || [],
        orders: orders || [],
        fraudLogs: fraudLogs || [],
      });
    },

    async listarFraudLogs() {
      requireSupabase();

      const { data, error } = await repository.listarFraudLogs();
      if (error) throw error;

      return {
        logs: (data || []).map((log) => ({
          ...log,
          user_name: log.user_id ? `Usuario #${log.user_id}` : 'Sistema',
        })),
      };
    },

    async listarUsuarios() {
      requireSupabase();

      const { data: users, error } = await repository.listarUsuarios();
      if (error) throw error;

      const { data: links, error: linksError } = await repository.listarVinculosActivosPadres();
      if (linksError) throw linksError;

      const childrenByParent = contarHijosPorPadre(links || []);

      return {
        users: (users || []).map((user) => mapearUsuarioAdmin(user, childrenByParent)),
      };
    },

    async actualizarBloqueoUsuario(params, body) {
      requireSupabase();

      const idValidation = validarIdUsuario(params.id);
      lanzarSiInvalido(idValidation);
      const bloqueoValidation = validarBloqueoUsuario(body);

      const { data, error } = await repository.actualizarBloqueoUsuario(
        idValidation.id,
        bloqueoValidation.bloqueado,
      );

      if (error) throw envolverErrorSupabase(error, 'Error al bloquear usuario', true);
      const user = obtenerPrimerRegistro(data);
      if (!user) throw crearError(404, 'Usuario no encontrado');

      return {
        message: `Usuario ${bloqueoValidation.bloqueado ? 'bloqueado' : 'desbloqueado'} correctamente`,
        user,
      };
    },

    async actualizarUsuario(params, body) {
      requireSupabase();

      const idValidation = validarIdUsuario(params.id);
      lanzarSiInvalido(idValidation);

      const cambiosValidation = validarCambiosUsuario(body);
      lanzarSiInvalido(cambiosValidation);

      const { data, error } = await repository.actualizarUsuario(idValidation.id, cambiosValidation.updateData);
      if (error) throw envolverErrorSupabase(error, 'Error al actualizar usuario', true);

      const user = obtenerPrimerRegistro(data);
      if (!user) throw crearError(404, 'Usuario no encontrado');

      return { message: 'Usuario actualizado correctamente', user };
    },

    async eliminarUsuario(params) {
      requireSupabase();

      const idValidation = validarIdUsuario(params.id);
      lanzarSiInvalido(idValidation);

      const { error } = await repository.eliminarUsuario(idValidation.id);
      if (error) throw envolverErrorSupabase(error, 'Error al eliminar usuario', true);

      return { message: 'Usuario eliminado correctamente' };
    },

    async listarColaPedidos() {
      requireSupabase();

      const { data: orders, error } = await repository.listarColaPedidos();
      if (error) throw error;

      return { orders: (orders || []).map(mapearEntradaColaPedido) };
    },
  };
}
