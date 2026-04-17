import React from 'react'
import { createRoot } from 'react-dom/client'
import './lib/sentry'
import AppMobile from './AppMobile'
import { CartProvider } from './lib/CartContext'
import './styles/styles.css'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(
  <CartProvider>
    <AppMobile />
  </CartProvider>
)
