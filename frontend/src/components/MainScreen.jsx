import React, { useState, useEffect } from "react";
import SideMenu from "./SideMenu";
import Categories from "./Categories";
import ProductsGrid from "./ProductsGrid";
import BottomNav from "./BottomNav";

export default function MainScreen({ onLogout, onShowSpinner, onShowCart, onShowHistory, onShowProfile, onShowLinkParent }) {
  const [selectedCategory, setSelectedCategory] = useState('cafes');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('catalog');
  const transitionDurationMs = 600;

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
            CafeteriaApp
          </span>
        </div>
        <button className="icon-btn" aria-label="Buscar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </header>

      {/* Overlay para cerrar el menú */}
      <div id="overlay" className="overlay hidden"></div>

      <SideMenu onLogout={onLogout} onShowProfile={onShowProfile} onShowLinkParent={onShowLinkParent} />
      {activeSection === 'catalog' && (
        <Categories 
          onCategoryChange={handleCategoryChange}
          onSubcategoryChange={handleSubcategoryChange}
        />
      )}
      <ProductsGrid 
        mode={activeSection}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
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
