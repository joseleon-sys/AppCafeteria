import React from "react";
import { actualizarPerfil, obtenerMisVinculosHijos, obtenerMisVinculosPadre } from "../lib/api";
import { construirEstadisticasPerfilDesdePedidos, obtenerHistorialPedidosParaUsuario } from "../lib/orderService";
import { showError } from "../components/Toast";

export const profileTabs = [
  { id: "info", label: "Información", icon: "ℹ︎", description: "Tus datos personales" },
  { id: "alias", label: "Alias", icon: "👤", description: "Tu alias personalizado" },
  { id: "stats", label: "Estadísticas", icon: "📊", description: "Tu actividad" },
  { id: "family", label: "Familia", icon: "👨‍👩‍👧", description: "Vinculación" },
];

export function formatMemberDate(dateString) {
  if (!dateString) return "Información no disponible";

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (e) {
    return "Información no disponible";
  }
}

export function getRoleLabel(user) {
  if (user?.role === "admin") return "Administrador";
  if (user?.role === "child") return "Menor";
  if (user?.isAdult) return "Adulto";
  return "Cliente";
}

export function useProfileModalData({ isOpen, user, onUserUpdate }) {
  const [activeTab, setActiveTab] = React.useState("info");
  const [aliasInput, setAliasInput] = React.useState("");
  const [specialCodeInput, setSpecialCodeInput] = React.useState("");
  const [aliasSaving, setAliasSaving] = React.useState(false);
  const [aliasMessage, setAliasMessage] = React.useState("");
  const [profileStats, setProfileStats] = React.useState(() => construirEstadisticasPerfilDesdePedidos([], user));
  const [familyLinks, setFamilyLinks] = React.useState([]);
  const [familyLoading, setFamilyLoading] = React.useState(false);

  React.useEffect(() => {
    setAliasInput(user?.alias || "");
    setSpecialCodeInput(user?.specialCode || "");
    setAliasMessage("");
  }, [user?.alias, user?.specialCode, isOpen]);

  React.useEffect(() => {
    if (!isOpen || !user) return undefined;

    let cancelled = false;

    const loadProfileData = async () => {
      try {
        const orders = await obtenerHistorialPedidosParaUsuario(user);
        if (!cancelled) {
          setProfileStats(construirEstadisticasPerfilDesdePedidos(orders, user));
        }
      } catch (error) {
        console.error("Error cargando estadisticas de perfil:", error);
        if (!cancelled) {
          setProfileStats(construirEstadisticasPerfilDesdePedidos([], user));
        }
        showError(error.message || "No se pudieron cargar las estadisticas del perfil");
      }
    };

    loadProfileData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  const loadFamilyData = React.useCallback(async () => {
    if (!user || !isOpen) return;

    setFamilyLoading(true);
    try {
      if (user?.isAdult && user?.role !== "admin") {
        const data = await obtenerMisVinculosHijos();
        setFamilyLinks(data.children || []);
      } else {
        const data = await obtenerMisVinculosPadre();
        setFamilyLinks(data.parents || []);
      }
    } catch (error) {
      console.error("Error cargando familiares vinculados:", error);
      setFamilyLinks([]);
      showError(error.message || "No se pudieron cargar los familiares vinculados");
    } finally {
      setFamilyLoading(false);
    }
  }, [isOpen, user]);

  React.useEffect(() => {
    if (activeTab !== "family" || !isOpen || !user) return;
    loadFamilyData();
  }, [activeTab, isOpen, user, loadFamilyData]);

  async function saveAlias() {
    const normalizedAlias = aliasInput.trim();

    if (normalizedAlias && !/^[A-Za-z0-9_.-]{3,30}$/.test(normalizedAlias)) {
      setAliasMessage("El alias debe tener 3-30 caracteres (letras, números, _ . -)");
      return;
    }

    setAliasSaving(true);
    setAliasMessage("");

    try {
      const result = await actualizarPerfil(normalizedAlias || null, user?.specialCode || null);
      const savedAlias = result?.user?.alias || null;
      onUserUpdate && onUserUpdate({ alias: savedAlias });
      setAliasInput(savedAlias || "");
      setAliasMessage(savedAlias ? "Alias guardado correctamente" : "Alias eliminado correctamente");
    } catch (error) {
      setAliasMessage(error.message || "No se pudo guardar el alias");
    } finally {
      setAliasSaving(false);
    }
  }

  async function saveSpecialCode() {
    if (!user?.isAdult) {
      setAliasMessage("El código especial solo está disponible para perfiles Adulto");
      return;
    }

    setAliasSaving(true);
    setAliasMessage("");

    try {
      const result = await actualizarPerfil(user?.alias || null, specialCodeInput.trim() || null);
      const savedSpecialCode = result?.user?.specialCode || null;
      onUserUpdate && onUserUpdate({ specialCode: savedSpecialCode });
      setSpecialCodeInput(savedSpecialCode || "");
      setAliasMessage(savedSpecialCode ? "Código especial guardado correctamente" : "Código especial desactivado correctamente");
    } catch (error) {
      setAliasMessage(error.message || "No se pudo guardar el código especial");
    } finally {
      setAliasSaving(false);
    }
  }

  return {
    activeTab,
    aliasInput,
    aliasMessage,
    aliasSaving,
    familyLinks,
    familyLoading,
    profileStats,
    specialCodeInput,
    loadFamilyData,
    saveAlias,
    saveSpecialCode,
    setActiveTab,
    setAliasInput,
    setSpecialCodeInput,
  };
}
