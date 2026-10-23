# CHANGE-056 – fördefinierat format för processtimmar

Det andra kodbaserade importformatet är **Processtimmar per år**. Formatmodulen äger identifiering, exakt kolumnmappning och validering i `src/import/formats/processHours.ts`.

Formatet kräver rubrikerna **Process**, **År**, **Timmar** på rad 1 (valfri kolumnordning) samt explicita, numeriska år och timvärden. Detta undviker gissningar om planeringsår och kopplar observationen till processen.

Formatet registreras tillsammans med UO-budgetformatet. Filer av formatet går genom direktimporten utan konfigurering/förhandsgranskning och använder samma återställningsjournal som tidigare tabellimport. Ambiguösa eller aliasbaserade objektmatchningar avvisas med ett begripligt fel i stället för att matchas automatiskt.

Tvåkolumnsformatet **Process, Timmar** (utan år) och personal-/avdelningsunderlag får egna tydligt fastställda regler i senare steg. Den äldre konfigurerbara tabellimporten behålls tills alla aktuella format är ersatta.

Regressionskontroller i `src/import/formats/processHours.test.ts` täcker igenkänning, årskrav och felaktiga värden.
