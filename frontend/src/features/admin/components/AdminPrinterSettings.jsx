import React from "react";

export const DEFAULT_PRINTER_CONFIG = {
  enabled: false,
  host: "",
  port: 9100,
  timeoutMs: 4000,
};

export default function AdminPrinterSettings({
  config,
  saving,
  message,
  onChange,
  onSave,
}) {
  return (
    <div className="section-container">
      <div className="section-header">
        <h2>Impresora de tickets</h2>
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      <div className="printer-settings-grid">
        <div className="form-group checkbox printer-toggle">
          <input
            id="printer-enabled"
            type="checkbox"
            checked={Boolean(config.enabled)}
            onChange={(event) => onChange({ ...config, enabled: event.target.checked })}
          />
          <label htmlFor="printer-enabled">Impresion de tickets activa</label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Direccion IP o hostname</label>
            <input
              type="text"
              value={config.host}
              onChange={(event) => onChange({ ...config, host: event.target.value })}
              placeholder="192.168.30.10"
            />
          </div>

          <div className="form-group">
            <label>Puerto</label>
            <input
              type="number"
              min="1"
              max="65535"
              value={config.port}
              onChange={(event) => onChange({ ...config, port: event.target.value })}
            />
          </div>
        </div>

        <div className="form-group printer-timeout">
          <label>Timeout de conexion (ms)</label>
          <input
            type="number"
            min="500"
            step="100"
            value={config.timeoutMs}
            onChange={(event) => onChange({ ...config, timeoutMs: event.target.value })}
          />
        </div>

        {message && <div className={`printer-message ${message.type}`}>{message.text}</div>}
      </div>
    </div>
  );
}
