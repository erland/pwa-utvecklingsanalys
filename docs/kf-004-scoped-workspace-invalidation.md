# KF-004 – Relevanta flikvarningar och säker omladdning

## Utgångspunkt

KF-003 är mergad i `main` på `96164d390b2fe5c27dd760cdfd3a79059da82880`. Detta steg är en **UX- och funktionell beteendeförändring**, inte bara en intern refaktorering.

## Problem

- Appen lyssnade tidigare enbart efter `sources-changed` och `workspace-reset`, och visade samma text för bägge.
- När annan flik signalerade en förändring läste App samtidigt in en ny `project` och räknade upp analysens refresh-räknare, trots att en aktuell redigeringsvy fortfarande kunde innehålla äldre interna snapshots.
- `saveGapState` hade inget BroadcastChannel-meddelande, trots att arbetsytans kompletteringar och fördelningar kunde ändras från andra flikar.

## Funktionell ändring

1. `src/storage/workspaceEvents.ts` stödjer den uttryckliga händelsen `gap-state-changed`. Eget sändar-id exkluderas fortfarande, och okända typer ignoreras.
2. `src/gaps/store.ts` sänder händelsen **efter** en lyckad skrivning/transaktion. Avvisade stale writes sänder inte meddelande.
3. `src/App.tsx` visar en varning vid källändring/återställning för samtliga vyer, men vid `gap-state-changed` bara om den andra fliken just befinner sig i `import`, `gaps`, `allocations` eller `analysis`. En vy som öppnas **efter** en icke-relevant händelse hämtar uppdaterade data vid mount.
4. Appen blandar inte längre en automatisk partiell projektuppdatering med ett kvarvarande gammalt redigeringstillstånd. Användaren får tydlig information och väljer `Ladda om nu` för ett sammanhållet nytt arbetsläge.

## Testkontrakt

- `src/storage/workspaceEvents.test.ts` verifierar tillåtna meddelanden, okända händelser, self-notification och avregistrering.
- `e2e/kf-004-scoped-workspace-invalidation.spec.ts` provar två verkliga flikar: inaktiv översikt ska inte få gap-varning; aktiv kompletteringsvy ska få varning; skrivaren ska inte få varning; omladdning läser den senaste informationen.
- `e2e/ip-003-cross-tab-invalidation.spec.ts` verifierar att import fortfarande varnar andra flikar.
- Samma GitHub Actions Verify PWA med lint, typkontroll, Vitest, byggning, fristående HTML och Playwright ska passera innan steget märks klart.

## Begränsningar

- BroadcastChannel är en varningsmekanism, **inte** en säker låsning, och finns inte i alla miljöer. Det ändrar inte existerande `saveGapState`-anrops revisionsskydd. Oskyddade äldre skrivvägar kan fortfarande förlora ändringar.
- Händelsen anger att något i GapState ändrats, inte exakt vilket fält. Samtidiga redigerare i berörda vyer varnas hellre än riskerar en gammal snapshot.
- `workspace-reset` förblir kritisk även i en irrelevant vy. Det finns inget försök att automatiskt göra en partiell återställning.
- PR #256 ändrar importkompletteringsvyn och förblir separat från denna PR.

Nästa steg efter verifiering och merge: **KF-005** – renodla appens initiering och projektuppdateringar, med beteendebevarande regressionstester.
