# DEV-009 – kompletteringsguide, scenarier och planeringsversioner

**Datakvalitet:** För valt år upptäcks okända objekt, saknade källreferenser, dubbla källceller, UO utan LO och ofördelade andelar i användarskapade fördelningstyper. Felen och varningarna visas per objekt och år. Kontrollerna är avgränsade: avsaknad av avvikelse innebär inte fullständig eller juridiskt/ekonomiskt verifierad kvalitet.

**Scenario:** Ett scenarioutkast refererar en namngiven ursprunglig planeringsversion. Alternativa numeriska värden registreras per befintligt observation-ID tillsammans med en motivering. Originalobservationerna muteras inte. Godkännande är blockerat vid felnivå i kvalitetskontrollen eller bortfallen refererad observation. Ett godkänt scenario går inte att ändra igen. Scenarier och godkännandestatus sparas separat i IndexedDB.

**Jämförelse:** Användaren kan jämföra basversion med ett scenario och välja två planeringsversioner. Summeringar är tillåtna endast för additiva mått, med deduplicering av ursprunglig källcell per datakälla. Resultaten visar absoluta värden, skillnad och antal källvärden. Versioner kan avse olika omfattning och datakällor: en jämförelse är därför **inte** automatiskt en jämförelse av likvärdig täckning.

**Avgränsning:** Godkännande låser scenarioinnehållet i appens ordinarie gränssnitt men är inte kryptografisk signering, revisionssäker attestation eller en atomär commit över samtliga IndexedDB-lager. Versionshistorik, diff/konflikthantering och transaktionssamordning hanteras i DEV-010. Denna implementation använder syntetiska tester och publicerar inga verksamhetsdata.
