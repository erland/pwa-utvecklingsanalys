# CHANGE-018 – Godkända kompletteringar i analysen

Den här ändringen skiljer på tre informationslager:
1. **Importerade observationer** (orörda) för ordinarie analyser.
2. **Föreslagna fördelningar**, som omräknas från aktuella källor och vikter och ännu inte är godkända.
3. **Godkända fördelningar** med fryst LO-lista, värden, regeldefinition och indatafingeravtryck.

Under **Kompletteringar** kan en giltig fördelning godkännas, godkännas på nytt eller återkallas. Efter käll- eller regeländring markeras tidigare godkännande som inaktuellt eller ogiltigt. Dessa poster exkluderas ur kompletterad analys tills användaren uttryckligen godkänner aktuell fördelning på nytt. Att ta bort en regel tar också bort dess godkännande.

Under **Analys** väljs `Endast original`, `Godkända kompletteringar` eller `Jämför original och komplettering`. Kompletteringarna redovisas i en separat tabell som filtreras på mått och år. Detta är en *uppdelning av en UO-summa*, inte ytterligare LO-timmar som får summeras med detaljtimmarna. Huvudanalysen och befintliga diagram förblir källbaserade och helt opåverkade. Ogiltiga/inaktuella godkännanden visas som varning men tas inte med.

Godkännanden ingår i befintligt kompletteringsregister och därmed projektbackup/återställning. Äldre arkiv utan godkännanden är fortsatt giltiga.

## Begränsningar

Detta steg gör jämförelsen i en separat analystabell; det inför inte generella blandade måttberäkningar eller överlagrade diagram. Fördelningsmotorn från CHANGE-017 förutsätter fortfarande ett UO. En godkänd fördelning kan bli inaktuell efter ändrade datakällor och återaktiveras inte automatiskt. Manuell komplettering ingår ännu inte i analysernas godkända fördelningsserie.

## Tester

Regressionsfall prövar uttryckligt godkännande, ändrade källvärden, ändrade regler, konflikt med ny originalobservation och mått-/årsfilter, samt att originaldata inte muteras.
