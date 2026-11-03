# KF-002 – Skydda utvalda GapState-skrivningar

## Baseline

- `main` efter mergad KF-001 / PR #270: `03509cd9bc94b1e582dddad01e3f616dfbffb51a`.
- [Verify PWA #41714169584](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41714169584): **success**.
- KF-001:s characterization-test `store.concurrency-baseline.test.ts` visar fortsatt det osäkra beteendet för äldre anrop utan förväntad snapshot. Det testet är medvetet inte borttaget eller gjort svagare.

## Funktionell förändring

`saveGapState(next, expected)` kontrollerar i en **enda IndexedDB readwrite-transaktion** att det persisterade värdet fortfarande motsvarar `expected`, innan det skriver `next`. Ändrades tillståndet under tiden avvisas skrivningen med `STALE_GAP_STATE`; den senare redigerarens ändring får inte ersätta en redan persisterad ändring. Skrivningar via samma objektlager serialiseras av IndexedDB.

Skyddet är aktiverat i:
- `GapView.tsx`: informationskrav, manuella värden och godkännanden (inklusive child-komponenters sparfunktion).
- `ManualUoEditor.tsx`: manuella UO-andelar.
- `BuiltInAllocations.tsx`: årvisa och massvisa LO-aktivitetsfördelningar.

## Tester

- `src/gaps/store.guarded-writes.test.ts`: inriktat kontrakt för konfliktsignal och bevarande av lagrat tillstånd.
- `e2e/kf-002-gapstate-concurrent-tabs.spec.ts`: två faktiska Chromium-flikar redigerar samma tillstånd; föråldrad flik ska få fel och tidigare sparning finnas kvar efter omladdning.
- Ordinarie CI verifierar lint, typkontroll, Vitest, byggning, singlefile och Playwright.

## Kända begränsningar

**Detta är en inkrementell säkerhetsförbättring, inte ett globalt skydd för alla dataskrivningar.** Befintliga anrop `saveGapState(state)` utan `expected` har fortsatt legacy-beteende. De ska migreras med spårbar, verklig lässnapshot och testskydd, inte automatiskt blockeras eller skrivas om i denna PR. Importkompletteringsvyn ligger kvar utanför ändringen för att undvika kollision med [öppen PR #256](https://github.com/erland/pwa-utvecklingsanalys/pull/256). Den behöver motsvarande skydd när den PR:n är hanterad.

Konfliktjämförelsen använder hel-snapshot; även en orelaterad ändring i samma lagrade GapState-post kan därför ge en avvisad skrivning. Det är säkrare än tyst dataförlust, men kan förbättras med mer granularitet senare. Skyddet gäller en IndexedDB-post, inte atomisk uppdatering över flera databaser.

## Status

Steget är **inte slutfört innan Verify PWA på PR-head är grön** och PR:n är granskad/mergad. Nästa planerade steg efter godkänd merge är KF-003, isolera importkompletteringars domänlogik; då måste PR #256:s status kontrolleras igen.
