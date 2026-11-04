# UX-004 – Visa aktuellt analysurval

**Utgångsläge:** `main` `94fe16ed4421304250b1b521936078de7e5f4bda`, efter mergad UX-003/PR #280.

## Problem och evidens

Analysen filtreras på redovisning, timmar/kostnader, mått, aktivitet, år samt organisationsnivå. Tidigare presenterades dessa val i flera kontroller och användaren fick själv pussla ihop vad det aktuella totalvärdet och diagrammen avsåg. Detta är direkt observerbart i `src/analytics/CanonicalAnalytics.tsx`. Faktisk användarpåverkan är en stark inferens, inte ett resultat av användartest.

## Genomförd ändring

- En liten textyta **Aktuellt analysurval** visas direkt efter filtren och före resultaten.
- Texten är härledd från samma `axis`, `unit`, `choices`, `activity`, `year` och `organization` som används i `analyzeCanonical`.
- Organisation kan visa alla UO, UO-grupper, vald grupp, valt UO eller LO/del. Avdelningsanalysen visar redovisning som *Avdelningar*, utan vilseledande aktivitetsfilter.
- Mått anges med svenska namn, både när en eller flera är valda, och aktivitet endast när det är relevant. Året visas även som *Alla år*.
- En ren och testbar formateringsfunktion ligger i `src/analytics/analysisSelectionSummary.ts`.

Detta är en **UX-förändring**, inte en intern refaktorering. Inga ändringar i analysfrågor, navigationsregler, beräkningar, export eller sparade data.

## Verifiering

- `src/analytics/analysisSelectionSummary.test.ts` testar default, år, mått, aktivitet, grupp, UO, LO/del och avdelningsredovisning.
- `e2e/ux-004-analysis-selection-summary.spec.ts` importerar syntetisk XLSX och verifierar att sammanfattningen uppdateras vid år, mått, aktivitet, UO-drilldown, kostnader och avdelningar.
- Full `Verify PWA` på slutlig PR-head krävs (lint, TypeScript, Vitest, båda byggen, singlefile och Playwright).

## Avgränsningar och kvarvarande risk

Ändringen påverkar enbart beskrivning av befintligt urval. Den ersätter inte fullständig manuell UX-/tillgänglighetsacceptans eller verifiering av alla analysberäkningar. `RG-01–RG-10` är inte manuellt utförda och releasebeslutet är fortsatt **NO-GO**.

## Nästa steg

**UX-005:** förbättra förklaringar av låsta, ärvda och manuellt ändrade LO-/UO-fördelningar samt massändringars konsekvenser i en separat verifierbar PR.
