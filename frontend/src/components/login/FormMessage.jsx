import React from "react";

export default function FormMessage({ children }) {
  if (!children) return null;

  return <div style={{ color: "#b00", fontSize: 14, marginTop: 8 }}>{children}</div>;
}
