#!/usr/bin/env tsx
/**
 * Push main to GitHub so Vercel deploys. Uses SHORTLIST_GITHUB_TOKEN or GITHUB_TOKEN.
 * Cloud agents should run this after every code commit: npm run push:github
 */
import { execSync } from "node:child_process";

/** Vercel uses SHORTLIST_GITHUB_TOKEN; Cloud Agent secrets often use GITHUB_TOKEN. */
const token = process.env.SHORTLIST_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
const repo = process.env.SHORTLIST_GITHUB_REPO?.trim() || "vikasrkarjigi/job-automation";
const branch = process.env.SHORTLIST_GITHUB_BRANCH?.trim() || "main";

if (!token) {
  console.error(
    [
      "Missing SHORTLIST_GITHUB_TOKEN (or GITHUB_TOKEN).",
      "Add the same fine-grained GitHub PAT you use in Vercel to Cloud Agent secrets as",
      "  GITHUB_TOKEN or SHORTLIST_GITHUB_TOKEN",
      "Token needs Contents: Read and write on vikasrkarjigi/job-automation.",
    ].join("\n"),
  );
  process.exit(1);
}

const remote = `https://github.com/${repo}.git`;
const authEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GH_PUSH_TOKEN: token,
};

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env: authEnv });
}

/** Push/fetch without putting the token in the remote URL (avoids leaking in logs). */
function gitWithAuth(args: string) {
  run(`git -c 'credential.helper=!f() { echo "username=x-access-token"; echo "password=$GH_PUSH_TOKEN"; }; f' ${args}`);
}

try {
  run("git fetch origin main");
} catch {
  /* optional */
}

try {
  gitWithAuth(`fetch "${remote}" ${branch}`);
  gitWithAuth(`pull --rebase "${remote}" ${branch}`);
} catch {
  console.error("Rebase onto GitHub failed — resolve conflicts, then run push:github again.");
  process.exit(1);
}

gitWithAuth(`push "${remote}" HEAD:${branch}`);
console.log(`Pushed to GitHub ${repo}@${branch}.`);

try {
  run("git pull --rebase origin main");
  run("git push origin main");
  console.log("Synced Cursor origin.");
} catch {
  console.warn("GitHub is updated; Cursor origin push skipped (non-fatal).");
}
