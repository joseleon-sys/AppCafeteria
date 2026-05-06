// Variante de pantalla de login mas sencilla o antigua del proyecto.
import React, { useState } from "react";
import { guardarTokensAuth, iniciarSesion } from "../lib/api";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function gestionarEnvio(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await iniciarSesion({ email, password });
      guardarTokensAuth(data);
      onLogin && onLogin(data.user);
    } catch (err) {
      setError(err.message || "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="login-screen" className="screen" role="main">
      <div className="card login-card">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/imagenesEjemplo/logoOscuro.png" alt="Aula Café Logo" style={{ width: '160px', height: 'auto' }} />
        </div>
        <h1>Aula Café</h1>
        <p className="subtitle">Bienvenido — inicia sesión con tu cuenta real</p>
        <form id="login-form" aria-label="Formulario de inicio de sesión" onSubmit={gestionarEnvio}>
          <label htmlFor="login-email" className="sr-only">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            placeholder="Correo electrónico"
            autoComplete="username"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="button-row">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" id="signup-btn" className="btn btn-outline">Crear cuenta</button>
          </div>
          {error && <p className="muted" style={{ color: "#b00" }}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
// Variante de pantalla de login mas sencilla o antigua del proyecto.
// Variante de pantalla de login mas sencilla o antigua del proyecto.
