import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(root, "apps/web");
const devUrl = "http://localhost:5177/";

function isPortInUse(port) {
  try {
    const out = execSync(`lsof -i :${port} -sTCP:LISTEN`, { encoding: "utf8" });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!existsSync(path.join(root, "node_modules"))) {
  fail(
    "Dependencies not installed. Run:\n" +
      `  cd "${root}"\n` +
      "  npm install"
  );
}

if (!existsSync(path.join(root, "packages/ui/src/index.ts"))) {
  fail(
    "Design system packages missing. Expected:\n" +
      `  ${path.join(root, "packages/ui")}`
  );
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

console.log("\n→ Building design tokens…");
await run("npm", ["run", "tokens:build"], root);

if (isPortInUse(5177)) {
  console.log(`\n→ Dev server already running at ${devUrl}\n`);
  process.exit(0);
}

console.log(`\n→ Starting dev server at ${devUrl}\n`);
await run("npm", ["run", "dev"], webRoot);
