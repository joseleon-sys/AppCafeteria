import React from "react";

export default function AdminOrdersPanel({ orders }) {
  const pendingOrders = orders.filter(
    (order) => order.status === "pending" || order.status === "approved",
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0f1419",
        marginLeft: 260,
        padding: "32px",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 24, paddingRight: 20 }}>
        <h1 style={{ margin: 0, color: "#4a9eff", fontSize: 36, fontWeight: 700 }}>
          Kitchen Display System
        </h1>
        <p style={{ color: "#888", margin: "8px 0 0 0", fontSize: 16 }}>
          {pendingOrders.length} órdenes {pendingOrders.length === 1 ? "pendiente" : "pendientes"}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "24px",
          autoRows: "max-content",
        }}
      >
        {pendingOrders.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 60,
              textAlign: "center",
              color: "#666",
              fontSize: 18,
            }}
          >
            No hay órdenes pendientes
          </div>
        ) : (
          pendingOrders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "linear-gradient(135deg, #1a1f2e 0%, #242d3d 100%)",
                border: `4px solid ${order.status === "approved" ? "#27ae60" : "#f39c12"}`,
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div
                style={{
                  background: order.status === "approved" ? "#27ae60" : "#f39c12",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  textAlign: "center",
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {order.status === "approved" ? "Aprobado" : "Pendiente"}
              </div>

              <div>
                <div
                  style={{
                    color: "#888",
                    fontSize: 12,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  Nombre del Niño
                </div>
                <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 22 }}>
                  {order.child_name || "Usuario " + order.id}
                </div>
              </div>

              {order.allergens && order.allergens.length > 0 && (
                <div
                  style={{
                    background: "#c0392b",
                    color: "#ffe0e0",
                    padding: "16px",
                    borderRadius: 8,
                    fontWeight: 700,
                    borderLeft: "6px solid #ff6b6b",
                    fontSize: 16,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontSize: 12,
                    }}
                  >
                    ⚠️ ALERGENOS DETECTADOS
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6 }}>
                    {order.allergens.map((allergen, index) => (
                      <div key={index}>• {allergen}</div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div
                  style={{
                    color: "#888",
                    fontSize: 12,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  Items del Pedido
                </div>
                <div
                  style={{
                    background: "#0f1419",
                    padding: 12,
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {order.items &&
                    order.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          color: "#4a9eff",
                          fontSize: 16,
                          fontWeight: 600,
                          borderBottom:
                            index < order.items.length - 1 ? "1px solid #3a4254" : "none",
                          paddingBottom: index < order.items.length - 1 ? 8 : 0,
                        }}
                      >
                        <span style={{ color: "#27ae60", fontWeight: 700, marginRight: 8 }}>
                          {item.quantity}x
                        </span>
                        {item.product_name}
                      </div>
                    ))}
                </div>
              </div>

              {order.notes && (
                <div
                  style={{
                    background: "#2d3a4a",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    color: "#a0d5ff",
                    borderLeft: "4px solid #4a9eff",
                  }}
                >
                  <strong style={{ color: "#4a9eff" }}>Notas:</strong>
                  <br />
                  {order.notes}
                </div>
              )}

              <div
                style={{
                  color: "#666",
                  fontSize: 12,
                  textAlign: "center",
                  borderTop: "1px solid #3a4254",
                  paddingTop: 8,
                  fontWeight: 600,
                }}
              >
                {new Date(order.created_at).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
