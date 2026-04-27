// Modal de perfil con pestañas de informacion, alias, estadisticas y familia.
import React from "react";
import "./ProfileModal.css";
import { getRoleLabel, profileTabs, useProfileModalData } from "../hooks/useProfileModalData";
import AliasTab from "./profile/AliasTab";
import FamilyTab from "./profile/FamilyTab";
import InfoTab from "./profile/InfoTab";
import ProfileBottomNav from "./profile/ProfileBottomNav";
import ProfileHero from "./profile/ProfileHero";
import StatsTab from "./profile/StatsTab";

export default function ProfileModal({ isOpen, onClose, user, onLogout, onUserUpdate }) {
  const profile = useProfileModalData({ isOpen, user, onUserUpdate });

  if (!isOpen) return null;

  const realName = user?.name || "Usuario";
  const visibleAlias = user?.alias ? `@${user.alias}` : null;
  const roleLabel = getRoleLabel(user);
  const familyTitle = user?.isAdult && user?.role !== "admin" ? "Familiares vinculados" : "Padres y tutores vinculados";

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h3>👤 Mi perfil</h3>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar perfil">
            ✕
          </button>
        </div>

        <div className="profile-modal-content">
          <ProfileHero
            realName={realName}
            roleLabel={roleLabel}
            visibleAlias={visibleAlias}
            onEditAlias={() => profile.setActiveTab("alias")}
          />

          <div className="profile-tab-content">
            {profile.activeTab === "info" && (
              <InfoTab
                aliasMessage={profile.aliasMessage}
                aliasSaving={profile.aliasSaving}
                onSaveSpecialCode={profile.saveSpecialCode}
                realName={realName}
                setSpecialCodeInput={profile.setSpecialCodeInput}
                specialCodeInput={profile.specialCodeInput}
                user={user}
              />
            )}

            {profile.activeTab === "alias" && (
              <AliasTab
                aliasInput={profile.aliasInput}
                aliasMessage={profile.aliasMessage}
                aliasSaving={profile.aliasSaving}
                onSaveAlias={profile.saveAlias}
                setAliasInput={profile.setAliasInput}
              />
            )}

            {profile.activeTab === "stats" && (
              <StatsTab profileStats={profile.profileStats} />
            )}

            {profile.activeTab === "family" && (
              <FamilyTab
                familyLinks={profile.familyLinks}
                familyLoading={profile.familyLoading}
                familyTitle={familyTitle}
                onRefresh={profile.loadFamilyData}
                user={user}
              />
            )}
          </div>
        </div>

        <ProfileBottomNav
          activeTab={profile.activeTab}
          onTabChange={profile.setActiveTab}
          tabs={profileTabs}
        />
      </div>
    </div>
  );
}
