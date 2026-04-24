// Este archivo crea la app y lanza el servidor HTTP.
import { createServerApp } from './app/createServerApp.js';

const { iniciarServidor } = createServerApp();

// Arranque real del backend.
iniciarServidor();
