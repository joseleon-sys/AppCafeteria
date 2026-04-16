export function registerSystemRoutes(app) {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}

export function registerNotFoundHandler(app) {
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });
}
