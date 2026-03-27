# CONTRATO DE API (Backend <-> Frontend) v1.0

Este documento define la estructura EXACTA de los datos.
- Backend: Tus endpoints deben devolver este JSON.
- Frontend: Tus componentes deben esperar recibir estas propiedades.

---

## 1. OBTENER PRODUCTOS
`GET /api/products`

Debe devolver un array con todos los productos activos.

[
  {
    "id": 1,
    "name": "Café con Leche",
    "description": "Café espresso con leche espumada.",
    "price": 1.20,
    "original_price": 1.50,  // Opcional: Si existe, el Front tacha este precio (Oferta)
    "category": "cafes",     // IMPORTANTE: Debe coincidir con los IDs del filtro visual ('cafes', 'sandwich', 'dulces')
    "image": "https://images.unsplash.com/photo-1541167760496-1628856ab772",
    "badges": ["popular", "nuevo"], // Etiquetas visuales para la tarjeta
    "allergens": ["lactosa"],       // Para mostrar el icono de alerta rojo
    "options": {
      // Configuración para el Drawer de personalización
      "sugar": { 
        "available": true, 
        "max": 3, 
        "step": 1,
        "price_per_unit": 0.00 
      },
      "removables": ["leche", "cacao", "canela"] // Lista de cosas que se pueden quitar (Checkboxes)
    }
  },
  {
    "id": 2,
    "name": "Bocadillo de Jamón",
    "price": 3.50,
    "category": "sandwich",
    "image": "https://images.unsplash.com/photo-1553909489-cd47e332431e",
    "badges": [],
    "allergens": ["gluten"],
    "options": {
      "sugar": { "available": false }, // Este producto no lleva azúcar
      "removables": ["tomate", "aceite", "sal"]
    }
  }
]

---

## 2. CREAR UN PEDIDO
`POST /api/orders`

Lo que el Frontend envía cuando el usuario pulsa "Pagar".

{
  "user_id": 101, // ID del usuario que hace el pedido
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "notes": "Muy caliente por favor",
      "chosen_options": {
        // Aquí enviamos la configuración elegida por el usuario
        "sugar": 2,           // Quería 2 de azúcar
        "removed": ["cacao"]  // Quería quitar el cacao
      }
    },
    {
      "product_id": 2,
      "quantity": 1,
      "chosen_options": {
        "removed": ["tomate"] // Bocadillo sin tomate
      }
    }
  ]
}

Respuesta esperada (200 OK):
{
  "order_id": 5050,
  "status": "PAID",
  "new_balance": 15.50, // Saldo restante del usuario
  "message": "Pedido confirmado correctamente"
}

---

## 3. CONSULTAR SALDO (Monedero)
`GET /api/users/101/balance`

{
  "user_id": 101,
  "current_balance": 15.50,
  "currency": "EUR"
}