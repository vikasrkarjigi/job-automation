# Why Vercel still shows the old dashboard

Vercel builds from **GitHub**: `https://github.com/vikasrkarjigi/job-automation` (branch `main`).

UI changes are only live after they exist on **GitHub `main`**, not only in Cursor’s cloud git.

## What happened

Recent dashboard work (Job automation branding, no top header, Find jobs tab, Cloud models tab, submit buttons, etc.) was committed on Cursor **`origin`**. The dashboard on Vercel also saves pipeline state (`Dashboard: Approved …`, `Scheduled run …`) straight to **GitHub `main`**.

Those two streams diverged: GitHub had your **data** commits but was **missing the latest UI commits**, so Production stayed on the older layout (Shortlist, top tabs, Agents & models combined).

## Fix (one time)

From a machine with GitHub access, using a PAT with **Contents: Read and write** on this repo:

```bash
git clone https://github.com/vikasrkarjigi/job-automation.git
cd job-automation
git pull origin main
# If you use Cursor’s repo as source, pull/rebase from there first, then:
git push origin main
```

Or in GitHub → **Compare & pull request** / merge any open branch that contains commits through `Remove top header; rebrand to Job automation job pipeline`.

After `main` updates, Vercel should start a new **Production** deployment within a minute. Hard-refresh the site (Ctrl+Shift+R).

## Confirm the deploy

On Vercel → **Deployments** → latest Production → **Source** should mention a commit **after** the UI commits (e.g. message contains `Job automation` or `Find jobs tab`).

In the app you should see:

- Sidebar title **Job automation** / **Job pipeline**
- No horizontal tab row under the header
- **Find jobs** and **Cloud models** in the sidebar
