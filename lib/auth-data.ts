// Tiny demo-user seed, isolated from the rest of the demo data layer so the
// global AuthContext never drags in the larger seed arrays (places, reviews).

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userPassword: string;
}

export const INITIAL_USERS: AuthUser[] = [
  { id: 1, firstName: "PeopleMaps", lastName: "Demo", email: "demo@peoplemaps.app", userPassword: "demo123" },
];
