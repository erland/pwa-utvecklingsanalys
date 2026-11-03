# IP-007 – Prestandabaslinje för analys och fördelningar

## Syfte
Skapa en reproducerbar baslinje innan någon prestandaoptimering görs. Allt testdata är syntetiskt; inga användardata, importer eller IndexedDB lagras eller skickas.

## Körning
```bash
npm install --no-audit --no-fund
npx vitest run src/performance/analysisBaseline.test.ts --reporter=verbose
```
Testet körs även av projektets ordinarie `npm test` i GitHub Actions.

## Belastning
Tre fixerade storlekar med **4, 12 och 24 UO**, fyra LO per UO, budgetåren 2027–2030 och både IT- och verksamhetstimmar. Varje UO/år/mått har två importerade UO-matrisposter och fyra LO-totaler. Automatisk aktivitetsfördelning sker i `prepareAnalysisDataset`.

För varje storlek mäts följande *separat*, med en uppvärmningskörning och tre tidtagna körningar:

1. `prepareAnalysisDataset`
2. `analyzeCanonical` över alla år
3. `canonicalTrend` över alla år
4. `canonicalGroupYears`
5. `allocationTypeOverview` för en valfri fördelning under 2027

Utskriftsformatet är en JSON-rad per scenario och steg, med prefixet `IP007_BASELINE`, och fälten `fixture`, `uoCount`, `years`, `loPerUo`, `sourceRecords`, `preparedRecords`, `stage`, `medianMs`, `minMs` och `maxMs`.

## Korrekthetskontroller
- Inga diagnostikfel eller inaktuella godkännanden för syntetisk källdata.
- Importerade källposter finns kvar och är oförändrade.
- Förväntad totalsumma över år, mått och UO stämmer i analysfrågan, trenden och årsmatrisen.
- Valfri fördelning till 70/30 balanserar till 100 procent.

## Tolkning
- Mätningarna är **observationer**, inte prestandakrav och inte ett bevis på en regressionsförändring.
- CI-runnerns CPU-belastning, JIT och annan parallell aktivitet kan påverka tiderna.
- Jämför i första hand medianer vid samma indata, Node-version och miljö; upprepa vid större avvikelser.
- Separata steg kan internt anropa samma analysfunktion. Summera därför inte tiderna som ett mått på verklig sidladdning.
- Den här baslinjen mäter beräkningar i Node/Vitest, **inte** rendering i React, import av Excel, IndexedDB-I/O eller interaktiv latens på iPhone/iPad.
- Koden optimeras inte i IP-007. Använd resultaten för att välja om ett avgränsat IP-008 behövs och identifiera en verifierad flaskhals.

## Acceptans
1. CI är grön, inklusive testets samtliga storlekar.
2. Fem tidsrader per storlek (totalt 15) finns i CI-loggen.
3. Beräkningskontrollerna passerar.
4. En eventuell framtida optimering jämförs mot samma fixture och körningsmiljö.
