import { execSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
  const root = path.resolve(__dirname, "..");
  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  execSync("npx prisma db seed", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}
