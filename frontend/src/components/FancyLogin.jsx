
import React, { useState } from "react";
import "./FancyLogin.css";
import { showInfo, showSuccess } from "./Toast";
import { loginUser, registerUser } from "../lib/api";

export default function FancyLogin({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [signupBirthDate, setSignupBirthDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeSpaces = (value = "") => value.trim().replace(/\s+/g, " ");

  const formatFullName = (value = "") => {
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

  // Limpiar todos los estados al montar (útil después de logout)
  React.useEffect(() => {
    setLoginEmail("");
    setLoginPassword("");
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupPasswordConfirm("");
    setSignupBirthDate("");
    setError("");
    setLoading(false);
  }, []);


  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const data = await loginUser({ email: loginEmail, password: loginPassword });
      
      // Guardar token
      localStorage.setItem('cafeteria_token', data.token);
      
      // Notificar al componente padre
      onLogin && onLogin({ 
        role: data.user.role,
        email: data.user.email,
        name: data.user.name,
        alias: data.user.alias || null,
        userId: data.user.id,
        parentToken: data.user.parentToken,
        isAdult: data.user.isAdult,
        created_at: data.user.created_at || null
      });
    } catch (err) {
      console.error('Error de login:', err);
      setError(err.message || 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formattedName = formatFullName(signupName);
    const wordCount = formattedName.split(" ").filter(Boolean).length;
    
    if (!formattedName || !signupEmail || !signupPassword || !signupPasswordConfirm || !signupBirthDate) {
      setError('Todos los campos son obligatorios');
      setLoading(false);
      return;
    }

    if (wordCount < 2) {
      setError('Introduce nombre y apellidos (mínimo 2 palabras)');
      setLoading(false);
      return;
    }

    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(formattedName)) {
      setError('El nombre solo puede contener letras y espacios');
      setLoading(false);
      return;
    }
    
    if (signupPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }
    
    try {
      const data = await registerUser({
        name: formattedName,
        email: signupEmail,
        password: signupPassword,
        birthDate: signupBirthDate
      });
      
      // Guardar token
      localStorage.setItem('cafeteria_token', data.token);
      
      // Mostrar mensaje informativo si recibe token para vincular familiares
      if (data.user.parentToken) {
        showSuccess('¡Cuenta creada exitosamente!');
        if (data.user.parentToken) {
          showInfo(`Token de Vinculación: ${data.user.parentToken}`);
          showInfo('Comparte este token en Perfil → Vincular Familiar');
        }
      }
      
      // Notificar al componente padre
      onLogin && onLogin({ 
        role: data.user.role,
        email: data.user.email,
        name: data.user.name,
        alias: data.user.alias || null,
        userId: data.user.id,
        parentToken: data.user.parentToken,
        isAdult: data.user.isAdult,
        created_at: data.user.created_at || null
      });
    } catch (err) {
      console.error('Error de registro:', err);
      setError(err.message || 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="login-header">
        <img src="/imagenesEjemplo/logoOscuroLinea.png" alt="CafeteriaApp Logo" className="login-logo" />
        <h1 className="login-app-name">CafeteriaApp</h1>
      </div>
      <div className="wrapper" style={{ position: 'relative', zIndex: 1 }}>
        <div className="card-switch">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <button
              className="login-toggle-btn"
              style={{
                background: !isSignup ? '#6b4226' : '#e0c3a3',
                color: !isSignup ? '#fff' : '#6b4226',
                border: 'none',
                borderRadius: '20px 0 0 20px',
                padding: '8px 24px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 16,
                position: 'relative',
                zIndex: 10
              }}
              onClick={() => { setIsSignup(false); setError(""); }}
            >Iniciar sesión</button>
            <button
              className="login-toggle-btn"
              style={{
                background: isSignup ? '#6b4226' : '#e0c3a3',
                color: isSignup ? '#fff' : '#6b4226',
                border: 'none',
                borderRadius: '0 20px 20px 0',
                padding: '8px 24px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 16,
                position: 'relative',
                zIndex: 10
              }}
              onClick={() => { setIsSignup(true); setError(""); }}
            >Crear cuenta</button>
          </div>
          <div style={{ 
            perspective: '1000px',
            width: '300px',
            minHeight: '500px'
          }}>
            <div style={{ 
              transform: isSignup ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.8s',
              transformStyle: 'preserve-3d',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}>
              <div className="flip-card__front" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                boxShadow: isSignup ? 'none' : undefined,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}>
                <div className="title">Iniciar sesión</div>
                <form className="flip-card__form" onSubmit={handleLogin}>
                  <input
                    className="flip-card__input"
                    name="email"
                    placeholder="Correo electrónico"
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                  <input
                    className="flip-card__input"
                    name="password"
                    placeholder="Contraseña"
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                  <button className="flip-card__btn" type="submit" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                  <div style={{ fontSize: 13, color: '#b08968', marginTop: 8 }}>Demo: demo@demo.com / demo</div>
                  {error && <div style={{ color: '#b00', fontSize: 14, marginTop: 8 }}>{error}</div>}
                </form>
              </div>
              <div className="flip-card__back" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                boxShadow: isSignup ? '4px 10px var(--main-color)' : 'none',
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}>
              <div className="title">Crear cuenta</div>
              <form className="flip-card__form" onSubmit={handleSignup}>
                <input
                  className="flip-card__input"
                  placeholder="Nombre y apellidos"
                  type="text"
                  value={signupName}
                  onChange={e => setSignupName(e.target.value)}
                  onBlur={e => setSignupName(formatFullName(e.target.value))}
                  required
                />
                <input
                  className="flip-card__input"
                  name="email"
                  placeholder="Correo electrónico"
                  type="email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  required
                />
                <input
                  className="flip-card__input"
                  name="password"
                  placeholder="Contraseña (mín. 6 caracteres)"
                  type="password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  required
                />
                <input
                  className="flip-card__input"
                  name="confirmPassword"
                  placeholder="Repite la contraseña"
                  type="password"
                  value={signupPasswordConfirm}
                  onChange={e => setSignupPasswordConfirm(e.target.value)}
                  required
                />
                <input
                  className="flip-card__input"
                  placeholder="Fecha de nacimiento"
                  type="date"
                  value={signupBirthDate}
                  onChange={e => setSignupBirthDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
                <button className="flip-card__btn" type="submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear cuenta'}
                </button>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  Usa nombre real (Nombre Apellido). El alias se configura luego en Perfil.
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  Si eres mayor de 18 años, recibirás un token para vincular hijos
                </div>
                {error && <div style={{ color: '#b00', fontSize: 14, marginTop: 8 }}>{error}</div>}
              </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
