import React from "react";
import { formatearNombreCompleto } from "../../hooks/useFancyLoginForm";
import FormMessage from "./FormMessage";

export default function SignupForm({ fields, loading, error, maxDate, isSignup, onSubmit, onFieldChange }) {
  return (
    <div className="flip-card__back" style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      boxShadow: isSignup ? "4px 10px var(--main-color)" : "none",
      transform: "rotateY(180deg)",
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
    }}>
      <div className="title">Crear cuenta</div>
      <form className="flip-card__form" onSubmit={onSubmit}>
        <input
          className="flip-card__input"
          placeholder="Nombre y apellidos"
          type="text"
          value={fields.signupName}
          onChange={(e) => onFieldChange("signupName", e.target.value)}
          onBlur={(e) => onFieldChange("signupName", formatearNombreCompleto(e.target.value))}
          required
        />
        <input
          className="flip-card__input"
          name="email"
          placeholder="Correo electrónico"
          type="email"
          value={fields.signupEmail}
          onChange={(e) => onFieldChange("signupEmail", e.target.value)}
          required
        />
        <input
          className="flip-card__input"
          name="password"
          placeholder="Contraseña (mín. 6 caracteres)"
          type="password"
          value={fields.signupPassword}
          onChange={(e) => onFieldChange("signupPassword", e.target.value)}
          required
        />
        <input
          className="flip-card__input"
          name="confirmPassword"
          placeholder="Repite la contraseña"
          type="password"
          value={fields.signupPasswordConfirm}
          onChange={(e) => onFieldChange("signupPasswordConfirm", e.target.value)}
          required
        />
        <input
          className="flip-card__input"
          placeholder="Fecha de nacimiento"
          type="date"
          value={fields.signupBirthDate}
          onChange={(e) => onFieldChange("signupBirthDate", e.target.value)}
          required
          max={maxDate}
        />
        <button className="flip-card__btn" type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          Usa nombre real (Nombre Apellido). El alias se configura luego en Perfil.
        </div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          Si eres mayor de 18 años, recibirás un token para vincular hijos
        </div>
        <FormMessage>{error}</FormMessage>
      </form>
    </div>
  );
}
