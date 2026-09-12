import type { Language, Role, User, UserStatus } from "@/lib/mock-data";
import type { ApiRole, ApiUser } from "./types";

/**
 * The backend assigns each user exactly ONE role (`superadmin`/`organization`/
 * `farmer`/`buyer`/`seller`). The app's mock roles are a different vocabulary
 * (`farmer`/`buyer`/`supplier`/`transporter`/`admin`), so this maps between
 * them. `superadmin` (the backend's platform admin) is treated exactly like
 * this app's `admin` role — same pages, same permissions — per product
 * requirements.
 */
export const API_ROLE_TO_APP_ROLES: Record<ApiRole, Role[]> = {
  superadmin: ["admin"],
  organization: ["buyer"],
  farmer: ["farmer"],
  buyer: ["buyer"],
  seller: ["supplier"],
};

/** Fallback for profiles that omit `roles` (or report an unexpected value). */
const FALLBACK_APP_ROLES: Role[] = ["farmer"];

function mapRoles(apiRole: ApiRole | undefined): Role[] {
  if (apiRole && API_ROLE_TO_APP_ROLES[apiRole]) return API_ROLE_TO_APP_ROLES[apiRole];
  return FALLBACK_APP_ROLES;
}

/**
 * Adapts the real API's User shape onto this app's existing `User` type so
 * every page that already reads `currentUser`/`User` fields keeps working
 * unmodified while only auth is wired to the real backend.
 *
 * `locationId` and `cooperativeId` reference the real API's numeric id space,
 * which doesn't overlap with this app's mock location/cooperative trees —
 * `locationLabel()` and similar lookups degrade gracefully to "Unknown
 * location" rather than crashing, but won't resolve to a real place name until
 * Locations is migrated too.
 */
export function mapApiUserToAppUser(apiUser: ApiUser): User {
  const roles = mapRoles(apiUser.roles);
  const status: UserStatus = apiUser.status === "active" ? "active" : "suspended";

  return {
    id: `api-${apiUser.id}`,
    name: apiUser.full_name,
    phone: apiUser.phone,
    roles,
    preferredLanguage: apiUser.preferred_language.code as Language,
    locationId: apiUser.primary_location ? String(apiUser.primary_location.id) : "",
    isVerified: apiUser.is_verified,
    reliabilityScore: Number(apiUser.reliability_score) || 0,
    avatarColorIndex: apiUser.id % 5,
    status,
    createdAt: apiUser.created_at.slice(0, 10),
    ...(apiUser.email ? { email: apiUser.email } : {}),
    ...(apiUser.national_id ? { nationalId: apiUser.national_id } : {}),
    ...(apiUser.organization ? { cooperativeId: String(apiUser.organization.id) } : {}),
  };
}
