import React from "react";

const baseButtonStyle = {
  border: "none",
  padding: "8px 24px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 16,
  position: "relative",
  zIndex: 10,
};

function toggleStyle(active, side) {
  return {
    ...baseButtonStyle,
    background: active ? "#6b4226" : "#e0c3a3",
    color: active ? "#fff" : "#6b4226",
    borderRadius: side === "left" ? "20px 0 0 20px" : "0 20px 20px 0",
  };
}

export default function AuthModeToggle({ isSignup, isResetMode, onLogin, onSignup }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 24 }}>
      <button
        className="login-toggle-btn"
        style={toggleStyle(!isSignup && !isResetMode, "left")}
        onClick={onLogin}
      >
        Iniciar sesión
      </button>
      <button
        className="login-toggle-btn"
        style={toggleStyle(isSignup && !isResetMode, "right")}
        onClick={onSignup}
      >
        Crear cuenta
      </button>
    </div>
  );
}
