# CHANGE-063 – aktivitetsmatris i automatisk UO-import

Direktimport av `UO Tot 2027-30` använder redan den fasta formatmodulens läsning av aktivitetsmatrisen (rader 4–7). Tidigare sparades enbart detaljvärden och aktivitetsmatrisen exkluderades även när den var korrekt ifylld.

Nu inkluderas matrisen **endast** när läsaren hittar faktiska aktivitetsvärden och samtliga matrisavvikelser är hanterade. Vid ogiltiga värden avvisas hela filen före lagring, i stället för att användaren får en till synes lyckad men ofullständig import.

Både nyimport och ersättning skickar samma `includeMatrix`-flagga till befintlig transaktionsjournal. Matrisposter lagras med `granularity:'activity-part'` och `workPart:'uo-activity-matrix'` i kanonisk modell och är alltså inte ytterligare totalbelopp utöver LO/UO-observationerna.

Tester täcker korrekt utvecklings-/förvaltningsmatris, källa-ersättning och ogiltiga aktivitetsrubriker.

Detta steg tar inte bort den gamla importpanelen. Nästa steg kan migrera end-to-end-fallen för aktivitetsfördelning, säkerställa hanteringen av gamla utkast och sedan avveckla mappningsvyn.
