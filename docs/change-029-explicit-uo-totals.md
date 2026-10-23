# CHANGE-029 – jämför explicit UO-total

UO totalt ska motsvara summan av UO Övergripande och LO för samma mått och period. UO-mallens sammanfattningsdel, mellan rubrikraden och detaljsektionens start, genomsöks efter erkända mått. Siffror och cachade resultat från Excel-formler bevaras som separata `declaredTotals` med källcell och formelflagga; de läggs aldrig till detaljfakta.

Granskningsvyn jämför uttryckliga totaler mot additiva detaljvärden. Enbart en entydig, årsbaserad explicit total utan månadsdata klassas som stämmande eller avvikande. Vid flera möjliga totaler eller otillräckligt matchande perioder visas osäkerhet utan automatisk tolkning. Cachade formelresultat kan vara inaktuella och originalarbetsboken ändras inte.

**Avgränsning:** Extraktionen är profilbunden till sammanfattningsområdet ovanför detaljstart. Stöd för fritt konfigurerbara totalceller och beslutsflöde för avvikelser är senare ändringar.