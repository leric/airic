#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./infrastructure/config/load-env.js";
import { startAcpServer } from "./interfaces/acp/acp-server.js";

function readPackageVersion(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const packagePath = join(moduleDir, "..", "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { version: string };
  return pkg.version;
}

function printHelp(): void {
  console.log(`Airic — Markdown-configured agent kernel (ACP stdio server)

Usage:
  airic              Start the ACP server on stdin/stdout
  airic --version    Print version
  airic --help       Show this help

Connect from Zed or another ACP client. See https://github.com/leric/airic`);
}

const args = process.argv.slice(2);
if (args.includes("--version") || args.includes("-v")) {
  console.log(readPackageVersion());
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

loadEnvFile();
startAcpServer();
