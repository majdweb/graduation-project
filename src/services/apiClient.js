// CHANGED: new shared API client (2026-07-13). Every other service file (hotels.js, owner.js,
// guest.js, hotelRequests.js) used to have its own near-identical fetch wrapper. Consolidated
// here so token-refresh logic (see below) only has to exist in one place, and so future services
// don't duplicate it again.
import { getAuthToken, getRefreshToken, updateStoredTokens, clearAuth } from './auth';

const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

// De-duplicates concurrent refresh attempts: if several requests 401 around the same moment
// (e.g. right as the access token expires), only the first one actually calls /auth/refresh —
// the rest wait on that same promise. This matters because the backend rotates refresh tokens
// (each refresh invalidates the previous one), so two independent concurrent refresh calls would
// have the second one fail.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available.');

  const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Session expired.');

  const data = await res.json();
  updateStoredTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiry: data.accessTokenExpiry,
  });
  return data.accessToken;
}

function refreshAccessTokenOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function doFetch(path, options, token) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { res, data };
}

// Shared fetch wrapper for every authenticated service call. On a 401, it silently refreshes the
// access token and retries the request once — callers never see the expiry itself, only a clear
// "please log in again" error if the refresh token has also expired or been revoked.
export async function apiRequest(path, options = {}) {
  let token = getAuthToken();
  let { res, data } = await doFetch(path, options, token);

  if (res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAccessTokenOnce();
      ({ res, data } = await doFetch(path, options, token));
    } catch (refreshErr) {
      clearAuth();
      throw new Error('Your session has expired. Please log in again.');
    }
  }

  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed: ${res.status}`);
  return data;
}

// CHANGED BY AI (2026-07-13): added for real photo uploads (hotels/room-types). Sends a FormData
// body instead of JSON — no Content-Type header is set here so the browser can attach its own
// multipart boundary. Shares the same 401-refresh-and-retry behavior as apiRequest.
async function doUploadFetch(path, formData, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { res, data };
}

export async function apiUpload(path, formData) {
  let token = getAuthToken();
  let { res, data } = await doUploadFetch(path, formData, token);

  if (res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAccessTokenOnce();
      ({ res, data } = await doUploadFetch(path, formData, token));
    } catch (refreshErr) {
      clearAuth();
      throw new Error('Your session has expired. Please log in again.');
    }
  }

  if (!res.ok) throw new Error(data?.error || data?.message || `Upload failed: ${res.status}`);
  return data;
}
