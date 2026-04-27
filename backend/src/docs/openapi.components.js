export const openApiTags = [
  { name: 'System', description: 'Salud y estado del servicio' },
  { name: 'Auth', description: 'Autenticacion, perfil, favoritos y notificaciones' },
  { name: 'Productos', description: 'Menu publico y administracion de productos' },
  { name: 'Pedidos', description: 'Pedidos de usuarios adultos y pagos Stripe' },
  { name: 'Familia', description: 'Vinculacion padre-hijo y pedidos infantiles' },
  { name: 'Admin', description: 'Panel administrativo, usuarios, metricas y cola de pedidos' },
];

export const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  schemas: {
    ErrorResponse: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Solicitud invalida' },
        message: { type: 'string', example: 'Faltan campos requeridos' },
      },
    },
    AuthTokens: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'jwt-access-token' },
        refreshToken: { type: 'string', example: 'refresh-token' },
      },
    },
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'user-id' },
        email: { type: 'string', format: 'email', example: 'usuario@example.com' },
        name: { type: 'string', example: 'Usuario Demo' },
        role: { type: 'string', example: 'adult' },
        is_adult: { type: 'boolean', example: true },
      },
    },
    RegisterRequest: {
      type: 'object',
      required: ['email', 'password', 'name', 'birthDate'],
      properties: {
        email: { type: 'string', format: 'email', example: 'usuario@example.com' },
        password: { type: 'string', minLength: 6, example: 'secret123' },
        name: { type: 'string', example: 'Usuario Demo' },
        birthDate: { type: 'string', format: 'date', example: '2000-01-01' },
      },
    },
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'usuario@example.com' },
        password: { type: 'string', example: 'secret123' },
      },
    },
    RefreshTokenRequest: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'refresh-token' },
      },
    },
    ProductInput: {
      type: 'object',
      required: ['name', 'price', 'category'],
      properties: {
        name: { type: 'string', example: 'Bocadillo vegetal' },
        description: { type: 'string', example: 'Pan integral con verduras' },
        price: { type: 'number', format: 'float', example: 3.5 },
        category: { type: 'string', example: 'Bocadillos' },
        active: { type: 'boolean', example: true },
        image_url: { type: 'string', example: 'https://example.com/product.jpg' },
        badges: { type: 'array', items: { type: 'string' }, example: ['vegetariano'] },
        allergens: { type: 'array', items: { type: 'string' }, example: ['gluten'] },
        options: { type: 'object', additionalProperties: true },
        ingredients: { type: 'array', items: { type: 'string' } },
        contains_info: { type: 'string' },
        conservation: { type: 'string' },
        shelf_life_hours: { type: 'number', example: 24 },
        calories_kcal: { type: 'number', example: 420 },
        nutrition_table: { type: 'object', additionalProperties: true },
        sanitary_approved: { type: 'boolean', example: true },
        sanitary_notes: { type: 'string' },
        approved_at: { type: 'string', nullable: true },
      },
    },
    Product: {
      allOf: [
        { $ref: '#/components/schemas/ProductInput' },
        {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'product-id' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      ],
    },
    OrderItem: {
      type: 'object',
      required: ['product_id', 'quantity'],
      properties: {
        product_id: { type: 'string', example: 'product-id' },
        quantity: { type: 'integer', minimum: 1, maximum: 50, example: 2 },
        notes: { type: 'string', example: 'Sin tomate' },
        chosen_options: { type: 'object', additionalProperties: true },
      },
    },
    CreateOrderRequest: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/components/schemas/OrderItem' },
        },
      },
    },
    Order: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'order-id' },
        status: { type: 'string', example: 'pending' },
        total: { type: 'number', example: 7 },
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/OrderItem' },
        },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
    ChildOrderInput: {
      allOf: [
        { $ref: '#/components/schemas/CreateOrderRequest' },
        {
          type: 'object',
          properties: {
            parent_id: { type: 'string', example: 'parent-user-id' },
            notes: { type: 'string', example: 'Para el recreo' },
          },
        },
      ],
    },
    LinkParentRequest: {
      type: 'object',
      required: ['tokenPadre'],
      properties: {
        tokenPadre: { type: 'string', example: 'ABC123' },
      },
    },
    RejectRequest: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', minLength: 3, example: 'Pedido no permitido hoy' },
      },
    },
    AdminUserUpdate: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nuevo Nombre' },
        email: { type: 'string', format: 'email', example: 'nuevo@example.com' },
        role: { type: 'string', example: 'admin' },
      },
    },
  },
  parameters: {
    IdParam: {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    StatusQuery: {
      name: 'status',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
    LimitQuery: {
      name: 'limit',
      in: 'query',
      required: false,
      schema: { type: 'integer', minimum: 0 },
    },
  },
  responses: {
    Unauthorized: {
      description: 'Token ausente o invalido',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    Forbidden: {
      description: 'Permisos insuficientes',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    NotFound: {
      description: 'Recurso no encontrado',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
    ValidationError: {
      description: 'Payload o parametros invalidos',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
    },
  },
};
