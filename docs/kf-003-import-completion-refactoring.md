# KF-003 – Separera importkompletteringarnas domänlogik

## Syfte och källa

- Bas: `main` på `b7432ec6f784e63d4af1952e273df137bdbaf09f` (PR #271 mergad).
- Ändringstyp: **beteendebevarande refaktorering**.
- Avgränsning: UO-kompletteringsvyn, inte importer, analysberäkningar eller fördelningsregler i övrigt.

## Genomförd refaktorering

`src/import/uoImportCompletionForm.ts` innehåller testbara, rena funktioner för:
- kandidatfiltrering och gruppering per UO,
- identifiering av importerade låsta värden,
- prioritering av utkast, importerade värden och sparade kompletteringar,
- tidigare validering (inklusive nollvärde, icke-negativa och positiva totalsummor),
- beräkning av ett helt UO:s kompletteringar och borttagning av berörda manuella UO-andelar ur **nytt** tillstånd.

`src/import/UoImportCompletionView.tsx` ansvarar fortsatt för React-tillstånd, visning, laddning och sparning, men använder ovanstående funktioner. Beteendet för sparande, meddelanden, handlingsknappar och låsta värden är avsett att vara oförändrat.

## Testkontrakt

`src/import/uoImportCompletionForm.test.ts` kontrollerar filtrering/gruppering, blankfält, noll/decimalvärden, prioritet mellan importerade/sparade/osparade värden, en full batch över flera år samt att ogiltigt fält inte ger partiellt tillstånd. Befintligt domäntest `src/import/uoImportCompletions.test.ts` och hela ordinarie Verify PWA ingår i PR-verifiering.

## Risker som **inte** är lösta av detta steg

- **PR #256 är fortfarande ett utkast och ändrar samma vy.** Den här PR:n är avsiktligt liten, men eventuell merge-ordning måste hanteras med explicit semantisk konfliktgranskning; forcera inte en automatisk konfliktlösning.
- KF-002 införde transaktionsskydd för vissa andra `GapState`-skrivare. Den här vyn använder fortfarande `saveGapState(next)` utan `expected`. Att aktivera CAS är en funktionell ändring som kräver separat verifiering, inte en dold del av denna refaktorering.
- Relevanta importerade värden hämtas fortsatt från kanoniska poster; dessa ändras inte av den rena batch-funktionen.

## Klart-kriterier

1. Vitest, ESLint, TypeScript, Vite och Playwright på **PR-head** passerar.
2. Inga oavsiktliga ändringar i domänkontrakt eller användarflöde.
3. Överlappningen med PR #256 är dokumenterad; PR får inte mergas i konflikt utan separat granskning.

Nästa rekommenderade steg efter verifiering och merge är **KF-004**, förbättra varningar och återhämtning vid samtidiga flikar. Kontrollera då att skyddet omfattar faktiskt berörda skrivvägar.
