# Projektfördelningar i fliken Fördelningar

## Syfte
Projektens manuella Utveckling/Förvaltning förvaltas på samma plats som UO:s fördelningar. Analysfliken är läsande och beräknar resultatet från samma sparade beslut.

## Funktion
- Öppna **Fördelningar → Utveckling / Förvaltning – projekt**.
- Välj **Timmar/Kronor** och **Alla år/enskilt år**. Projekt med giltiga källvärden visas i en lista med antal färdiga och återstående fördelningar.
- Öppna ett projekt för redigering per **projektdel × år × mått**.
- En befintlig sparad fördelning används utan migrering, eftersom editorn fortsätter att spara `projectActivitySplits` i GapState.
- En inaktuell fördelning vars källa har ändrats räknas som ofördelad och används inte i analysen.
- UO/LO-korten, UO:s importlås och alternativa fördelningstyper ändras inte.

## Gränser
Projektens procentvärden är manuella och låser inte någon projektsumma till en överordnad procentsats. Saknad procent visas som okänd, aldrig som noll. Importerade totalvärden bevaras och projekt- och UO-budgetar summeras endast i analysens läge Alla.

## Verifiering
Nya tester verifierar projekturval, timmar/kronor, år, källa och att beslut som blivit inaktuella inte visas som klara. Full Verify PWA måste passera innan merge.
