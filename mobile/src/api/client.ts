import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const TOKEN_STORAGE_KEY = "acmehr.accessToken";
export const REFRESH_TOKEN_STORAGE_KEY = "acmehr.refreshToken";
export const SESSION_STORAGE_KEY = "acmehr.session";

// Ported from client/src/api/client.ts in the Acme HR web portal, swapping
// localStorage for expo-secure-store and the window session-expired event for a
// small module-level listener set (there's no `window` in React Native).
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener());
}

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: Array<(accessToken: string | null) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    const isAuthEndpoint = originalRequest?.url?.startsWith("/auth/");
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, data.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
        pendingRequests.forEach((resolve) => resolve(data.accessToken));
      } catch {
        pendingRequests.forEach((resolve) => resolve(null));
        notifySessionExpired();
      } finally {
        pendingRequests = [];
        isRefreshing = false;
      }
    }

    return new Promise((resolve, reject) => {
      pendingRequests.push((accessToken) => {
        if (!accessToken) {
          reject(error);
          return;
        }
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        resolve(apiClient(originalRequest));
      });
    });
  },
);

// True only when the request never reached the server at all (no connectivity, DNS failure,
// timeout, ...) - axios sets `error.response` whenever the server actually responded, even
// with an error status, so its absence is what actually distinguishes "offline" from "the
// server rejected this".
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors as string[] | undefined;
    if (errors?.length) return errors.join(" ");
    const singleError = error.response?.data?.error as string | undefined;
    if (singleError) return singleError;
    if (error.message) return error.message;
  }
  return "Something went wrong. Please try again.";
}
