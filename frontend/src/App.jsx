import React, { useEffect, useState } from 'react'
import logoOscuroLinea from '../imagenesEjemplo/logoOscuroLinea.png'
import CartPreview from './pages/CartPreview'
import SpinnerDemo from './pages/SpinnerDemo'

// Añadir variables para controlar las diferentes vistas
const SHOW_CART_PREVIEW = window.location.search.includes('preview=cart')
const SHOW_SPINNER_DEMO = window.location.search.includes('preview=spinner')

const CATEGORIES = [
  {id:'cafes',name:'Cafés'},
  {id:'sandwich',name:'Bocadillos'},
  {id:'dulces',name:'Dulces'},
  {id:'bebidas',name:'Bebidas'},
  {id:'otros',name:'Otros'}
]

const PRODUCTS = {
  cafes:[{id:'c1',name:'Café solo',price:1.2},{id:'c2',name:'Café con leche',price:1.8}],
  sandwich:[{id:'b1',name:'Bocadillo jamón',price:3.5},{id:'b2',name:'Bocadillo vegetal',price:3}],
  dulces:[{id:'d1',name:'Croissant',price:1.5}],
  bebidas:[{id:'be1',name:'Zumo naranja',price:2.5}],
  otros:[{id:'o1',name:'Agua',price:1}]
}

function Header(){
  return (
    <header className="app-header brand">
      <button className="icon-btn" aria-label="menu"><span className="hamburger"/></button>
      <div className="title">
        <img src={logoOscuroLinea} alt="CafeteriaApp" style={{ height: '48px', marginRight: '12px' }} />
        <span className="app-name">CafeteriaApp</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn svg-btn" 
          title="Preview Carrito" 
          aria-label="Preview Carrito"
          onClick={() => window.open('?preview=cart', '_blank')}
        >
          🛒
        </button>
        <button 
          className="btn svg-btn" 
          title="Demo Spinner" 
          aria-label="Demo Spinner"
          onClick={() => window.open('?preview=spinner', '_blank')}
        >
          🐹
        </button>
        <button className="btn svg-btn" title="Cerrar sesión" aria-label="Cerrar sesión">⎋</button>
      </div>
    </header>
  )
}

function TopBar(){
  return (
    <div className="top-bar">
      <div className="location">Bilzen, Tanjungbalai</div>
      <div className="search-row">
        <input id="search" className="search-input" placeholder="Buscar café, bebida o snack" />
        <button id="filter-btn" className="icon-btn filter-btn" aria-label="Filtros">☰</button>
      </div>
    </div>
  )
}

function Categories({categories, active, onSelect}){
  return (
    <div className="categories-wrap">
      <div className="categories" id="categories">
        {categories.map(cat=> (
          <button key={cat.id} className={`category ${active===cat.id? 'active':''}`} onClick={()=>onSelect(cat.id)}>{cat.name}</button>
        ))}
      </div>
    </div>
  )
}

function ProductCard({p, onOpen}){
  return (
    <div className="product-card">
      <div className="rating">★ 4.8</div>
      <div className="product-image" dangerouslySetInnerHTML={{__html:`<svg width=34 height=34 viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M3 7h12v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7z' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/><path d='M17 9a3 3 0 0 1 0 6' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/></svg>`}} />
      <div className="product-info"><h4>{p.name}</h4><div className="meta">{p.price.toFixed(2)} €</div></div>
      <div className="card-bottom"><div className="price">{p.price.toFixed(2)} €</div><button className="add-btn" onClick={()=>onOpen(p)}>+</button></div>
    </div>
  )
}

function Drawer({product, open, onClose, onAdd}){
  if(!open || !product) return null
  return (
    <aside className="drawer" role="dialog" aria-modal="true">
      <div className="drawer-header"><h3>{product.name}</h3><button className="icon-btn" onClick={onClose}>✕</button></div>
      <div className="drawer-body">Personaliza {product.name} aquí.</div>
      <div className="drawer-footer"><div className="price">{product.price.toFixed(2)} €</div><button className="btn primary" onClick={()=>onAdd(product)}>Añadir al carrito</button></div>
    </aside>
  )
}

function BottomNav(){
  return (
    <nav className="bottom-nav">
      <button className="nav-btn">Inicio</button>
      <button className="nav-btn">Pedidos</button>
      <button className="nav-btn central">+</button>
      <button className="nav-btn">Historial</button>
      <button className="nav-btn">Perfil</button>
    </nav>
  )
}

export default function App(){
  // Si está en modo preview del carrito, mostrar solo el preview
  if (SHOW_CART_PREVIEW) {
    return <CartPreview />
  }
  
  // Si está en modo demo del spinner, mostrar solo el demo
  if (SHOW_SPINNER_DEMO) {
    return <SpinnerDemo />
  }

  const [active, setActive] = useState(CATEGORIES[0].id)
  const [items, setItems] = useState(PRODUCTS[active]||[])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(()=>{ setItems(PRODUCTS[active]||[]) },[active])

  function openDrawer(p){ setSelected(p); setDrawerOpen(true) }
  function closeDrawer(){ setDrawerOpen(false); setSelected(null) }
  function addToCart(p){
    const cart = JSON.parse(localStorage.getItem('caf_cart')||'[]')
    cart.push({id:Date.now().toString(), productId:p.id, name:p.name, price:p.price})
    localStorage.setItem('caf_cart', JSON.stringify(cart))
    alert('Añadido al carrito: '+p.name)
    closeDrawer()
  }

  return (
    <div>
      <Header />
      <Categories categories={CATEGORIES} active={active} onSelect={setActive} />
      <main className="content">
        <div id="products" className="products">
          {items.map(p=> <ProductCard key={p.id} p={p} onOpen={openDrawer} />)}
        </div>
      </main>
      <Drawer product={selected} open={drawerOpen} onClose={closeDrawer} onAdd={addToCart} />
      <BottomNav />
    </div>
  )
}
