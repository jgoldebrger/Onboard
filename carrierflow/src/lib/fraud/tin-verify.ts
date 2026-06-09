import { normalizeEin } from "./tin";

export type TinVerifyProvider = "stub" | "taxidpro" | "sovos";

export type TinVerifyResult = {
  available: boolean;
  provider: TinVerifyProvider;
  match: boolean | null;
  tin: string | null;
  name: string | null;
  message: string | null;
};

const UNAVAILABLE: TinVerifyResult = {
  available: false,
  provider: "stub",
  match: null,
  tin: null,
  name: null,
  message: null,
};

function resolveProvider(): TinVerifyProvider {
  const raw = (process.env.TIN_VERIFY_PROVIDER ?? "stub").toLowerCase();
  if (raw === "taxidpro" || raw === "sovos") return raw;
  return "stub";
}

async function verifyWithTaxIdPro(
  tin: string,
  name: string,
  apiKey: string,
): Promise<TinVerifyResult> {
  const response = await fetch("https://api.taxid.pro/v1/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tin, name }),
  });

  if (!response.ok) {
    return { ...UNAVAILABLE, provider: "taxidpro", tin, name };
  }

  const data = (await response.json()) as {
    match?: boolean;
    message?: string;
  };

  return {
    available: true,
    provider: "taxidpro",
    match: data.match ?? false,
    tin,
    name,
    message: data.message ?? null,
  };
}

async function verifyWithSovos(
  tin: string,
  name: string,
  apiKey: string,
): Promise<TinVerifyResult> {
  const response = await fetch("https://api.sovos.com/tin-match/v1/verify", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tin, taxpayerName: name }),
  });

  if (!response.ok) {
    return { ...UNAVAILABLE, provider: "sovos", tin, name };
  }

  const data = (await response.json()) as {
    matched?: boolean;
    status?: string;
  };

  return {
    available: true,
    provider: "sovos",
    match: data.matched ?? false,
    tin,
    name,
    message: data.status ?? null,
  };
}

/**
 * TIN / legal name match check for carrier tax ID verification.
 * IRS has no public API — uses commercial TIN matching when configured.
 * No-ops when TIN_VERIFY_API_KEY is unset.
 */
export async function verifyTin(params: {
  tin: string;
  name: string;
}): Promise<TinVerifyResult> {
  const tin = normalizeEin(params.tin);
  const name = params.name.trim();
  if (!tin || !name) return UNAVAILABLE;

  const apiKey = process.env.TIN_VERIFY_API_KEY?.trim();
  if (!apiKey) return UNAVAILABLE;

  const provider = resolveProvider();

  try {
    if (provider === "taxidpro") {
      return await verifyWithTaxIdPro(tin, name, apiKey);
    }
    if (provider === "sovos") {
      return await verifyWithSovos(tin, name, apiKey);
    }
  } catch {
    return { ...UNAVAILABLE, provider, tin, name };
  }

  return UNAVAILABLE;
}
