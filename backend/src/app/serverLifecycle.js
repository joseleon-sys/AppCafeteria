export function createServerLifecycle({ app, port, obtenerResumenProductosActivos }) {
  return async function iniciarServidor() {
    app.listen(port, () => {
      console.log(`Servidor corriendo en http://localhost:${port}`);

      void (async () => {
        try {
          const productSummary = await obtenerResumenProductosActivos();
          console.log(`Productos disponibles (${productSummary.source}): ${productSummary.count}`);
        } catch (error) {
          console.error('No se pudo obtener el resumen inicial de productos:', error);
        }
      })();
    });
  };
}
