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
// Fully granular PAM: a team member's effective grants are the intersection of
// (a) an optional explicit `capabilities` array on the role row and (b) the
// role presets below. Roles are just convenient presets — an owner can assign
// any subset of the grantable capabilities to any member (see
// capabilitiesForMember). `manage` is NEVER granted to a team member: only the
// map owner and global admins have it.

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

// Capabilities an owner can grant to team members. `manage` is reserved for the
// owner and global admins and cannot be assigned to a role row.
export const TEAM_GRANTABLE_CAPABILITIES: readonly MapCapability[] =
  ALL_CAPABILITIES.filter((c) => c !== "manage");

// Human-readable labels + scope notes for every capability (admin UI matrix).
export const CAPABILITY_INFO: Record<
  MapCapability,
  { label: string; description: string }
> = {
  read: {
    label: "Read data",
    description: "See spots, activity, contributors, reports and bans.",
  },
  export: {
    label: "Export",
    description: "Download the map as GeoJSON / CSV.",
  },
  approve: {
    label: "Approve & reject",
    description: "Act on the moderation queue for spots, zones and routes.",
  },
  moderate: {
    label: "Edit, hide & delete",
    description: "Full content control over spots, zones and routes.",
  },
  staff: {
    label: "Reports & bans",
    description: "Resolve reports and ban / unban users.",
  },
  manage: {
    label: "Manage map",
    description:
      "Change settings, manage the team and delete the map. Owner / global admin only.",
  },
};

// A member-shaped object the resolver can read grants from. Accepts the Mongo
// MapRole doc or a plain { role, capabilities } subset (e.g. request bodies).
export interface CapabilityMember {
  role?: MapRoleType | null;
  capabilities?: readonly MapCapability[] | null;
}

// Effective grants for a team member. An explicit `capabilities` array wins
// over the role preset; legacy rows without a `role` behave as "moderator";
// absent rows have no access. `manage` is stripped so it can never leak to a
// team member via a hand-written row.
export function capabilitiesForMember(member: CapabilityMember): MapCapability[] {
  const explicit = member.capabilities;
  const base: readonly MapCapability[] =
    explicit != null && Array.isArray(explicit)
      ? explicit
      : ROLE_CAPABILITIES[member.role ?? "moderator"];
  return base.filter((c) => c !== "manage");
}

// Validate an inbound capability list (API/UI) and drop anything that isn't a
// team-grantable capability. Returns null when the input wasn't a list.
export function sanitizeCapabilities(value: unknown): MapCapability[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<MapCapability>();
  for (const raw of value) {
    const c = String(raw);
    if ((TEAM_GRANTABLE_CAPABILITIES as readonly string[]).includes(c)) {
      seen.add(c as MapCapability);
    }
  }
  return [...seen];
}

// True when a capability set equals a built-in role preset exactly. Used by the
// admin UI to label a member's grants as the preset vs. a custom matrix.
export function capsMatchRole(
  caps: readonly MapCapability[],
  role: MapRoleType
): boolean {
  const preset = ROLE_CAPABILITIES[role];
  return (
    caps.length === preset.length && preset.every((c) => caps.includes(c))
  );
}