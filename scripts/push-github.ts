#!/usr/bin/env tsx
/**
 * Push main to GitHub so Vercel deploys. Uses SHORTLIST_GITHUB_TOKEN (same as the dashboard).
 * Cloud agents should run this after every code commit: npm run push:github
 */
import { execSync } from "node:child_process";

const token = process.env.SHORTLIST_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
const repo = process.env.SHORTLIST_GITHUB_REPO?.trim() || "vikasrkarjigi/job-automation";
const branch = process.env.SHORTLIST_GITHUB_BRANCH?.trim() || "main";

if (!token) {
  console.error(
    [
      "Missing SHORTLIST_GITHUB_TOKEN (or GITHUB_TOKEN).",
      "Add the same fine-grained GitHub PAT you use in Vercel to:",
      "  Cursor → Cloud Agents → Environment → Secrets → SHORTLIST_GITHUB_TOKEN",
      "Token needs Contents: Read and write on vikasrkarjigi/job-automation.",
    ].join("\n"),
  );
  process.exit(1);
}

const authUrl = `https://x-access-token:${encodeURIComponent(token)}@github.com/${repo}.git`;

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

try {
  run("git fetch origin main");
} catch {
  /* optional */
}

try {
  run(`git fetch "${authUrl}" ${branch}`);
  run(`git pull --rebase "${authUrl}" ${branch}`);
} catch (e) {
  console.error("Rebase onto GitHub failed — resolve conflicts, then run push:github again.");
  throw e;
}

run(`git push "${authUrl}" HEAD:${branch}`);
run("git push origin main");
console.log(`Pushed to GitHub ${repo}@${branch} and Cursor origin.`);
