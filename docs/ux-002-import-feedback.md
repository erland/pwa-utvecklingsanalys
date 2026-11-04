# UX-002 – Begripligare importresultat och vägledning

**Bas:** `main` `961aad868898b21d5b7ae3b1ea70e0215a886ac6` efter mergad UX-001/PR #278.

## Problem
`DirectImport` visade en teknisk textrad per fil där importerade filer, importerade med varningar och avvisade filer inte tydligt skildes åt. Filens nästa möjliga åtgärd var inte uttalad, och gränsen mellan färdig filimport och fullständiga UO-kompletteringar/fördelningar var oklar. Detta är en direkt verifierbar UX-brist i tidigare JSX; faktisk användarfriktion är en stark inferens, inte observerad användartestdata.

## Avgränsad UX-förändring
- En kort sammanfattning per importomgång visar antal importerade, ej importerade och importerade med varningar.
- Varje fil får egen status, antal detaljvärden/format eller ursprunglig feltext, samt en kort **Nästa åtgärd**.
- Import med varningar är **inte** likställd med avvisad fil. Felaktiga filer får hjälp utifrån kända felmeddelanden, t.ex. okänt format, 15 MB-gräns, saknade numeriska värden och objektmatchning.
- En uttrycklig förklaring avgränsar *filimport klar* från *kompletteringar och fördelningar färdiga*. Redan importerade filer behöver inte väljas om när andra filer avvisats.
- Nästa importomgång ersätter den förra resultatsammanfattningen för att motverka gammal status. Oväntade fel får ett eget felmeddelande i stället för att lämna obehandlad promise rejection.
- Importalgoritmer, filformat, beständig lagring, UO-komplettering och analysberäkningar är oförändrade. Befintliga `role=status` och texten `importerad` per fil behålls för tidigare tillgänglighets- och regressionstester.

## Testevidens
- `src/import/importFeedback.test.ts`: klassificering och rekommenderad åtgärd för lyckad import, varning och vanliga avvisningsfel.
- `e2e/ux-002-import-feedback.spec.ts`: en giltig och en okänd XLSX i samma omgång, status, filnamn, felorsak, råd och fortsatt analysväg.
- Regression: `e2e/import.spec.ts`, `e2e/change-079-guided-import-completion.spec.ts`, `e2e/dev-155-import-flow.spec.ts`.
- Full Verify PWA (lint, typecheck, enhetstester, båda byggen, singlefile, Playwright) krävs på exakt PR-head.

## Begränsning och nästa aktivitet
Detta steg förbättrar **redovisning efter import**, inte kvaliteten i parsning eller kompletta arbetsflödessteg i översiktsvyn. UX-003 rekommenderas för sammanhållen säker backup/återställning i en separat PR. Inga manuella RG-acceptanstester på iPad/VoiceOver har genomförts.

**Releasebeslut är fortsatt NO-GO. Ingen release, tagg eller automatisk merge.**
