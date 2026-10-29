# Utvecklingsanalys

React + TypeScript + Vite-baserad PWA för att samla in, komplettera och analysera uppgifter om verksamhetsutveckling. Projektdata lagras lokalt i webbläsarens IndexedDB.

## Funktioner

- Import och granskning av Excelunderlag, inklusive tabeller och olika sektioner i UO-mallar.
- Kanonisk informationsmodell v2 som **enda analysvy**, med filter för mått och perioder samt hierarkisk navigering mellan UO-grupper, UO och LO. Alla importerade källor ingår som standard, med redovisning per avdelning.
- Analys av utveckling och förvaltning, källspårbarhet, årstrender, organisation × år, diagram och CSV-export.
- Informationsluckor, kompletteringar, fördelningsregler och godkännande/återkallelse med omprövning när källunderlaget ändras.
- Administration av UO-gruppmodeller under Inställningar, val av gruppmodell i Analys samt projektbackup och återställning. Den äldre separata gruppvyn finns kvar för kompatibilitet.
- Responsivt gränssnitt och PWA med stöd för användning utan nätverk efter installation/cachelagring.

Den äldre analysvyn har avvecklats. Historiska semantiska data och backupformat finns kvar för kompatibilitet; använd informationsmodell v2 för analyser.

Analysvyn är tillgänglig först när minst en importerad källa har analysobservationer i den kanoniska modellen. Källmetadata eller enbart äldre semantiska observationer räcker inte. Om sista analysunderlaget tas bort spärras analysen igen.

## Kom igång

```sh
npm install
npm run dev
```

Kör den lokala verifieringen:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build:singlefile
node scripts/verify-singlefile.mjs
npm run test:browser
```

Browser- och single-file-verifieringen förutsätter att Playwright Chromium är installerat. CI installerar detta automatiskt.

Årsvis utveckling visas som ett sammanhållet linjediagram med en tabell över timmar/kostnader och förändring mot föregående år. Mått och aktiviteter styr vilka värden som ingår. Den detaljerade matrisen **Organisation per år** finns som en valfri, från början ihopfälld fördjupning. Analysens redovisningsval och filter visas direkt, utan rubrikerna ”Fler analysval” och ”Fler filter”.

## Distribution och release

Workflowfilen `.github/workflows/release.yml` startar när en GitHub Release publiceras. Det kör hela verifieringen, publicerar PWA till GitHub Pages och bifogar en självständig `utvecklingsanalys-standalone.html` som releasefil. Den kan öppnas lokalt, men webbläsaren kan begränsa lagring och nätverksanrop från `file://`. Kontrollera funktionerna i målmiljön innan användning av verkliga data.

För releasekandidat **v0.2.0**:

1. Merga releaseförberedande PR efter grön CI.
2. Skapa taggen `v0.2.0` från den då aktuella `main`-committen och publicera en GitHub Release med releaseanteckningarna i `docs/releases/v0.2.0.md`.
3. Kontrollera att `Publish release (Pages + standalone HTML)` är grön och att HTML-filen bifogats releasen.
4. Provöppna både Pages-versionen och HTML-filen, importera syntetiskt testunderlag och kontrollera analys och projektbackup.

> Säkerhetsråd: exportera och spara projektbackup innan uppdatering av en befintlig installation. Lokala data får inte antas överföras automatiskt mellan GitHub Pages och `file://`, eftersom webbläsaren behandlar dem som olika ursprung.

## Dokumentation

Arkitekturbeslut: `docs/adr/001-v2-analysis-transition.md`. Migrerings- och återgångsplan: `docs/change-051-v2-rollout-and-rollback.md`. Acceptanskriterier för den integrerade analysvyn finns i `docs/dev-114-analysis-acceptance.md`. Ytterligare planering och testunderlag finns i `docs/` och `.system-builder/`.
