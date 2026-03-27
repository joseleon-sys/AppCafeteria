
import React, { useState } from "react";
import './Categories.css';

const CATEGORIES = [
  { id: 'cafes', name: 'Cafés' },
  { id: 'bocadillos', name: 'Bocadillos' },
  { id: 'dulces', name: 'Dulces' },
  { id: 'bebidas', name: 'Bebidas' }
];

const SUBCATEGORIES = {
  cafes: [
    { id: 'all', name: 'Todos' },
    { id: 'con-leche', name: 'Con leche' },
    { id: 'solos', name: 'Solos' }
  ],
  bocadillos: [
    { id: 'all', name: 'Todos' },
    { id: 'bocadillos', name: 'Bocadillos' },
    { id: 'croissants', name: 'Croissants' },
    { id: 'sandwiches', name: 'Sándwiches' }
  ],
  bebidas: [
    { id: 'all', name: 'Todas' },
    { id: 'zumos', name: 'Zumos' },
    { id: 'agua', name: 'Agua' },
    { id: 'refrescos', name: 'Refrescos' }
  ]
};

export default function Categories({ onCategoryChange, onSubcategoryChange }) {
  const [selected, setSelected] = useState('cafes');
  const [subSelected, setSubSelected] = useState('all');

  const handleCategory = (cat) => {
    setSelected(cat);
    setSubSelected('all');
    onCategoryChange && onCategoryChange(cat);
    onSubcategoryChange && onSubcategoryChange('all');
  };
  
  const handleSubcategory = (sub) => {
    setSubSelected(sub);
    onSubcategoryChange && onSubcategoryChange(sub);
  };

  return (
    <div className="categories-container">
      <div className="categories" role="tablist" aria-label="Categorías de productos">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={"category" + (selected === cat.id ? " active" : "")}
            onClick={() => handleCategory(cat.id)}
            aria-selected={selected === cat.id}
            tabIndex={0}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {SUBCATEGORIES[selected] && (
        <div className="subcategories">
          {SUBCATEGORIES[selected].map(sub => (
            <button
              key={sub.id}
              className={"subcategory" + (subSelected === sub.id ? " active" : "")}
              onClick={() => handleSubcategory(sub.id)}
              aria-selected={subSelected === sub.id}
              tabIndex={0}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

