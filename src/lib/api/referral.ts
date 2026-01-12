import { jsonFetch } from "./client";
import { authHeaders } from "./utils";
import type { ReferralStats, ReferralHistoryItem, ReferralValidation } from "../../types";

export type ReferralCodeResponse = {
  success: boolean;
  message: string;
  data: {
    referralCode: string;
  };
};

export type ReferralStatsResponse = {
  success: boolean;
  message: string;
  data: ReferralStats;
};

export type ReferralHistoryResponse = {
  success: boolean;
  message: string;
  data: {
    referrals: ReferralHistoryItem[];
    total: number;
  };
};

export type ReferralValidationResponse = {
  success: boolean;
  message: string;
  data: ReferralValidation;
};

/**
 * Get current user's referral code
 */
export async function getMyReferralCode(): Promise<string> {
  const res = await jsonFetch<ReferralCodeResponse>("/api/v1/referrals/my-code", {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data.referralCode;
}

/**
 * Get referral statistics for current user
 */
export async function getReferralStats(): Promise<ReferralStats> {
  const res = await jsonFetch<ReferralStatsResponse>("/api/v1/referrals/stats", {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data;
}

/**
 * Get referral history for current user
 */
export async function getReferralHistory(params: {
  status?: string;
  limit?: number;
} = {}): Promise<{ referrals: ReferralHistoryItem[]; total: number }> {
  const qp = new URLSearchParams();
  if (params.status) qp.set("status", params.status);
  if (params.limit) qp.set("limit", String(params.limit));

  const url = `/api/v1/referrals/history${qp.toString() ? `?${qp.toString()}` : ''}`;
  const res = await jsonFetch<ReferralHistoryResponse>(url, {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data;
}

/**
 * Validate a referral code
 */
export async function validateReferralCode(referralCode: string): Promise<ReferralValidation> {
  const res = await jsonFetch<ReferralValidationResponse>("/api/v1/referrals/validate", {
    method: "POST",
    headers: authHeaders(),
    body: { referralCode },
  });
  return res.data;
}
