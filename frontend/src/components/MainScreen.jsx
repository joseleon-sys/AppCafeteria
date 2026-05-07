// Pantalla principal del usuario autenticado: menu, catalogo y accesos a modales.
import React, { useState, useEffect, useRef } from "react";
import SideMenu from "./SideMenu";
import Categories from "./Categories";
import ProductsGrid from "./ProductsGrid";
import BottomNav from "./BottomNav";

const ALLERGEN_FILTERS = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'lactosa', label: 'Lactosa' },
  { value: 'huevo', label: 'Huevo' },
  { value: 'frutos secos', label: 'Frutos secos' },
  { value: 'pescado', label: 'Pescado' },
  { value: 'sesamo', label: 'Sesamo' },
  { value: 'sulfitos', label: 'Sulfitos' },
  { value: 'soja', label: 'Soja' }
];

export default function MainScreen({ user, onLogout, onShowSpinner, onShowCart, onShowHistory, onShowProfile, onShowLinkParent }) {
  const [selectedCategory, setSelectedCategory] = useState('cafes');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [allergenFilterOpen, setAllergenFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('catalog');
  const transitionDurationMs = 600;
  const specialModeActive = Boolean(user?.isAdult && String(user?.specialCode || '').trim().toLowerCase() === 'ayuda');
  const allergenFilterRef = useRef(null);

  useEffect(() => {
    const hamburger = document.getElementById('hamburger');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');

    const toggleMenu = () => {
      setMenuOpen(prev => !prev);
      sideMenu?.classList.toggle('hidden');
      overlay?.classList.toggle('hidden');
    };

    const closeMenu = () => {
      setMenuOpen(false);
      sideMenu?.classList.add('hidden');
      overlay?.classList.add('hidden');
    };

    hamburger?.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', closeMenu);

    return () => {
      hamburger?.removeEventListener('click', toggleMenu);
      overlay?.removeEventListener('click', closeMenu);
    };
  }, []);

  useEffect(() => {
    if (!allergenFilterOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (allergenFilterRef.current && !allergenFilterRef.current.contains(event.target)) {
        setAllergenFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [allergenFilterOpen]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory('all');
  };

  const handleSubcategoryChange = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };

  const handleBottomNavChange = (tabId) => {
    if (tabId === 'favorites') {
      setActiveSection('favorites');
      return;
    }

    setActiveSection('catalog');
  };

  const handleToggleAllergen = (allergenValue) => {
    setSelectedAllergens((prev) => (
      prev.includes(allergenValue)
        ? prev.filter((value) => value !== allergenValue)
        : [...prev, allergenValue]
    ));
  };

  const filterLabel = selectedAllergens.length === 0
    ? 'Alergenos'
    : selectedAllergens.length === 1
      ? `Sin ${selectedAllergens[0]}`
      : `Sin ${selectedAllergens.length} alergenos`;
  
  return (
    <main id="main-screen" className="screen" role="main">
      {/* HEADER PRINCIPAL */}
      <header className="app-header">
        <button id="hamburger" className="icon-btn" aria-label="Abrir menú lateral">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="header-title">
          <span className="app-name">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            Aula Café
          </span>
        </div>
        <div className="header-filter" ref={allergenFilterRef}>
          <button
            className={`header-filter-btn ${selectedAllergens.length > 0 ? 'is-active' : ''}`}
            aria-label="Filtrar por alérgenos"
            aria-haspopup="true"
            aria-expanded={allergenFilterOpen}
            onClick={() => setAllergenFilterOpen((prev) => !prev)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>{filterLabel}</span>
          </button>

          {allergenFilterOpen && (
            <div className="header-filter-menu" role="menu" aria-label="Opciones de alérgenos">
              <button
                type="button"
                className="header-filter-clear"
                onClick={() => setSelectedAllergens([])}
              >
                Mostrar todos
              </button>
              {ALLERGEN_FILTERS.map((allergen) => (
                <button
                  key={allergen.value}
                  type="button"
                  className={`header-filter-option ${selectedAllergens.includes(allergen.value) ? 'is-selected' : ''}`}
                  onClick={() => handleToggleAllergen(allergen.value)}
                >
                  <span>{allergen.label}</span>
                  {selectedAllergens.includes(allergen.value) && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Overlay para cerrar el menú */}
      <div id="overlay" className="overlay hidden"></div>

      <SideMenu onLogout={onLogout} onShowProfile={onShowProfile} onShowLinkParent={onShowLinkParent} />
      {activeSection === 'catalog' && !specialModeActive && (
        <Categories 
          onCategoryChange={handleCategoryChange}
          onSubcategoryChange={handleSubcategoryChange}
        />
      )}
      <ProductsGrid 
        user={user}
        mode={activeSection}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        selectedAllergens={selectedAllergens}
        onBackToCatalog={() => {
          onShowSpinner && onShowSpinner();
          setTimeout(() => {
            setActiveSection('catalog');
          }, transitionDurationMs);
        }}
      />
      <BottomNav 
        activeTab={activeSection === 'favorites' ? 'favorites' : 'home'}
        onTabChange={handleBottomNavChange}
        onShowSpinner={onShowSpinner} 
        onShowCart={onShowCart}
        onShowHistory={onShowHistory}
        onShowProfile={onShowProfile}
      />
    </main>
  );
}
// Pantalla principal del usuario autenticado: menu, catalogo y accesos a modales.
// Pantalla principal del usuario autenticado: menu, catalogo y accesos a modales.
