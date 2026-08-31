/**
 * Role-based access control (RBAC) types for multi-artist accounts.
 *
 * Members of an artist workspace can have one of three roles:
 *  - `owner`   – full access; only owner can change billing/settings and manage roles
 *  - `manager` – can edit/create content (songs, merch, events) but cannot delete the workspace or change billing
 *  - `viewer`  – read-only access; cannot create, edit, or delete content, nor change settings
 *
 * Permissions are intentionally simple booleans so that the UI can look them up
 * in O(1) without enumerating every action.
 */

export type Role = "owner" | "manager" | "viewer";

export const ROLES: ReadonlyArray<Role> = ["owner", "manager", "viewer"];

/**
 * Runtime type guard for {@link Role}. Use it when narrowing an untrusted
 * value (e.g. a JWT claim or a query param) to a known role.
 */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as ReadonlyArray<string>).includes(value);
}

/**
 * Granular permission keys. Each role has a static set of allowed permissions,
 * defined in {@link ROLE_PERMISSION_TABLE}.
 */
export type Permission =
  | "content:create"
  | "content:edit"
  | "content:delete"
  | "settings:read"
  | "settings:edit"
  | "workspace:manage"
  | "roles:manage";

export const ROLE_PERMISSION_TABLE: Readonly<Record<Role, ReadonlyArray<Permission>>> = {
  owner: [
    "content:create",
    "content:edit",
    "content:delete",
    "settings:read",
    "settings:edit",
    "workspace:manage",
    "roles:manage",
  ],
  manager: ["content:create", "content:edit", "content:delete", "settings:read"],
  viewer: ["settings:read"],
};

export interface UserRoleInfo {
  role: Role;
  /** Display label, e.g. "Owner", "Manager", "Viewer". */
  label: string;
  /** Short tagline shown next to the badge. */
  description: string;
}

export const ROLE_INFO: Readonly<Record<Role, UserRoleInfo>> = {
  owner: {
    role: "owner",
    label: "Owner",
    description: "Full access to all workspace settings and content.",
  },
  manager: {
    role: "manager",
    label: "Manager",
    description: "Can create and edit content. Cannot change workspace settings.",
  },
  viewer: {
    role: "viewer",
    label: "Viewer",
    description: "Read-only access to the artist workspace.",
  },
};

/**
 * Shared badge styles for the role chip displayed in the top header and on
 * the profile page. Centralising the palette keeps the two surfaces in sync.
 */
export const ROLE_BADGE_STYLES: Readonly<Record<Role, string>> = {
  owner: "bg-[#D2045B] text-white",
  manager: "bg-[#885FA8] text-white",
  viewer: "bg-[#2A2A2A] text-[#C9C9C9]",
};

/**
 * Returns a human-readable explanation of why the current user cannot
 * change settings (used by the profile page Settings tab when the toggle
 * is disabled for non-owner roles). Returns an empty string for `owner`.
 */
export function getSettingsRestrictionReason(role: Role): string {
  switch (role) {
    case "owner":
      return "";
    case "manager":
      return "Settings are managed by the workspace owner.";
    case "viewer":
      return "You have read-only access; settings are managed by the workspace owner.";
  }
}
