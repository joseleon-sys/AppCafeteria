# Frontend - CafeteriaSSG

Aplicación móvil/web con Ionic React para la cafetería.

## Requisitos

- Node.js 18+ (recomendado LTS)
- npm o pnpm

## Dependencias necesarias del frontend

El frontend usa estas dependencias de `npm`:

- Producción: `react`, `react-dom`, `@ionic/react`, `ionicons`, `@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/push-notifications`
- Desarrollo: `vite`

Si aparece un error tipo `vite: not found`, significa que falta instalar las dependencias de `frontend/`.

## Instalar dependencias

Desde la carpeta `frontend/`:

```powershell
cd frontend
npm install
```

Si prefieres instalar exactamente lo fijado en `package-lock.json`:

```powershell
cd frontend
npm ci
```

## Ejecutar en modo desarrollo

```powershell
npm run dev
```

La aplicación arranca en [http://localhost:5173](http://localhost:5173) (Vite default).

## Verificación rápida

Después de instalar dependencias, estos comandos deben funcionar:

```powershell
cd frontend
npm run dev
npm run build
```

Si faltaban paquetes, el error `vite not found` debería desaparecer.

## Ejecutar como aplicación Ionic (con recarga en vivo)

```powershell
ionic serve
```

## Variables de entorno

Crea un archivo `.env` en la carpeta `frontend/` con:

```env
VITE_API_URL=http://localhost:3000
VITE_SENTRY_DSN=https://tu-dsn@sentry.io/proyecto
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_RELEASE=cafeteria-frontend@0.1.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0
VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE=1
VITE_SENTRY_ENABLED=true
```

Si `VITE_SENTRY_DSN` esta vacio, Sentry queda desactivado. Session Replay esta configurado para enmascarar texto y bloquear media por privacidad.

Ejemplo de uso en React:

```javascript
const API_URL = import.meta.env.VITE_API_URL;

const response = await fetch(`${API_URL}/api/menu`);
const data = await response.json();
```

## Estructura del frontend

```
frontend/
├── src/
│   ├── pages/          # Páginas/pantallas (Home, Menu, Order, Profile)
│   ├── components/     # Componentes reutilizables (Button, Header, Card)
│   ├── hooks/          # Hooks personalizados (useMenu, useOrders)
│   ├── lib/            # Utilidades (axios config, helpers)
│   ├── styles/         # Estilos globales y variables
│   ├── App.jsx         # Componente principal
│   └── main.jsx        # Punto de entrada
├── public/             # Assets estáticos
├── index.html
├── package.json
└── README.md           # Este archivo
```

## Conectar con el backend

El frontend consume la API REST del backend (por defecto en `http://localhost:3000`).

Ejemplo de llamada GET:

```javascript
const fetchMenu = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/menu');
    const { data } = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error al obtener menú:', error);
  }
};
```

Ejemplo de llamada POST (crear orden):

```javascript
const createOrder = async (orderData) => {
  try {
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const result = await response.json();
    console.log('Orden creada:', result);
  } catch (error) {
    console.error('Error al crear orden:', error);
  }
};
```

Notas sobre persistencia en desarrollo:

- Si el backend trabaja con usuarios UUID, el pedido termina en `pedidos` y `lineas_pedido`.
- Si el backend trabaja con usuarios legacy con ID numerico, el pedido termina en `orders` y `order_items`.
- Con `DEV_BYPASS_STRIPE_PAYMENT`, el pedido ya no deberia quedarse solo en cache local salvo que la base de datos este caida.

## Build para producción

```powershell
npm run build
```

Los archivos estáticos se generan en `dist/`.

## Ionic build para dispositivos

Para Android:

```powershell
ionic capacitor add android
ionic capacitor sync
ionic capacitor run android
```

Para iOS (requiere macOS y Xcode):

```powershell
ionic capacitor add ios
ionic capacitor sync
ionic capacitor open ios
```

## Buenas prácticas

- Usar variables de entorno (VITE_*) para URLs y configuraciones.
- Validar inputs antes de enviar al backend.
- Manejar errores de red con feedback visual.
- Usar hooks personalizados para encapsular lógica (useMenu, useOrders).
- Componentizar la UI (evitar duplicar código).

## Recursos

- [Ionic React Docs](https://ionicframework.com/docs/react)
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
