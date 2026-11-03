# KF-001 – Reproducerbar samtidighetsbaseline

## Källversion och verifierad utgångspunkt

- Repository: `erland/pwa-utvecklingsanalys`, `main`
- Ursprunglig baseline: `5686e3376ce4d80a3a29796fb3c457e8d239065c`
- GitHub Actions Verify PWA på ursprungscommit: [41712022764](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41712022764) – **success**.
- Ordinarie CI: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:singlefile`, singlefile-verifiering och `npm run test:browser`.
- Detta är en test-/dokumentationsändring; produktionskod och produktbeteende är oförändrade.

## Evidens och konkret risk

`src/gaps/store.ts` implementerar `loadGapState` som ett läs-anrop mot IndexedDB och `saveGapState` som `put('state', state, 'active')`. Ingen revisionsparameter eller transaktionsbaserad jämförelse finns i denna skrivväg. En redigerare kan därför läsa ett gammalt objekt, medan en annan sparar en nyare version, och därefter skriva över den nyare ändringen.

Det deterministiska testet `src/gaps/store.concurrency-baseline.test.ts` isolerar gränsen `openDB` genom en minimal in-memory-dubbel som returnerar strukturerade kopior vid läsning. Två redigerare får var sin ursprungssnapshot. När den första sparar en komplettering och den andra sparar ett krav från sin äldre snapshot visar sista läsningen att den första kompletteringen gått förlorad.

**Viktigt:** testet är en *characterization* av ett **känt felbeteende**, inte en garanti att samtidiga uppdateringar är säkra. I KF-002 måste förväntningen ändras till att en stale skrivning avvisas eller att uppdateringarna förenas atomärt. Korrigeringen ska köras mot riktig IndexedDB i webbläsare, inte enbart testdubbeln.

## Befintligt skydd som bör bevaras

- `src/storage/workspaceEvents.test.ts`: BroadcastChannel-invalidering.
- `e2e/ip-003-cross-tab-invalidation.spec.ts`: importvarning i annan flik.
- `e2e/ip-006-optional-allocation-conflict.spec.ts`: revisionsskydd för valfria fördelningstyper.
- `docs/release-readiness-2026-11-03.md`: RR-03 beskriver kvarvarande oskyddade skrivvägar och manualtestkrav.

## Avgränsningar

Ingen omfattande omskrivning av `GapState`, ingen UI-förändring och inget nytt beroende. PR #256 (importkompletteringar) är ett separat öppet utkast; denna PR ändrar inte dess komponenter eller kontrakt. Uppdatera baseline efter eventuell merge av #256 innan KF-002.

## Verifiering och nästa steg

För baselineskyddet: `npm test -- src/gaps/store.concurrency-baseline.test.ts`. Ordinarie `Verify PWA` ska köras på PR:ens faktiska head-SHA. KF-001 får markeras slutfört **först när denna CI har passerat**.

Nästa steg efter godkänd merge: **KF-002**. Inför en reviderings-/CAS- eller transaktionsbaserad uppdateringsväg för utpekade GapState-mutationer och lägg till riktig IndexedDB-/Playwright-regression för två skribenter. Skilj fel som beror på separat databaser/återställningsjournal från samma-post-konflikter.
