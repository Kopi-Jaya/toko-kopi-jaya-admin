const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function attemptTokenRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const newToken: string | undefined = data?.access_token;
  if (!newToken) return null;

  localStorage.setItem("access_token", newToken);
  return newToken;
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { token, headers: customHeaders, ...rest } = options;

  const accessToken = token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders as Record<string, string>,
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...rest,
  });

  if (res.status === 401) {
    // Try token refresh once
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await attemptTokenRefresh().catch(() => null);
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];

      if (newToken) {
        // Retry the original request with new token
        return fetchApi<T>(endpoint, { ...options, token: newToken });
      }
    } else {
      // Queue the retry until refresh completes
      const newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (newToken) {
        return fetchApi<T>(endpoint, { ...options, token: newToken });
      }
    }

    redirectToLogin();
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || res.statusText, body);
  }

  if (res.status === 204) {
    return { data: null as T };
  }

  return res.json();
}

/**
 * Multipart/form-data upload. Strips the JSON Content-Type so the browser
 * sets the correct multipart boundary itself. Reuses the same auth +
 * 401-refresh flow as the JSON helpers.
 */
async function uploadApi<T>(
  endpoint: string,
  formData: FormData,
): Promise<ApiResponse<T>> {
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  // Note: do NOT set Content-Type — browser inserts the boundary param.

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) {
    const newToken = await attemptTokenRefresh().catch(() => null);
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (retry.ok) return retry.json();
    }
    redirectToLogin();
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || res.statusText, body);
  }
  return res.json();
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: "POST", body: JSON.stringify(body), ...options }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: "PATCH", body: JSON.stringify(body), ...options }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: "DELETE", ...options }),

  upload: <T>(endpoint: string, formData: FormData) =>
    uploadApi<T>(endpoint, formData),
};

export { ApiError };
export type { ApiResponse };
