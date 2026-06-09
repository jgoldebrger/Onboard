export type PhoneVerifyProvider = "stub" | "twilio" | "numverify";

export type PhoneVerifyResult = {
  available: boolean;
  provider: PhoneVerifyProvider;
  isVoip: boolean | null;
  isDisposable: boolean | null;
  lineType: string | null;
  carrier: string | null;
};

const UNAVAILABLE: PhoneVerifyResult = {
  available: false,
  provider: "stub",
  isVoip: null,
  isDisposable: null,
  lineType: null,
  carrier: null,
};

function resolveProvider(): PhoneVerifyProvider {
  const raw = (process.env.PHONE_VERIFY_PROVIDER ?? "stub").toLowerCase();
  if (raw === "twilio" || raw === "numverify") return raw;
  return "stub";
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return value.startsWith("+") ? value : `+${digits}`;
}

const VOIP_LINE_TYPES = new Set([
  "fixedvoip",
  "nonfixedvoip",
  "voip",
  "virtual",
  "personal",
]);

function isVoipLineType(lineType: string | null | undefined): boolean {
  if (!lineType) return false;
  return VOIP_LINE_TYPES.has(lineType.toLowerCase());
}

async function verifyWithTwilio(phone: string, apiKey: string): Promise<PhoneVerifyResult> {
  const [accountSid, authToken] = apiKey.split(":");
  if (!accountSid || !authToken) {
    return { ...UNAVAILABLE, provider: "twilio" };
  }

  const encoded = encodeURIComponent(phone);
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encoded}?Fields=line_type_intelligence`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    return { ...UNAVAILABLE, provider: "twilio" };
  }

  const data = (await response.json()) as {
    line_type_intelligence?: { type?: string; carrier_name?: string };
  };
  const lineType = data.line_type_intelligence?.type ?? null;
  const isVoip = isVoipLineType(lineType);

  return {
    available: true,
    provider: "twilio",
    isVoip,
    isDisposable: isVoip && lineType?.toLowerCase() === "nonfixedvoip",
    lineType,
    carrier: data.line_type_intelligence?.carrier_name ?? null,
  };
}

async function verifyWithNumverify(phone: string, apiKey: string): Promise<PhoneVerifyResult> {
  const digits = phone.replace(/\D/g, "");
  const url = new URL("https://apilayer.net/api/validate");
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("number", digits);

  const response = await fetch(url);
  if (!response.ok) {
    return { ...UNAVAILABLE, provider: "numverify" };
  }

  const data = (await response.json()) as {
    valid?: boolean;
    line_type?: string;
    carrier?: string;
  };

  if (!data.valid) {
    return { ...UNAVAILABLE, provider: "numverify" };
  }

  const lineType = data.line_type ?? null;
  const isVoip = isVoipLineType(lineType);

  return {
    available: true,
    provider: "numverify",
    isVoip,
    isDisposable: lineType?.toLowerCase() === "special_services",
    lineType,
    carrier: data.carrier ?? null,
  };
}

/** VoIP / disposable phone check. No-ops when PHONE_VERIFY_API_KEY is unset. */
export async function verifyPhone(phone: string): Promise<PhoneVerifyResult> {
  const trimmed = phone.trim();
  if (!trimmed) return UNAVAILABLE;

  const apiKey = process.env.PHONE_VERIFY_API_KEY?.trim();
  if (!apiKey) return UNAVAILABLE;

  const provider = resolveProvider();
  const normalized = normalizePhone(trimmed);

  try {
    if (provider === "twilio") {
      return await verifyWithTwilio(normalized, apiKey);
    }
    if (provider === "numverify") {
      return await verifyWithNumverify(normalized, apiKey);
    }
  } catch {
    return { ...UNAVAILABLE, provider };
  }

  return UNAVAILABLE;
}
