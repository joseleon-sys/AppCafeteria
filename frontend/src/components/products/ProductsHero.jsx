import React from "react";

export function SpecialModeHero() {
  return (
    <div className="favorites-hero" style={{ marginBottom: 16 }}>
      <div className="favorites-hero-copy">
        <span className="favorites-eyebrow">Modo especial</span>
        <h3>Catálogo adaptado</h3>
        <p>Solo se muestran productos con el alérgeno ayuda y todos aparecen a 0 €.</p>
      </div>
    </div>
  );
}

export function FavoritesHero({ count, onBackToCatalog }) {
  return (
    <div className="favorites-hero">
      <div className="favorites-hero-copy">
        <span className="favorites-eyebrow">Tu selección</span>
        <h3>Favoritos</h3>
        <p>
          {count > 0
            ? `Aquí tienes ${count} producto${count === 1 ? "" : "s"} guardado${count === 1 ? "" : "s"} para volver rápido a ellos.`
            : "Todavía no has marcado ningún producto como favorito."}
        </p>
      </div>
      <button className="favorites-back-btn" onClick={() => onBackToCatalog && onBackToCatalog()}>
        Ver catálogo
      </button>
    </div>
  );
}
