import { apiRequest, clearTokens, setTokens } from "./client";
import type {
  ApiUser,
  LoginPayload,
  LoginResponse,
  MessageResponse,
  RefreshResponse,
  RegisterPayload,
  RegisterResponse,
  VerifyOtpPayload,
} from "./types";

const STORED_USER_KEY = "agribridge.auth.user";

/** The raw API user is persisted (not the app-mapped one) so re-hydrating on
 * boot always goes through the single `mapApiUserToAppUser` adapter. */
export function getStoredApiUser(): ApiUser | null {
  try {
    const raw = window.localStorage.getItem(STORED_USER_KEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredApiUser(user: ApiUser) {
  try {
    window.localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}

export function clearStoredApiUser() {
  try {
    window.localStorage.removeItem(STORED_USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function registerApi(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("auth/register/", { method: "POST", body: payload, auth: false });
}

export function verifyOtpApi(payload: VerifyOtpPayload) {
  return apiRequest<MessageResponse>("auth/verify-otp/", { method: "POST", body: payload, auth: false });
}

export function resendOtpApi(identifier: string) {
  return apiRequest<MessageResponse>("auth/resend-otp/", {
    method: "POST",
    body: { identifier },
    auth: false,
  });
}

export async function loginApi(payload: LoginPayload) {
  const res = await apiRequest<LoginResponse>("auth/login/", { method: "POST", body: payload, auth: false });
  setTokens({ access: res.access, refresh: res.refresh });
  setStoredApiUser(res.user);
  return res;
}

export function refreshTokenApi(refresh: string) {
  return apiRequest<RefreshResponse>("auth/token/refresh/", {
    method: "POST",
    body: { refresh },
    auth: false,
  });
}

export async function logoutApi(refresh: string) {
  try {
    await apiRequest<MessageResponse>("auth/logout/", { method: "POST", body: { refresh } });
  } finally {
    clearTokens();
    clearStoredApiUser();
  }
}
