import React from "react";
import { guardarTokensAuth, iniciarSesion, registrarUsuario, restablecerContrasena } from "../lib/api";
import { showInfo, showSuccess } from "../components/Toast";

const normalizeSpaces = (value = "") => value.trim().replace(/\s+/g, " ");

export const formatearNombreCompleto = (value = "") => {
  const cleaned = normalizeSpaces(value);
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((part) => {
      if (!part) return part;
      const [first, ...rest] = part;
      return `${first.toUpperCase()}${rest.join("").toLowerCase()}`;
    })
    .join(" ");
};

const buildUserSession = (data) => ({
  role: data.user.role,
  email: data.user.email,
  name: data.user.name,
  alias: data.user.alias || null,
  idUsuario: data.user.id,
  tokenPadre: data.user.tokenPadre,
  isAdult: data.user.isAdult,
  specialCode: data.user.specialCode || null,
  created_at: data.user.created_at || null,
});

const emptyFields = {
  loginEmail: "",
  loginPassword: "",
  signupName: "",
  signupEmail: "",
  signupPassword: "",
  signupPasswordConfirm: "",
  signupBirthDate: "",
  resetEmail: "",
  resetBirthDate: "",
  resetPassword: "",
  resetPasswordConfirm: "",
};

export function useFancyLoginForm(onLogin) {
  const [isSignup, setIsSignup] = React.useState(false);
  const [isResetMode, setIsResetMode] = React.useState(false);
  const [fields, setFields] = React.useState(emptyFields);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setFields(emptyFields);
    setError("");
    setLoading(false);
  }, []);

  const setField = React.useCallback((field, value) => {
    setFields((current) => ({ ...current, [field]: value }));
  }, []);

  const openLoginMode = React.useCallback(() => {
    setIsSignup(false);
    setIsResetMode(false);
    setError("");
  }, []);

  const openSignupMode = React.useCallback(() => {
    setIsSignup(true);
    setIsResetMode(false);
    setError("");
  }, []);

  const openResetMode = React.useCallback(() => {
    setIsSignup(false);
    setIsResetMode(true);
    setFields((current) => ({
      ...current,
      resetEmail: current.loginEmail,
      resetBirthDate: "",
      resetPassword: "",
      resetPasswordConfirm: "",
    }));
    setError("");
  }, []);

  const finishLogin = React.useCallback((data) => {
    guardarTokensAuth(data);
    onLogin && onLogin(buildUserSession(data));
  }, [onLogin]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await iniciarSesion({
        email: fields.loginEmail,
        password: fields.loginPassword,
      });

      finishLogin(data);
    } catch (err) {
      console.error("Error de login:", err);
      setError(err.message || "Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formattedName = formatearNombreCompleto(fields.signupName);
    const wordCount = formattedName.split(" ").filter(Boolean).length;

    if (!formattedName || !fields.signupEmail || !fields.signupPassword || !fields.signupPasswordConfirm || !fields.signupBirthDate) {
      setError("Todos los campos son obligatorios");
      setLoading(false);
      return;
    }

    if (wordCount < 2) {
      setError("Introduce nombre y apellidos (mínimo 2 palabras)");
      setLoading(false);
      return;
    }

    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(formattedName)) {
      setError("El nombre solo puede contener letras y espacios");
      setLoading(false);
      return;
    }

    if (fields.signupPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (fields.signupPassword !== fields.signupPasswordConfirm) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const data = await registrarUsuario({
        name: formattedName,
        email: fields.signupEmail,
        password: fields.signupPassword,
        birthDate: fields.signupBirthDate,
      });

      guardarTokensAuth(data);

      if (data.user.tokenPadre) {
        showSuccess("¡Cuenta creada exitosamente!");
        showInfo(`Token de Vinculación: ${data.user.tokenPadre}`);
        showInfo("Comparte este token en Perfil → Vincular Familiar");
      }

      onLogin && onLogin(buildUserSession(data));
    } catch (err) {
      console.error("Error de registro:", err);
      setError(err.message || "Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!fields.resetEmail || !fields.resetBirthDate || !fields.resetPassword || !fields.resetPasswordConfirm) {
      setError("Todos los campos son obligatorios");
      setLoading(false);
      return;
    }

    if (fields.resetPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (fields.resetPassword !== fields.resetPasswordConfirm) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      await restablecerContrasena({
        email: fields.resetEmail,
        birthDate: fields.resetBirthDate,
        newPassword: fields.resetPassword,
      });

      setFields((current) => ({
        ...current,
        loginEmail: current.resetEmail,
        loginPassword: "",
        resetBirthDate: "",
        resetPassword: "",
        resetPasswordConfirm: "",
      }));
      setIsResetMode(false);
      showSuccess("Contraseña restablecida. Ya puedes iniciar sesión.");
    } catch (err) {
      console.error("Error al restablecer contraseña:", err);
      setError(err.message || "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return {
    fields,
    isResetMode,
    isSignup,
    loading,
    error,
    maxDate: new Date().toISOString().split("T")[0],
    panelHeight: isResetMode ? "540px" : "500px",
    setField,
    openLoginMode,
    openSignupMode,
    openResetMode,
    handleLogin,
    handleSignup,
    handleResetPassword,
  };
}
