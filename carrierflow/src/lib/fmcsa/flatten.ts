/** Flatten nested FMCSA JSON into dot-notation keys for display. */
export function flattenFmcsaValue(
  value: unknown,
  prefix = "",
  depth = 0,
  maxDepth = 8,
): Record<string, unknown> {
  if (depth > maxDepth) {
    return prefix ? { [prefix]: value } : {};
  }

  if (value === null || value === undefined) {
    return prefix ? { [prefix]: value } : {};
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return prefix ? { [prefix]: [] } : {};
    const out: Record<string, unknown> = {};
    value.forEach((item, index) => {
      const key = prefix ? `${prefix}[${index}]` : `[${index}]`;
      Object.assign(out, flattenFmcsaValue(item, key, depth + 1, maxDepth));
    });
    return out;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0) return prefix ? { [prefix]: {} } : {};

    const out: Record<string, unknown> = {};
    for (const key of keys) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      Object.assign(
        out,
        flattenFmcsaValue(record[key], nextPrefix, depth + 1, maxDepth),
      );
    }
    return out;
  }

  return prefix ? { [prefix]: value } : {};
}

export function envelopeContent(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const env = value as Record<string, unknown>;
  return env.content ?? value;
}
