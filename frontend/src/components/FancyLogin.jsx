// Pantalla de acceso principal con login, registro y recuperacion de contraseña.
import React from "react";
import "./FancyLogin.css";
import { useFancyLoginForm } from "../hooks/useFancyLoginForm";
import AuthModeToggle from "./login/AuthModeToggle";
import LoginForm from "./login/LoginForm";
import SignupForm from "./login/SignupForm";
import ResetPasswordForm from "./login/ResetPasswordForm";

export default function FancyLogin({ onLogin }) {
  const login = useFancyLoginForm(onLogin);

  return (
    <div className="container">
      <div className="login-header">
        <img src="/imagenesEjemplo/logoOscuroLinea.png" alt="Aula Café Logo" className="login-logo" />
        <h1 className="login-app-name">Aula Café</h1>
      </div>
      <div className="wrapper" style={{ position: 'relative', zIndex: 1 }}>
        <div className="card-switch">
          <AuthModeToggle
            isSignup={login.isSignup}
            isResetMode={login.isResetMode}
            onLogin={login.openLoginMode}
            onSignup={login.openSignupMode}
          />

          {login.isResetMode && (
            <div style={{ textAlign: 'center', marginBottom: 16, color: '#6b4226', fontSize: 13, fontWeight: 700 }}>
              Recuperación de acceso
            </div>
          )}

          <div style={{
            perspective: '1000px',
            width: '300px',
            minHeight: login.panelHeight
          }}>
            {!login.isResetMode ? (
              <div style={{
                transform: login.isSignup ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.8s',
                transformStyle: 'preserve-3d',
                position: 'relative',
                width: '100%',
                height: '100%'
              }}>
                <LoginForm
                  fields={login.fields}
                  loading={login.loading}
                  error={login.error}
                  isSignup={login.isSignup}
                  onSubmit={login.handleLogin}
                  onFieldChange={login.setField}
                  onResetMode={login.openResetMode}
                />
                <SignupForm
                  fields={login.fields}
                  loading={login.loading}
                  error={login.error}
                  maxDate={login.maxDate}
                  isSignup={login.isSignup}
                  onSubmit={login.handleSignup}
                  onFieldChange={login.setField}
                />
              </div>
            ) : (
              <ResetPasswordForm
                fields={login.fields}
                loading={login.loading}
                error={login.error}
                maxDate={login.maxDate}
                onSubmit={login.handleResetPassword}
                onFieldChange={login.setField}
                onLoginMode={login.openLoginMode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
