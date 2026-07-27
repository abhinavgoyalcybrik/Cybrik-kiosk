export type AuthMode = "register" | "login";

export type StartSessionResponse = {
  session_key: string;
  phone: string;
  name: string;
  email: string;
  mode: AuthMode;
  status: string;
};

export type SendOtpResponse = {
  success: true;
  message: string;
  session_key: string;
  phone: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
};

export type VerifyOtpResponse = {
  verified: true;
  message: string;
  session_key: string;
  student_profile_id: number;
  created_new_profile: boolean;
};

export type AuthSessionResponse =
  | {
      authenticated: true;
      session_key: string;
      phone: string;
      student_profile_id: number | null;
      name: string;
      email: string;
    }
  | { authenticated: false };

export class AuthApiError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function authRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new AuthApiError(
      "Unable to reach the authentication service. Check your connection and try again.",
      0,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new AuthApiError(
      typeof payload.error === "string" ? payload.error : "Authentication request failed.",
      response.status,
      typeof payload.retry_after === "number" ? payload.retry_after : undefined,
    );
  }
  return payload as T;
}

export function startAuthSession(input: {
  mode: AuthMode;
  name?: string;
  email?: string;
  phone: string;
}) {
  return authRequest<StartSessionResponse>("/api/session/start/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function sendSessionOtp(sessionKey: string) {
  return authRequest<SendOtpResponse>(`/api/session/${sessionKey}/otp/send/`, {
    method: "POST",
    body: "{}",
  });
}

export function verifySessionOtp(sessionKey: string, otpCode: string) {
  return authRequest<VerifyOtpResponse>(`/api/session/${sessionKey}/otp/verify/`, {
    method: "POST",
    body: JSON.stringify({ otp_code: otpCode }),
  });
}

export function getAuthSession() {
  return authRequest<AuthSessionResponse>("/api/session/status/", {
    method: "GET",
    cache: "no-store",
  });
}

export function logoutAuthSession() {
  return authRequest<{ success: true; message: string }>("/api/session/logout/", {
    method: "POST",
    body: "{}",
  });
}

export function autosaveAuthProfile(sessionKey: string, profile: Record<string, unknown>) {
  return authRequest<{ saved: boolean }>(`/api/session/${sessionKey}/autosave/`, {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}
