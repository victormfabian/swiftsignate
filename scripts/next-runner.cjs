const { spawn } = require("node:child_process");

const [, , command, distDir, ...args] = process.argv;

if (!command || !distDir) {
  console.error("Usage: node scripts/next-runner.cjs <command> <distDir> [...args]");
  process.exit(1);
}

const nextBin = require.resolve("next/dist/bin/next");
const resolvedDistDir = process.env.VERCEL ? ".next" : distDir;

const child = spawn(process.execPath, [nextBin, command, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_DIST_DIR: resolvedDistDir
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
