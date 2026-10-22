# Release distribution

Two variants are produced from the same release tag:

1. **GitHub Pages PWA**: `dist/`, offline-capable through a service worker, deployable at the repository's GitHub Pages URL.
2. **Standalone HTML**: `utvecklingsanalys-standalone.html` attached to the GitHub Release and available as a CI artifact on manual runs. It embeds JavaScript and CSS and does not register a service worker.

The `.github/workflows/release.yml` workflow runs when a GitHub Release is **published**, or manually via Actions. The Pages job requires GitHub repository **Settings → Pages → Build and deployment → GitHub Actions**. Creating a tag without publishing a Release will not trigger the release workflow. A release should point to a verified commit on `main`.

```bash
npm install
npm run build
npm run build:singlefile
node scripts/verify-singlefile.mjs
```

## Serving standalone HTML

Place the one HTML file on any ordinary static **HTTP(S) file server** and open it in a modern browser. All application JS/CSS are inline. Import/export is browser-side; data is held by IndexedDB **under the origin URL**. Moving between different hosts, ports, schemes, or between `file://` and HTTP(S) changes the storage origin. Export your project backup before moving.

Opening it as `file://` by double-clicking is **not guaranteed** to retain IndexedDB storage consistently in all browsers and can affect browser security APIs such as gzip compression. Prefer HTTP(S) and test each target browser. Service workers/PWA installation are only in the Pages variant. No application server/backend is required, but a file server must set suitable HTML MIME type and must not inject a CSP that blocks inline JS/CSS.

The HTML bundle may be large because ExcelJS and related dependencies are embedded. This is a trade-off for one-file distribution. The build verifier checks that no external JS/CSS is referenced. Browser behavior and local storage reliability must still be tested against target hosts.
