import type { Question } from "@prisma/client";

export type ValidatorPreset =
  | "dot"
  | "mc"
  | "email"
  | "phone_us"
  | "custom";

export type QuestionValidationConfig = {
  preset?: ValidatorPreset;
  pattern?: string;
  patternMessage?: string;
  minLength?: number;
  maxLength?: number;
};

export const VALIDATOR_PRESET_OPTIONS: {
  value: ValidatorPreset | "";
  label: string;
  description: string;
}[] = [
  {
    value: "",
    label: "None",
    description: "No format validation (type rules still apply).",
  },
  {
    value: "dot",
    label: "US DOT number",
    description: "1–8 digits (FMCSA motor carrier DOT).",
  },
  {
    value: "mc",
    label: "MC / MX number",
    description: "5–7 digits, optional MC- prefix (e.g. MC-123456).",
  },
  {
    value: "email",
    label: "Email address",
    description: "Standard email format.",
  },
  {
    value: "phone_us",
    label: "US phone",
    description: "10-digit US phone number.",
  },
  {
    value: "custom",
    label: "Custom regex",
    description: "Your own pattern and error message.",
  },
];

const PRESET_RULES: Record<
  Exclude<ValidatorPreset, "custom">,
  { pattern: RegExp; message: string; normalize?: (raw: string) => string }
> = {
  dot: {
    pattern: /^\d{1,8}$/,
    message: "DOT number must be 1–8 digits (numbers only).",
    normalize: (raw) => raw.replace(/\D/g, "").slice(0, 8),
  },
  mc: {
    pattern: /^(MC-?)?\d{5,7}$/i,
    message:
      "MC number must be 5–7 digits, optionally starting with MC- (example: MC-123456).",
    normalize: (raw) => {
      const digits = raw.replace(/\D/g, "");
      if (!digits) return "";
      return digits.length <= 7 ? `MC-${digits}` : `MC-${digits.slice(0, 7)}`;
    },
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Enter a valid email address.",
    normalize: (raw) => raw.trim().toLowerCase(),
  },
  phone_us: {
    pattern: /^\d{10}$/,
    message: "Enter a 10-digit US phone number.",
    normalize: (raw) => raw.replace(/\D/g, "").slice(-10),
  },
};

export function parseQuestionValidation(
  raw: unknown,
): QuestionValidationConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const v = raw as Record<string, unknown>;
  const preset = v.preset;
  return {
    preset:
      typeof preset === "string" &&
      ["dot", "mc", "email", "phone_us", "custom"].includes(preset)
        ? (preset as ValidatorPreset)
        : undefined,
    pattern: typeof v.pattern === "string" ? v.pattern : undefined,
    patternMessage:
      typeof v.patternMessage === "string" ? v.patternMessage : undefined,
    minLength: typeof v.minLength === "number" ? v.minLength : undefined,
    maxLength: typeof v.maxLength === "number" ? v.maxLength : undefined,
  };
}

export function buildQuestionValidation(input: {
  preset: string;
  customPattern?: string;
  customMessage?: string;
  minLength?: string;
  maxLength?: string;
}): QuestionValidationConfig | undefined {
  const preset = input.preset as ValidatorPreset | "";
  if (!preset) return undefined;

  const config: QuestionValidationConfig = { preset };

  if (preset === "custom") {
    const pattern = input.customPattern?.trim();
    if (!pattern) {
      throw new Error("Custom validator requires a regex pattern.");
    }
    try {
      new RegExp(pattern);
    } catch {
      throw new Error("Custom regex pattern is invalid.");
    }
    config.pattern = pattern;
    config.patternMessage =
      input.customMessage?.trim() || "Answer does not match the required format.";
  }

  const min = input.minLength?.trim();
  const max = input.maxLength?.trim();
  if (min) config.minLength = Number(min);
  if (max) config.maxLength = Number(max);

  return config;
}

export function validationConfigToFormState(
  config: QuestionValidationConfig,
): {
  preset: string;
  customPattern: string;
  customMessage: string;
  minLength: string;
  maxLength: string;
} {
  return {
    preset: config.preset ?? "",
    customPattern: config.pattern ?? "",
    customMessage: config.patternMessage ?? "",
    minLength: config.minLength != null ? String(config.minLength) : "",
    maxLength: config.maxLength != null ? String(config.maxLength) : "",
  };
}

export type ValidationResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

export function validateQuestionAnswer(
  question: Pick<Question, "type" | "validation" | "label">,
  rawValue: unknown,
): ValidationResult {
  if (question.type === "YES_NO") {
    if (typeof rawValue === "boolean") return { ok: true, value: rawValue };
    const lower = String(rawValue).trim().toLowerCase();
    if (["yes", "y", "true", "1"].includes(lower)) {
      return { ok: true, value: true };
    }
    if (["no", "n", "false", "0"].includes(lower)) {
      return { ok: true, value: false };
    }
    return { ok: false, message: `${question.label}: answer yes or no.` };
  }

  if (question.type === "NUMBER") {
    const num =
      typeof rawValue === "number" ? rawValue : Number(String(rawValue).trim());
    if (Number.isNaN(num)) {
      return { ok: false, message: `${question.label}: enter a valid number.` };
    }
    return { ok: true, value: num };
  }

  let text = String(rawValue ?? "").trim();
  if (!text) {
    return { ok: false, message: `${question.label}: an answer is required.` };
  }

  const config = parseQuestionValidation(question.validation);

  if (config.preset && config.preset !== "custom") {
    const rule = PRESET_RULES[config.preset];
    if (rule.normalize) text = rule.normalize(text);
    if (!rule.pattern.test(text)) {
      return { ok: false, message: `${question.label}: ${rule.message}` };
    }
    return { ok: true, value: text };
  }

  if (config.preset === "custom" && config.pattern) {
    let regex: RegExp;
    try {
      regex = new RegExp(config.pattern);
    } catch {
      return { ok: true, value: text };
    }
    if (!regex.test(text)) {
      return {
        ok: false,
        message: `${question.label}: ${config.patternMessage ?? "Invalid format."}`,
      };
    }
  }

  if (config.minLength != null && text.length < config.minLength) {
    return {
      ok: false,
      message: `${question.label}: must be at least ${config.minLength} characters.`,
    };
  }
  if (config.maxLength != null && text.length > config.maxLength) {
    return {
      ok: false,
      message: `${question.label}: must be at most ${config.maxLength} characters.`,
    };
  }

  return { ok: true, value: text };
}
