import React from "react";

function getRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "parent") return "Padre";
  if (role === "child") return "Hijo";
  if (role === "customer") return "Cliente";
  return role;
}

export default function AdminUsersTable({
  users,
  blockingUser,
  editingUser,
  onEdit,
  onDelete,
  onBlockRequest,
  onBlockConfirm,
  onCancelBlock,
  onEditingUserChange,
  onCancelEdit,
  onSaveUser,
}) {
  return (
    <>
      <div className="section-container">
        <h2>Usuarios Registrados</h2>

        {users.length === 0 ? (
          <div className="empty-state">No hay usuarios registrados aún</div>
        ) : (
          <div className="users-table">
            <div className="users-header">
              <div className="users-col-email">Email</div>
              <div className="users-col-name">Nombre</div>
              <div className="users-col-role">Rol</div>
              <div className="users-col-date">Registrado</div>
              <div className="users-col-count">Hijos</div>
              <div className="users-col-actions">Acciones</div>
            </div>

            {users.map((user) => (
              <div key={user.id} className={`users-row ${user.bloqueado ? "bloqueado" : ""}`}>
                <div className="users-col-email">{user.email}</div>
                <div className="users-col-name">{user.name}</div>
                <div className="users-col-role">
                  <span className={`role-badge role-${user.role}`}>{getRoleLabel(user.role)}</span>
                </div>
                <div className="users-col-date">
                  {new Date(user.created_at).toLocaleDateString("es-ES")}
                </div>
                <div className="users-col-count">{user.children_count || 0}</div>
                <div className="users-col-actions">
                  <button className="btn-edit" onClick={() => onEdit(user)} style={{ marginRight: 8 }}>
                    Editar
                  </button>
                  <button
                    className={`btn-danger ${user.bloqueado ? "danger-unblock" : ""}`}
                    onClick={() => onBlockRequest(user)}
                    style={{ marginRight: 8 }}
                  >
                    {user.bloqueado ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button className="btn-delete" onClick={() => onDelete(user.id, user.name)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingUser && (
        <div className="modal-overlay" onClick={onCancelEdit}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Editar Usuario</h2>

            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={editingUser.editName}
                onChange={(event) =>
                  onEditingUserChange({ ...editingUser, editName: event.target.value })
                }
                placeholder="Nombre del usuario"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={editingUser.editEmail}
                onChange={(event) =>
                  onEditingUserChange({ ...editingUser, editEmail: event.target.value })
                }
                placeholder="email@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label>Rol</label>
              <select
                value={editingUser.editRole}
                onChange={(event) =>
                  onEditingUserChange({ ...editingUser, editRole: event.target.value })
                }
              >
                <option value="admin">Admin</option>
                <option value="parent">Padre</option>
                <option value="child">Hijo</option>
                <option value="customer">Cliente</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={onSaveUser}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {blockingUser && (
        <div className="modal-overlay" onClick={onCancelBlock}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{blockingUser.bloqueado ? "Desbloquear Usuario" : "Bloquear Usuario"}</h2>
            <p style={{ color: "#666", marginTop: 16 }}>
              {blockingUser.bloqueado
                ? `¿Desbloquear a ${blockingUser.name} (${blockingUser.email})?`
                : `¿Bloquear a ${blockingUser.name} (${blockingUser.email})? No podrá acceder a la aplicación.`}
            </p>
            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button className="btn-secondary" onClick={onCancelBlock}>
                Cancelar
              </button>
              <button
                className={blockingUser.bloqueado ? "btn-primary" : "btn-danger"}
                onClick={() => onBlockConfirm(blockingUser.id, !blockingUser.bloqueado)}
              >
                {blockingUser.bloqueado ? "Desbloquear" : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
