import type { Language, Role, User, UserStatus } from "@/lib/mock-data";
import type { ApiUser } from "./types";

/**
 * Adapts the real API's User shape onto this app's existing `User` type so
 * every page that already reads `currentUser`/`User` fields keeps working
 * unmodified while only auth is wired to the real backend.
 *
 * Known gap: the documented register/login response has no `roles` field,
 * so a real-backend-authenticated account always defaults to `["farmer"]`
 * here until the API doc's roles/permissions section is available — every
 * role-gated page (admin tools, supplier/transporter views, etc.) is
 * unreachable for a real account until that's resolved. `locationId` and
 * `cooperativeId` reference the real API's numeric id space, which doesn't
 * overlap with this app's mock location/cooperative trees — `locationLabel()`
 * and similar lookups degrade gracefully to "Unknown location" rather than
 * crashing, but won't resolve to a real place name until Locations is
 * migrated too.
 */
export function mapApiUserToAppUser(apiUser: ApiUser): User {
  const defaultRoles: Role[] = ["farmer"];
  const status: UserStatus = apiUser.status === "active" ? "active" : "suspended";

  return {
    id: `api-${apiUser.id}`,
    name: apiUser.full_name,
    phone: apiUser.phone,
    roles: defaultRoles,
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
