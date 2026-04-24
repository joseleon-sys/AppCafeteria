// Pagina de demostracion para probar visualmente el spinner personalizado.
import React from "react";
import HamsterSpinner from "../components/HamsterSpinner";
import "../components/HamsterSpinner.css";

export default function SpinnerDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <h2>Demo: Hamster Spinner</h2>
      <HamsterSpinner size={120} color="#ff9800" />
      <p>Este es Federico</p>
    </div>
  );
}
