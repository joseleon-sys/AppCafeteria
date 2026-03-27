import React, { useEffect, useRef } from "react";
import "./Pixie.css";

// Simple SVG fairy (Pixie) with floating animation
export default function Pixie({ message = "¿How can I help you?" }) {
  const pixieRef = useRef();

  useEffect(() => {
    // Optional: add random movement or more complex animation here
  }, []);

  return (
    <div className="pixie-container">
      <div className="pixie-fairy" ref={pixieRef}>
        {/* Fairy SVG */}
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <ellipse cx="30" cy="40" rx="10" ry="16" fill="#fffbe6" stroke="#b08968" strokeWidth="2"/>
          <circle cx="30" cy="28" r="8" fill="#ffe6fa" stroke="#b08968" strokeWidth="2"/>
          <ellipse cx="20" cy="20" rx="6" ry="12" fill="#c3faff" fillOpacity="0.7"/>
          <ellipse cx="40" cy="20" rx="6" ry="12" fill="#c3faff" fillOpacity="0.7"/>
          <ellipse cx="15" cy="35" rx="4" ry="8" fill="#c3faff" fillOpacity="0.5"/>
          <ellipse cx="45" cy="35" rx="4" ry="8" fill="#c3faff" fillOpacity="0.5"/>
          <circle cx="30" cy="25" r="2" fill="#b08968"/>
        </svg>
        <div className="pixie-message">{message}</div>
      </div>
    </div>
  );
}
