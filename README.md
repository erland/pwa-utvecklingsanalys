# Utvecklingsanalys

React + TypeScript + Vite PWA för verksamhetsutvecklingsanalys, lokalt i webbläsaren.

## DEV-001 – avgränsning

- Navigation med fem arbetsytor; responsivt och tillgängliga formulär.
- Syntetisk demoanalys för urval, gruppering och timmar (inga importdata utges för att vara verkliga).
- Tomt projekt och projektnamn lagras i IndexedDB.
- PWA-manifest, service worker, appikon och grund för offline.
- Unit-tester, Playwright-test och GitHub Actions-verifiering.

**Excelimport, fullständig analysmodell och konfigurationspaket kommer i senare steg.** Importvyn visar tydligt att uppladdning ännu inte stöds.

## Kom igång

```sh
npm install
npm run dev
```

Verifiering: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:browser`.

För GitHub Pages ska `base` och PWA-manifestets scope anpassas om appen distribueras under en undermapp; vi har valt relativa länkar tills dess deploymentprofilen bestäms.

Plan och krav finns i `docs/` och projektstatus i `.system-builder/`.


## Verifiering med Agent Workspace (2026-10-21)

Efter korrigering av Vitest-avgränsning och oanvända imports passerade npm-installation, 4 enhetstester samt TypeScript/Vite-produktionsbygge inklusive service worker. Lint och Playwright E2E har ännu inte körts; DEV-001 är därför fortsatt öppet. CI använder tills vidare npm install eftersom package-lock.json saknas; inför låsfil och npm ci innan release.
