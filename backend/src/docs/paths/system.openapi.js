export const systemPaths = {
  '/api/health': {
    get: {
      tags: ['System'],
      summary: 'Comprueba el estado del backend',
      responses: { 200: { description: 'Servicio disponible' } },
    },
  },
};
