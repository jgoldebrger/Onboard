import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnvLocal();

  const key = process.env.FMCSA_WEB_KEY?.trim();
  const dot = process.argv[2] ?? "213754";
  const base = "https://mobile.fmcsa.dot.gov/qc/services";

  const endpoints: [string, string][] = [
    ["carrier", `/carriers/${dot}`],
    ["authority", `/carriers/${dot}/authority`],
    ["basics", `/carriers/${dot}/basics`],
    ["cargo", `/carriers/${dot}/cargo-carried`],
    ["operation", `/carriers/${dot}/operation-classification`],
    ["oos", `/carriers/${dot}/oos`],
    ["dockets", `/carriers/${dot}/docket-numbers`],
  ];

  console.log(`FMCSA_WEB_KEY: ${key ? `set (${key.length} chars)` : "MISSING"}`);
  console.log(`Testing DOT ${dot}\n`);

  if (!key) {
    process.exit(1);
  }

  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    console.log("NODE_TLS_REJECT_UNAUTHORIZED=0 (TLS verification disabled)\n");
  }

  let failed = 0;
  for (const [name, path] of endpoints) {
    const url = `${base}${path}?webKey=${encodeURIComponent(key)}`;
    const start = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const ms = Date.now() - start;
      if (!res.ok) {
        const body = await res.text();
        console.log(`${name.padEnd(10)} HTTP ${res.status}  ${ms}ms`);
        console.log(`  ${body.slice(0, 150)}`);
        failed++;
        continue;
      }
      const json = (await res.json()) as {
        content?: {
          carrier?: { legalName?: string };
        };
      };
      const legal = json?.content?.carrier?.legalName;
      console.log(
        `${name.padEnd(10)} HTTP ${res.status}  ${ms}ms  ${legal ?? "OK"}`,
      );
    } catch (err) {
      const e = err as Error & { cause?: unknown };
      console.log(`${name.padEnd(10)} FAILED       ${e.message}`);
      if (e.cause) console.log(`  cause: ${String(e.cause)}`);
      failed++;
    }
  }

  console.log(failed === 0 ? "\nAll endpoints reachable." : `\n${failed} endpoint(s) failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
