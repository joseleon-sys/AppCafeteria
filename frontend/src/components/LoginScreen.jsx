
import React, { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (username === "demo" && password === "demo") {
      setError("");
      onLogin && onLogin();
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  }

  return (
    <main id="login-screen" className="screen" role="main">
      <div className="card login-card">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/imagenesEjemplo/logoOscuro.png" alt="CafeteriaApp Logo" style={{ width: '160px', height: 'auto' }} />
        </div>
        <h1>CafeteriaApp</h1>
        <p className="subtitle">Bienvenido — inicia sesión o crea una cuenta</p>
        <form id="login-form" aria-label="Formulario de inicio de sesión" onSubmit={handleSubmit}>
          <label htmlFor="login-username" className="sr-only">Usuario</label>
          <input
            id="login-username"
            type="text"
            placeholder="Usuario"
            autoComplete="username"
            required
            aria-required="true"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <label htmlFor="login-password" className="sr-only">Contraseña</label>
          <input
            id="login-password"
            type="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            required
            aria-required="true"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div className="button-row">
            <button type="submit" className="btn btn-primary">Entrar</button>
            <button type="button" id="signup-btn" className="btn btn-outline">Crear cuenta</button>
          </div>
          {error && <p className="muted" style={{ color: "#b00" }}>{error}</p>}
          <p className="demo-hint muted">
            Usuario demo: <strong>demo</strong> / Contraseña: <strong>demo</strong>
          </p>
        </form>
      </div>
    </main>
  );
}
