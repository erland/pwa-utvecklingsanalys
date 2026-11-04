# RR-03-02 – Skydda LO-komplettering efter import mot samtidiga ändringar

**Källbas:** `main` `f81da30b4a678d7b12726b1884da7b1e09ee3eb5`, efter mergad PR #276.

## Identifierad risk

`src/import/BudgetCompletionAfterImport.tsx` hade två anrop till `saveGapState(next)` utan CAS: `approveAll` (massgodkännande) och `onApprove` (manuell justering för UO/år). Dessa läste ett senaste `GapState` före lagring och kunde därför skriva över en annan fliks helstate om den uppdaterades mellan läsning och skrivning.

Även om man lägger till `saveGapState(next,latest)` finns ett särskilt UX-problem: redigeraren beräknar sina beslut från en tidigare renderad `state`/preview. En ny `latest` kan innehålla ändrade fördelningsbeslut utan att användaren sett dem. Därför behövs **både** kontroll av det ursprungliga fördelningsläget **och** atomär CAS vid commit.

## Åtgärd

- `src/import/budgetCompletionConcurrency.ts`: ren funktion `assertBudgetAllocationSnapshot(current,latest)` jämför fördelningsregler och beslut; tolererar fristående ändringar i andra fält i GapState.
- `BudgetCompletionAfterImport.tsx`: båda sparvägarna avvisar föråldrade beslut före beräkning och använder `saveGapState(next,latest)`. IndexedDB-transaktionen avvisar dessutom skrivningar som inträffar efter `loadGapState`.
- Konflikter ger befintlig felhantering: massgodkännande visar fel i statusmeddelandet; manuell redigering får feltext via `LoAllocationDraft`.
- Ingen ändring av fördelningsalgoritmer, gränsvärden, dataformat eller navigation.

## Testkontrakt

`src/import/budgetCompletionConcurrency.test.ts` verifierar: (1) aktuellt beslut accepteras trots orelaterade data, (2) nyligen tillkomna fördelningsregler leder till `STALE_GAP_STATE`, (3) ändrade beslut avvisas utan mutation. `src/gaps/store.guarded-writes.test.ts` och `e2e/kf-002-gapstate-concurrent-tabs.spec.ts` verifierar transaktionsbaserad CAS, och ordinarie Playwright-svit skyddar import och fördelningsflöden. Full `Verify PWA` ska passera på den slutliga PR-headen.

## Kvarvarande begränsningar

Detta skyddar de två sparvägarna i `BudgetCompletionAfterImport`, inte hela appens övriga IndexedDB-/konfigurations-/planeringslagring. `RR-03` är endast delvis åtgärdad. I synnerhet måste separata lagringsmoduler för fördelningar och planering analyseras innan fullständig samtidighetssäkerhet kan påstås. Manuell acceptans `RG-01–RG-10` är inte utförd. **Releasebeslut: NO-GO.**

## Nästa steg

Efter merge: inventera övriga kritiska lagringsmoduler och prioritera bara de kvarvarande dataförlustvägar som kan beläggas med reproducerbara tester; därefter komplettera manuell releaseacceptans.
