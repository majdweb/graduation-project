const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

async function _req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed: ${res.status}`);
  return data;
}

// The backend uses "Owner"/"Guest"/"Admin"; the rest of this app was built around
// "hotel_owner"/"guest"/"admin", so requests/responses are translated at this boundary.
const ROLE_TO_FRONTEND = { Owner: "hotel_owner", Guest: "guest", Admin: "admin" };
const ROLE_TO_BACKEND = { hotel_owner: "owner", guest: "guest" };

function normalizeAuthResponse(res) {
  if (!res) return res;
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    accessTokenExpiry: res.accessTokenExpiry,
    user: {
      id: res.userId,
      username: res.username,
      email: res.email,
      role: ROLE_TO_FRONTEND[res.role] || res.role,
    },
  };
}

export async function signUpUser(payload) {
  const backendPayload = {
    username: payload.username,
    email: payload.email,
    password: payload.password,
    role: ROLE_TO_BACKEND[payload.role] || "guest",
  };
  const res = await _req('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(backendPayload) });
  return normalizeAuthResponse(res);
}

export async function signInUser(payload) {
  const res = await _req('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  return normalizeAuthResponse(res);
}

export async function verifySignUpCode({ email, code }) {
  const normalizedCode = String(code || "").trim();
  if (normalizedCode === "1111") {
    return {
      user: { email, verified: true },
      message: "Verification bypassed for local testing.",
    };
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const verifyType = process.env.REACT_APP_SUPABASE_VERIFY_TYPE || "signup";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      email,
      token: code,
      type: verifyType,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Invalid verification code.");
  }

  return data;
}

// Reads the access token from the locally-stored session, for authenticated requests.
export function getAuthToken() {
  try {
    const raw = localStorage.getItem("mock_auth_user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.accessToken || null;
  } catch (error) {
    return null;
  }
}

// CHANGED: added for the new shared API client's automatic token-refresh (see
// services/apiClient.js). Access tokens expire after 60 minutes; this lets a request that gets
// a 401 fetch a fresh token pair using the (longer-lived) refresh token, without forcing the
// user to log in again.
export function getRefreshToken() {
  try {
    const raw = localStorage.getItem("mock_auth_user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.refreshToken || null;
  } catch (error) {
    return null;
  }
}

// CHANGED: added alongside getRefreshToken() above — patches in a freshly-refreshed token pair
// without disturbing the rest of the stored session (e.g. the user object).
export function updateStoredTokens({ accessToken, refreshToken, accessTokenExpiry }) {
  try {
    const raw = localStorage.getItem("mock_auth_user");
    const parsed = raw ? JSON.parse(raw) : {};
    const next = { ...parsed, accessToken, refreshToken, accessTokenExpiry };
    localStorage.setItem("mock_auth_user", JSON.stringify(next));
  } catch (error) { /* ignore */ }
}

// Reads the locally-stored session set by signInUser/Login.js.
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("mock_auth_user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.user || null;
  } catch (error) {
    return null;
  }
}

export function getCurrentRole() {
  return getCurrentUser()?.role || localStorage.getItem("mock_auth_role") || null;
}

export function clearAuth() {
  try {
    localStorage.removeItem("mock_auth_user");
    localStorage.removeItem("mock_auth_role");
    localStorage.removeItem("mock_auth_token");
  } catch (error) { /* ignore */ }
}
