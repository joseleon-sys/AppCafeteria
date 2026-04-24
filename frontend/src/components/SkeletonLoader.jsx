// Placeholders de carga para evitar saltos visuales mientras llegan datos.
import React from "react";
import "./SkeletonLoader.css";

export default function SkeletonLoader({ type = "product", count = 1 }) {
  const ProductSkeleton = () => (
    <div className="skeleton-product-card">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-description"></div>
        <div className="skeleton-price"></div>
      </div>
    </div>
  );

  const CategorySkeleton = () => (
    <div className="skeleton-category"></div>
  );

  if (type === "categories") {
    return (
      <div className="skeleton-categories">
        {Array.from({ length: 5 }, (_, i) => (
          <CategorySkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }, (_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
