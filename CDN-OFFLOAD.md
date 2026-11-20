# Static asset offload — preparation and safeguards

This is an optional build-time integration. With `F1_ASSET_PROJECT` unset,
Vercel serves the original local assets and `link` is a no-op. Do not enable it
for the main production project before a matching Pages release has passed
browser checks and there is an agreed rollback procedure. Leave the backup's
settings unchanged.

1. Connect a dedicated Cloudflare Pages project to the trusted frontend repo.
   Use the repository root, Node 22, production branch `main`, and no functions.
   Disable untrusted preview deployments. The build command is
   `npm run build && node scripts/static-origin.mjs pages PROJECT_LABEL`; the
   output directory is `pages-static`. The project label must be the Pages
   hostname prefix, not a full URL. Match public `VITE_*` values and Node version
   with Vercel. Never copy secrets.
2. Run `node scripts/static-origin.mjs configure PROJECT_LABEL`; review and
   commit the resulting project-specific CSP change. The CSP permits assets
   from subdomains of this Pages project, so restrict who may deploy there.
3. Deploy a matching commit to Pages. The per-deployment `CF_PAGES_URL` must be
   public and `release.json` must identify the hashed deployment. The build
   copies only static folders and records a fingerprint of asset names, bytes,
   and this script. No video is hosted or proxied.
4. Configure `F1_ASSET_PROJECT=PROJECT_LABEL` on a trusted Vercel preview of
   the same source. A configured build waits briefly for Pages and fails closed
   if fingerprints or pinned metadata do not match. It rewrites generated HTML
   to the verified deployment. JS/CSS in Pages rewrite root static paths there;
   main HTML, navigation, APIs, viewer counter, and media stay on their original
   hosts. Browser-test main pages, profiles, player, replay assets, CSP and CORS.
   A preview URL may not be allowed by production APIs; verify on trusted hosts.
5. Only after approval, enable the variable for the main production environment
   and redeploy. Compare Vercel Edge Requests per 1,000 page documents over
   similar periods. Browser-cached assets may not reach either provider. External
   requests, including Render and video providers, never counted against Vercel.

Cloudflare can delete old deployment-specific URLs after its retention window.
Before using rollback, verify that its pinned Pages deployment still exists.
If it does not, roll back to a Vercel deployment with offload disabled, or unset
`F1_ASSET_PROJECT` and redeploy. Do not assume an old URL can be kept forever.
If Cloudflare assets become unavailable during a live deployment, the currently
served HTML does not automatically fall back; restore the no-offload Vercel
release. Retain local asset copies and rehearse the rollback before production.
