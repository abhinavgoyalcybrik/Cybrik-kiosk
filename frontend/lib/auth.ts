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
      profile_data: Record<string, unknown>;
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

export type SessionRecommendation = {
  course_id: number;
  title: string;
  location_display: string;
  university: { name: string; country: string; city: string; city_display?: string };
  tuition_fee: number | null;
  tuition_currency: string;
  fee_period: string;
  duration_months: number | null;
  campus: string;
  intake_labels: string[];
  match_percentage: number;
  reasons: string[];
  match_summary: { matched_count: number; not_matched_count: number; partial_count: number; review_count: number };
  matched_factors: MatchFactor[];
  partial_factors: MatchFactor[];
  unmatched_factors: MatchFactor[];
  review_factors: MatchFactor[];
  academic_eligibility: { status: string; reasons: string[] };
  english_eligibility: { status: string; requirements: Record<string, number> | []; student_scores: Record<string, number> | null; gaps: Array<{ test: string; gap: number }> };
  english_affects_matching_score: false;
  document_readiness: { status: string; required_count: number; available_count: number; missing_documents: string[] };
};

export type MatchFactor = {
  key: string;
  label: string;
  user_value: unknown;
  course_value: unknown;
  status: "matched" | "partial" | "not_matched" | "review" | "unavailable";
  reason: string;
  score: number;
  maximum_score: number;
  applicable: boolean;
};

export function fetchSessionRecommendations(sessionKey: string) {
  return authRequest<{ total_matched: number; recommendations: SessionRecommendation[] }>(
    `/api/session/${sessionKey}/recommendations/`,
    { method: "GET", cache: "no-store" },
  );
}
