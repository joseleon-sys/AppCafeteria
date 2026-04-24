// Punto de entrada del frontend React.
import React from 'react'
import { createRoot } from 'react-dom/client'
import './lib/sentry'
import AppMovil from './AppMovil'
import { CartProvider } from './lib/CartContext'
import './styles/styles.css'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(
  // El proveedor del carrito deja el estado del carrito accesible desde toda la app.
  <CartProvider>
    <AppMovil />
  </CartProvider>
)
