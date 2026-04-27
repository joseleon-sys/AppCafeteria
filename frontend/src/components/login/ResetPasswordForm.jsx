import React from "react";
import FormMessage from "./FormMessage";

export default function ResetPasswordForm({ fields, loading, error, maxDate, onSubmit, onFieldChange, onLoginMode }) {
  return (
    <div className="flip-card__front" style={{ position: "relative", width: "100%" }}>
      <div className="title">Restablecer contraseña</div>
      <form className="flip-card__form" onSubmit={onSubmit}>
        <input
          className="flip-card__input"
          name="email"
          placeholder="Correo electrónico"
          type="email"
          value={fields.resetEmail}
          onChange={(e) => onFieldChange("resetEmail", e.target.value)}
          required
        />
        <input
          className="flip-card__input"
          placeholder="Fecha de nacimiento"
          type="date"
          value={fields.resetBirthDate}
          onChange={(e) => onFieldChange("resetBirthDate", e.target.value)}
          required
          max={maxDate}
        />
        <input
          className="flip-card__input"
          placeholder="Nueva contraseña"
          type="password"
          value={fields.resetPassword}
          onChange={(e) => onFieldChange("resetPassword", e.target.value)}
          required
        />
        <input
          className="flip-card__input"
          placeholder="Repite la nueva contraseña"
          type="password"
          value={fields.resetPasswordConfirm}
          onChange={(e) => onFieldChange("resetPasswordConfirm", e.target.value)}
          required
        />
        <button className="flip-card__btn" type="submit" disabled={loading}>
          {loading ? "Restableciendo..." : "Restablecer contraseña"}
        </button>
        <button
          className="flip-card__btn"
          type="button"
          disabled={loading}
          onClick={onLoginMode}
          style={{ marginTop: 12, background: "#e0c3a3", color: "#6b4226", boxShadow: "none" }}
        >
          Volver al login
        </button>
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          Verificamos tu identidad con el correo y la fecha de nacimiento registrada.
        </div>
        <FormMessage>{error}</FormMessage>
      </form>
    </div>
  );
}
