# CHANGE-013 – samlad acceptans och releaseunderlag

## Omfattning
CHANGE-013 omfattar cellvärdesförhandsgranskning, representativ importpreview, gemensam XLSX-ingång, redigerbara UO-gruppmodeller, tre diagramlägen, årsvisa visualiseringar och virtuella summa-mått (h/SEK). Implementation finns i mergade PR #13–#18.

## Automatiserad acceptans
Det nya `e2e/change-013-acceptance.spec.ts` testar en sammanhängande användarresa på syntetiskt genererad XLSX:
1. Import av två månadsobservationer (42 och 18 timmar), godkännande och fortsatt källspårbar analys.
2. Skapa och spara UO-gruppmodell med explicit medlemskap.
3. Summering med Alla timmar till 60 h och användning av vald gruppmodell.
4. Cirkeldiagram, trend och grupperade årsstaplar samt visning av analys i tabell.
5. Årsfilter, Alla kostnader (0 SEK), omladdning och bevarad gruppmodell.

Tidigare automatiska tester kompletterar detta med konfigurationsimport/export, mallmappning, datakvalitet, snapshotskydd, source-cell-deduplicering, offlinefunktion och projektåterställning.

## Begränsningar
- Syntetiska XLSX-fixtures bevisar inte kompatibilitet med varje verklig organisationsmall. Provning med anonymiserade verkliga filer kvarstår som rekommenderad verksamhetsacceptans.
- Endast Chromium ingår i aktuellt Playwright-CI; manuell Safari/iPad- och VoiceOver-granskning är inte utförd.
- Projektbackup är testad i befintlig regression, men en faktisk testad releaseartefakt från detta steg kräver separat publicering/verifiering.
- Automatiska tester garanterar inte WCAG 2.2 AA-konformitet.
- Lokala IndexedDB-data kräver export/backup; `file://`-öppnade fristående HTML-filer kan bete sig annorlunda mellan webbläsare.

## Slutkriterium
Markera CHANGE-013 accepterad först när GitHub Actions på *slutlig PR-revision* har PASS för lint, typkontroll, enhetstester, PWA-build, singlefile-build och Playwright. Publicera inte release automatiskt från denna PR.

## Fortsättning
Efter merge: genomför separat RELEASE-steg med nytt versionsnummer/tagg och publicerad GitHub Release, verifiera GitHub Pages och nedladdningsbar standalone-HTML i avsedd användarmiljö.
