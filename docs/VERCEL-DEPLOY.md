# Vercel not deploying on git push?

Commits from this repo (including cloud agents) push to **`https://github.com/vikasrkarjigi/job-automation`** branch **`main`**. You can confirm on GitHub → **Commits**; the tip should match what you expect (for example `f5dd7af` or newer).

If **Vercel stays on an old commit** (for example `aba9acd`) and no new row appears in **Deployments** after a push, the **GitHub → Vercel webhook** is broken or the project is wired to the wrong repo. **Redeploy** on an old deployment only rebuilds that old commit; it does not pull newer commits.

## Fix the Git integration (do this first)

1. **GitHub** → **Settings** → **Applications** → **Vercel** → **Configure**.
2. Under **Repository access**, ensure **`vikasrkarjigi/job-automation`** is allowed (or “All repositories” if you prefer).
3. **Vercel** → your **job-automation** project → **Settings** → **Git**:
   - **Connected Git Repository** must be **`vikasrkarjigi/job-automation`**, not a Cursor mirror or another fork.
   - **Production Branch** must be **`main`**.
   - **Ignored Build Step** should be empty unless you added a custom command on purpose.
4. **Disconnect** the repo and **Connect** it again if the repo name is correct but pushes still do not create deployments.
5. **Deployments** → **Create Deployment** → branch **`main`** → latest commit → **Production** (one-time catch-up).

After a fix, every push to `main` should add a new deployment within about a minute.

## Backup: Deploy Hook + GitHub Action

If Git integration is flaky, add this GitHub Action (create the file in the GitHub web UI so you do not need a token with **workflow** scope):

1. **Vercel** → **Settings** → **Git** → **Deploy Hooks** → create hook for **`main`**. Copy the URL.
2. **GitHub** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Name: `VERCEL_DEPLOY_HOOK`
   - Value: the hook URL
3. On GitHub, **Add file** → **Create new file** → path `.github/workflows/vercel-deploy.yml` → paste:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
permissions: {}
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel production build
        env:
          HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }}
        run: |
          if [ -z "$HOOK" ]; then
            echo "::warning::VERCEL_DEPLOY_HOOK is not set. Skipping."
            exit 0
          fi
          curl -fsS -X POST "$HOOK"
```

4. Commit to **`main`**. Every push will call the deploy hook. The job no-ops with a warning until the secret exists.

## Environment variables

After changing **Environment Variables** in Vercel (`DASHBOARD_PASSWORD`, `SHORTLIST_GITHUB_TOKEN`, `CURSOR_API_KEY`), you must **Redeploy Production** for that deployment to see the new values. Git auto-deploy does not apply env changes to an already-built deployment until the next build.
