// Role & capability model for map team members.
//
// Capability bits, least → most privileged:
//   read     – see admin data (spots incl. pending/rejected/hidden, activity,
//              contributors, reports, bans)
//   export   – download the map as GeoJSON / CSV
//   approve  – act on the moderation queue (approve/reject pending items)
//   moderate – edit, hide/restore and destroy spots, zones and routes
//   staff    – resolve reports and ban/unban users
//   manage   – change map settings, manage team roles, delete the map
//
// `manage` is never granted to a role: only the map owner and global admins
// have it. Team members carry one of the roles below; absent row = no access.

export const MAP_ROLE_TYPES = ["viewer", "reviewer", "moderator"] as const;

export type MapRoleType = (typeof MAP_ROLE_TYPES)[number];

export type MapCapability =
  | "read"
  | "export"
  | "approve"
  | "moderate"
  | "staff"
  | "manage";

export const ROLE_CAPABILITIES: Record<MapRoleType, readonly MapCapability[]> = {
  viewer: ["read", "export"],
  reviewer: ["read", "export", "approve"],
  moderator: ["read", "export", "approve", "moderate", "staff"],
};

export const ALL_CAPABILITIES: readonly MapCapability[] = [
  "read",
  "export",
  "approve",
  "moderate",
  "staff",
  "manage",
];

export function roleHasCapability(
  role: MapRoleType,
  capability: MapCapability
): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export const ROLE_DESCRIPTIONS: Record<MapRoleType, string> = {
  viewer: "Read-only access to the admin panel, including export.",
  reviewer: "Can approve or reject pending submissions.",
  moderator: "Full content control: moderate, edit, hide and delete.",
};