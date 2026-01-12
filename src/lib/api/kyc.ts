import { jsonFetch, formFetch } from "./client";
import { authHeaders } from "./utils";

export async function getKYCStatus() {
  const res = await jsonFetch<{ data: any }>("/api/v1/kyc/status", {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data;
}

export async function getKYCRequirements() {
  const res = await jsonFetch<{ data: any }>("/api/v1/kyc/requirements", {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data;
}

export async function getKYCDocuments() {
  const res = await jsonFetch<{ data: any }>("/api/v1/kyc/documents", {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data;
}

export async function submitKYC(payload: {
  documentType: string;
  kycData: Record<string, any>;
  documentFront?: File | null;
  documentBack?: File | null;
  selfie?: File | null;
  additional?: File | null;
}) {
  const form = new FormData();
  form.append("documentType", payload.documentType);
  form.append("kycData", JSON.stringify(payload.kycData));
  if (payload.documentFront) form.append("documentFront", payload.documentFront);
  if (payload.documentBack) form.append("documentBack", payload.documentBack);
  if (payload.selfie) form.append("selfie", payload.selfie);
  if (payload.additional) form.append("additional", payload.additional);
  return await formFetch<{ data: any }>("/api/v1/kyc/submit", form, authHeaders());
}
