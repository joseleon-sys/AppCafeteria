import {
  validarCambiosProducto,
  validarIdProducto,
  validarProductoCompleto,
} from './product.validators.js';

class ProductServiceError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.exposeDetails = Boolean(options.exposeDetails);
    this.details = options.details;
  }
}

function crearError(statusCode, message, options) {
  return new ProductServiceError(statusCode, message, options);
}

const SUPABASE_UPDATE_MAP = {
  name: 'nombre',
  price: 'precio',
  active: 'activo',
  allergens: 'alergenos',
};

export function crearProductService(deps, repository) {
  const {
    supabase,
    normalizarPayloadProductoEntrante,
    normalizarPayloadParcialProductoEntrante,
    transformarProducto,
  } = deps;

  function requireSupabase() {
    if (!supabase) throw crearError(503, 'Supabase no esta configurado en el backend');
  }

  function ordenarProductos(productos) {
    return (productos || [])
      .map(transformarProducto)
      .sort((a, b) => {
        const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''), 'es');
        if (categoryCompare !== 0) return categoryCompare;
        return String(a.name || '').localeCompare(String(b.name || ''), 'es');
      });
  }

  function mapearProductoParaSupabase(product) {
    return {
      nombre: product.name,
      precio: product.price,
      activo: product.active,
      alergenos: product.allergens,
    };
  }

  function mapearCambiosParaSupabase(cambios) {
    const supabaseUpdate = {};
    const unsupportedKeys = [];

    Object.entries(cambios).forEach(([key, value]) => {
      const mappedKey = SUPABASE_UPDATE_MAP[key];
      if (!mappedKey) {
        unsupportedKeys.push(key);
        return;
      }

      supabaseUpdate[mappedKey] = value;
    });

    if (unsupportedKeys.length > 0) {
      throw crearError(
        400,
        `Los campos solicitados no existen en el esquema actual de Supabase: ${unsupportedKeys.join(', ')}`,
      );
    }

    return supabaseUpdate;
  }

  function obtenerPrimerProducto(data) {
    return Array.isArray(data) ? data[0] : null;
  }

  return {
    async listarProductosAdmin() {
      requireSupabase();

      const { data, error } = await repository.listarProductos();
      if (error) throw error;

      return { data: ordenarProductos(data) };
    },

    async listarMenuPublico() {
      requireSupabase();

      const { data, error } = await repository.listarProductosActivos();
      if (error) throw error;

      return { data: ordenarProductos(data) };
    },

    async crearProducto(body) {
      requireSupabase();

      const product = normalizarPayloadProductoEntrante(body);
      const validation = validarProductoCompleto(product);
      if (!validation.valid) throw crearError(validation.statusCode, validation.message);

      const { data, error } = await repository.crearProducto(mapearProductoParaSupabase(product));
      if (error) {
        throw crearError(500, 'No se pudo persistir el producto en Supabase', {
          details: error?.message || String(error),
          exposeDetails: true,
        });
      }

      const createdProduct = obtenerPrimerProducto(data);
      if (!createdProduct) throw crearError(500, 'Error al crear producto');

      return {
        statusCode: 201,
        data: transformarProducto(createdProduct),
        message: 'Producto creado correctamente',
      };
    },

    async actualizarProducto(params, body) {
      requireSupabase();

      const idValidation = validarIdProducto(params.id);
      if (!idValidation.valid) throw crearError(idValidation.statusCode, idValidation.message);

      const cambios = normalizarPayloadParcialProductoEntrante(body);
      const cambiosValidation = validarCambiosProducto(cambios);
      if (!cambiosValidation.valid) throw crearError(cambiosValidation.statusCode, cambiosValidation.message);

      const { data, error } = await repository.actualizarProducto(
        idValidation.id,
        mapearCambiosParaSupabase(cambios),
      );

      if (error) {
        throw crearError(500, 'No se pudo persistir la actualización en Supabase', {
          details: error?.message || String(error),
          exposeDetails: true,
        });
      }

      const updatedProduct = obtenerPrimerProducto(data);
      if (!updatedProduct) throw crearError(404, 'Producto no encontrado');

      return {
        data: transformarProducto(updatedProduct),
        message: 'Producto actualizado correctamente',
      };
    },

    async eliminarProducto(params, query) {
      requireSupabase();

      const idValidation = validarIdProducto(params.id);
      if (!idValidation.valid) throw crearError(idValidation.statusCode, idValidation.message);

      const isPermanent = query.permanent === 'true';
      const response = isPermanent
        ? await repository.eliminarProducto(idValidation.id)
        : await repository.actualizarProducto(idValidation.id, { activo: false });

      if (response.error) {
        throw crearError(500, 'No se pudo persistir la eliminación en Supabase', {
          details: response.error?.message || String(response.error),
          exposeDetails: true,
        });
      }

      const product = obtenerPrimerProducto(response.data);
      if (!product) throw crearError(404, 'Producto no encontrado');

      return {
        data: transformarProducto(product),
        message: isPermanent ? 'Producto eliminado permanentemente' : 'Producto desactivado correctamente',
      };
    },
  };
}
