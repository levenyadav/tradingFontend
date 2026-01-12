import { jsonFetch } from "./client";

export type LoginRequest = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type RawUser = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  metadata?: {
    _doc?: {
      _id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    };
  };
};

export type LoginResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    user: RawUser;
    tokens: Tokens;
    sessionId: string;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
};

function normalizeUser(raw: RawUser): AuthUser {
  const doc = raw?.metadata?._doc || {};
  const id = raw.id || doc._id || "";
  const email = raw.email || doc.email || "";
  return {
    id,
    email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    role: raw.role,
    status: raw.status,
  };
}

export async function login(req: LoginRequest) {
  const res = await jsonFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: req,
  });

  const user = normalizeUser(res.data.user);
  return {
    user,
    tokens: res.data.tokens,
    sessionId: res.data.sessionId,
    message: res.message,
  };
}

export type RegisterRequest = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  country?: string;
  acceptedTerms: boolean;
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    user: RawUser;
    userId?: string;
    tokens?: Tokens;
    sessionId?: string;
    requiresEmailVerification?: boolean;
  };
};

export async function register(req: RegisterRequest) {
  const res = await jsonFetch<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: req,
  });
  const user = normalizeUser(res.data.user);
  return {
    user,
    tokens: res.data.tokens,
    sessionId: res.data.sessionId || "",
    message: res.message,
    userId: res.data.userId,
    requiresEmailVerification: res.data.requiresEmailVerification,
  };
}

export async function verifyOtp(payload: { userId: string; code: string }) {
  const res = await jsonFetch<{ success: boolean; message: string; data: { user: RawUser; tokens: Tokens; sessionId: string } }>("/api/v1/auth/verify-otp", {
    method: "POST",
    body: payload,
  });
  return {
    user: normalizeUser(res.data.user),
    tokens: res.data.tokens,
    sessionId: res.data.sessionId,
    message: res.message,
  };
}

export async function resendOtp(payload: { userId: string }) {
  const res = await jsonFetch<{ success: boolean; message: string }>("/api/v1/auth/resend-otp", {
    method: "POST",
    body: payload,
  });
  return res;
}

export type RefreshResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
};

export async function refreshTokens(params: { accessToken: string; refreshToken: string }) {
  const res = await jsonFetch<RefreshResponse>("/api/v1/auth/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: { refreshToken: params.refreshToken },
  });
  return {
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
    expiresIn: res.data.expiresIn,
  };
}

export async function enable2FA(payload: { token: string; password: string }) {
  const res = await jsonFetch<{ data: any }>("/api/v1/auth/enable-2fa", {
    method: "POST",
    headers: { Authorization: `Bearer ${payload.token}` },
    body: { token: payload.token, password: payload.password },
  });
  return res.data;
}

export async function disable2FA(payload: { token: string; password: string }) {
  const res = await jsonFetch<{ data: any }>("/api/v1/auth/disable-2fa", {
    method: "POST",
    headers: { Authorization: `Bearer ${payload.token}` },
    body: { token: payload.token, password: payload.password },
  });
  return res.data;
}

export async function changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword?: string; accessToken: string }) {
  const res = await jsonFetch<{ data: any }>("/api/v1/auth/change-password", {
    method: "POST",
    headers: { Authorization: `Bearer ${payload.accessToken}` },
    body: { currentPassword: payload.currentPassword, newPassword: payload.newPassword, confirmPassword: payload.confirmPassword || payload.newPassword },
  });
  return res.data;
}
