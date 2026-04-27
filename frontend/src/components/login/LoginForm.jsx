import React from "react";
import FormMessage from "./FormMessage";

export default function LoginForm({ fields, loading, error, isSignup, onSubmit, onFieldChange, onResetMode }) {
  return (
    <div className="flip-card__front" style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      boxShadow: isSignup ? "none" : undefined,
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
    }}>
      <div className="title">Iniciar sesión</div>
      <form className="flip-card__form" onSubmit={onSubmit}>
        <input
          className="flip-card__input"
          name="email"
          placeholder="Correo electrónico"
          type="email"
          value={fields.loginEmail}
          onChange={(e) => onFieldChange("loginEmail", e.target.value)}
          required
        />
        <input
          className="flip-card__input"
          name="password"
          placeholder="Contraseña"
          type="password"
          value={fields.loginPassword}
          onChange={(e) => onFieldChange("loginPassword", e.target.value)}
          required
        />
        <button className="flip-card__btn" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <button
          className="flip-card__btn"
          type="button"
          disabled={loading}
          onClick={onResetMode}
          style={{ marginTop: 12, background: "#e0c3a3", color: "#6b4226", boxShadow: "none" }}
        >
          He olvidado mi contraseña
        </button>
        <FormMessage>{error}</FormMessage>
      </form>
    </div>
  );
}
