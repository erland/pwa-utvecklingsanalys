# CHANGE-058 – Process och Timmar utan årskolumn

Detta steg inför ett separat kodbaserat importformat för två kolumner: `Process` och `Timmar`.

För automatisk import krävs **ett explicit år i kalkylbladets namn**, exempelvis `Processer 2027` eller `2028`. Ett blad med namnet `Processer` avvisas fortsatt från direktimport. Inga årtal hämtas från dagens datum, filens ändringsdatum eller en dold standardinställning.

All formatlogik finns i `src/import/formats/processHoursTwoColumn.ts`. Validering stoppar ogiltiga cellvärden och Excel-formler. Registrering sker i formatregistret. Lagring och identitetskontroller sker genom den redan införda direktimporten.

Nästa utvecklingssteg: definiera en motsvarande uttrycklig årskälla för `Avdelning, Antal anställda` utan årskolumn eller, om årsangivelse inte är meningsfull för underlaget, utreda stöd för odaterade observationer i informationsmodellen. Avveckla sedan den gamla konfigurerbara importvyn efter regressionsverifiering.
