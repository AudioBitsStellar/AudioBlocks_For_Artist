import Breadcrumb from "@/components/Breadcrumb";
import { useRole } from "@/hooks/useRole";
import { ROLE_BADGE_STYLES } from "@/types/role";

/**
 * Profile page header showing breadcrumb and role indicator.
 */
export default function ProfileHeader() {
  const { role, info: roleInfo, can } = useRole();
  const canEditSettings = can("settings:edit");

  return (
    <>
      <Breadcrumb items={[{ label: "Profile", isActive: true }]} />

      {/* Role indicator – issue #173 acceptance criteria */}
      <div
        data-testid="profile-role-indicator"
        className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#2A2A2A] bg-[#161616] px-4 py-3"
      >
        <span
          data-testid="profile-role-badge"
          data-role={role}
          aria-label={`Active role: ${role}`}
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${ROLE_BADGE_STYLES[role]}`}
        >
          {roleInfo.label}
        </span>
        <p className="text-xs text-[#A3A3A3]">
          <span className="text-white font-medium">Workspace role:</span> {roleInfo.description}
        </p>
        {!canEditSettings && (
          <span
            data-testid="profile-role-readonly"
            className="ml-auto text-[10px] uppercase tracking-wide rounded-md bg-[#2A2A2A] px-2 py-1 text-[#A3A3A3]"
          >
            Read-only
          </span>
        )}
      </div>
    </>
  );
}
