// Barra superior con buscador y acceso a filtros.
import React from "react";

export default function TopBar() {
  return (
    <div className="top-bar">
      <div className="search-wrapper">
        <label htmlFor="search-input" className="sr-only">Buscar productos</label>
        <input id="search-input" className="search-input" type="search" placeholder="Buscar café, bebida o snack..." aria-label="Buscar productos" />
        <button id="filter-btn" className="btn-filter" aria-label="Abrir filtros">☰</button>
      </div>
    </div>
  );
}
