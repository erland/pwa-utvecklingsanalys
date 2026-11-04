# RR-03-01 – Atomärt revisionsskydd för UO-importkomplettering

**Bas:** `main` `faea4b214720fc79c94bd7f28e00f6a96d2106e3`, efter mergad KF-006/PR #275.

## Verifierad brist
`src/import/UoImportCompletionView.tsx` läste senaste `GapState`, jämförde `uoImportCompletions` med tidigare vydata och anropade `saveGapState(next)` utan `expected`. Kontroll och skrivning var alltså inte atomiska. En annan flik kunde skriva i mellanrummet, varefter en gammal helstateskrivning riskerade att ersätta dess resultat.

## Avgränsad korrigering
- Använd `saveGapState(next,latest)` i importkompletteringen. Då jämför `src/gaps/store.ts` aktuell helstate mot förväntad snapshot **inne i samma IndexedDB readwrite-transaktion**. Konkurrerande ändringar avvisas som `STALE_GAP_STATE`.
- Översätt just detta fel till läsbar svensk text med instruktion om omladdning. Den tidigare kontrollen mot formulärets `uoImportCompletions` behålls, och oförändrade ändringar i andra delar av helstate som redan finns i `latest` bevaras.
- Ändra inte importregler, kompletteringsvärden, UO-gruppering eller kolumnstrukturen.

## Testevidens
- `e2e/rr-03-uo-import-completion-concurrent-tabs.spec.ts`: två sidor laddar samma import och anger olika värden; första sparar, andra måste få konfliktmeddelande; omladdning visar oförändrade värden från första skrivningen.
- `src/gaps/store.guarded-writes.test.ts`: sedan KF-002 finns deterministisk transaktions-CAS med stale snapshot i enhetstest.
- Ordinarie Verify PWA i GitHub Actions måste passera: lint, TypeScript, Vitest, build, singlefile och Playwright.

## PR #256 – separat disposition
`src/import/UoImportCompletionView.tsx` innehåller redan gruppering per UO, expanderbara UO-sektioner samt en gemensam spara-knapp per UO. Den öppna draft-PR:n #256 introducerade samma huvudsakliga flöde från en äldre kodbas och har därför **ingen kvarvarande nödvändig funktion** utifrån nuvarande krav. Dess diff innehåller främst alternativa implementationer av samma UI och små ordval. Det är säkrare att markera den som **ersatt av senare mergade ändringar** än att lösa mergekonflikter för en andra implementation. Registrera dispositionen och stäng PR #256 med motivering, **utan merge**.

## Begränsningar
Detta löser **en** kritisk skrivväg, inte alla ovillkorliga `saveGapState(next)`-anrop. RR-03 är fortfarande delvis öppen tills resterande skribenter inventerats och antingen korrigerats eller riskaccepterats. BroadcastChannel ger varningar men är inte datalåsning. Cross-database restore är fortfarande inte atomisk. Manuell RG-acceptans återstår och releasebeslutet är fortsatt NO-GO.

## Nästa rekommenderade åtgärd
Inventera återstående ovillkorliga `saveGapState`-anrop efter att denna PR mergats. Prioritera faktiska användarvägar och gör endast fokuserade, testbara ändringar. Separat manuell releaseacceptans RG-01–RG-10 krävs före GO.
