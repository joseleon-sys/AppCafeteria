import React, { useState, useCallback } from "react";
import "./Dialog.css";

// Global dialog manager
let dialogQueue = [];
let dialogListeners = [];

const notifyDialogListeners = () => {
  dialogListeners.forEach(listener => listener([...dialogQueue]));
};

export const showConfirm = (message, title = "Confirmación") => {
  return new Promise((resolve) => {
    const id = Date.now();
    const dialog = {
      id,
      type: 'confirm',
      title,
      message,
      resolve
    };
    dialogQueue.push(dialog);
    notifyDialogListeners();
  });
};

export const showPrompt = (message, title = "Ingresa un valor", defaultValue = "") => {
  return new Promise((resolve) => {
    const id = Date.now();
    const dialog = {
      id,
      type: 'prompt',
      title,
      message,
      defaultValue,
      resolve
    };
    dialogQueue.push(dialog);
    notifyDialogListeners();
  });
};

export const showAlert = (message, title = "Información") => {
  return new Promise((resolve) => {
    const id = Date.now();
    const dialog = {
      id,
      type: 'alert',
      title,
      message,
      resolve
    };
    dialogQueue.push(dialog);
    notifyDialogListeners();
  });
};

export default function Dialog() {
  const [dialogs, setDialogs] = useState([]);

  React.useEffect(() => {
    dialogListeners.push(setDialogs);
    return () => {
      dialogListeners = dialogListeners.filter(listener => listener !== setDialogs);
    };
  }, []);

  const handleConfirmYes = (dialog) => {
    dialog.resolve(true);
    dialogQueue = dialogQueue.filter(d => d.id !== dialog.id);
    setDialogs([...dialogQueue]);
  };

  const handleConfirmNo = (dialog) => {
    dialog.resolve(false);
    dialogQueue = dialogQueue.filter(d => d.id !== dialog.id);
    setDialogs([...dialogQueue]);
  };

  const handlePromptConfirm = (dialog, value) => {
    dialog.resolve(value || null);
    dialogQueue = dialogQueue.filter(d => d.id !== dialog.id);
    setDialogs([...dialogQueue]);
  };

  const handleAlertOk = (dialog) => {
    dialog.resolve(true);
    dialogQueue = dialogQueue.filter(d => d.id !== dialog.id);
    setDialogs([...dialogQueue]);
  };

  return (
    <>
      {dialogs.map((dialog) => (
        <div key={dialog.id} className="dialog-overlay">
          <div className="dialog-modal" onClick={e => e.stopPropagation()}>
            {dialog.type === 'confirm' && (
              <ConfirmDialog dialog={dialog} onYes={handleConfirmYes} onNo={handleConfirmNo} />
            )}
            {dialog.type === 'prompt' && (
              <PromptDialog dialog={dialog} onConfirm={handlePromptConfirm} />
            )}
            {dialog.type === 'alert' && (
              <AlertDialog dialog={dialog} onOk={handleAlertOk} />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function ConfirmDialog({ dialog, onYes, onNo }) {
  return (
    <>
      <div className="dialog-header">
        <h3>{dialog.title}</h3>
      </div>
      <div className="dialog-content">
        <p>{dialog.message}</p>
      </div>
      <div className="dialog-footer">
        <button
          className="dialog-btn dialog-btn-secondary"
          onClick={() => onNo(dialog)}
        >
          No
        </button>
        <button
          className="dialog-btn dialog-btn-primary"
          onClick={() => onYes(dialog)}
        >
          Sí
        </button>
      </div>
    </>
  );
}

function PromptDialog({ dialog, onConfirm }) {
  const [value, setValue] = React.useState(dialog.defaultValue);

  return (
    <>
      <div className="dialog-header">
        <h3>{dialog.title}</h3>
      </div>
      <div className="dialog-content">
        <p>{dialog.message}</p>
        <input
          type="text"
          className="dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="Ingresa tu respuesta"
        />
      </div>
      <div className="dialog-footer">
        <button
          className="dialog-btn dialog-btn-secondary"
          onClick={() => onConfirm(dialog, null)}
        >
          Cancelar
        </button>
        <button
          className="dialog-btn dialog-btn-primary"
          onClick={() => onConfirm(dialog, value)}
        >
          Aceptar
        </button>
      </div>
    </>
  );
}

function AlertDialog({ dialog, onOk }) {
  return (
    <>
      <div className="dialog-header">
        <h3>{dialog.title}</h3>
      </div>
      <div className="dialog-content">
        <p>{dialog.message}</p>
      </div>
      <div className="dialog-footer">
        <button
          className="dialog-btn dialog-btn-primary"
          onClick={() => onOk(dialog)}
        >
          Aceptar
        </button>
      </div>
    </>
  );
}
