# Projekt: manuell Utveckling/Förvaltning per projektdel

## Beslutad funktion
Projekt och UO är separata, additiva planeringsobjekt. Projekt kan sakna aktivitetsmatris i Excel. Fördelning får då anges manuellt per projektdel, år och mått. Tim- och kostnadsmått är separata: en kostnadsandel skall inte automatiskt antas vara samma för alla kostnadsslag. Odelade värden är **okända**, inte 0 % utveckling.

## Implementering
- Under Projekt/Alla i analysen kan man öppna ett projekt och ange **Utveckling (%)** för en projektdel, år och mått.
- En fördelning sparas i GapState med arbetsidentitet, procent och fingeravtryck av ursprungsposten. Avvikande källa efter omimport gör tidigare val inaktuellt; ingen ny procent gissas.
- Fördelningen visas som två härledda aktivitetsobservationer med samma workload-id och sammanlagd volym som originalet. Originaltotalen ändras inte.
- I Projekt/Alla kan **Totalt / Utveckling / Förvaltning** väljas. En ofullständig fördelning ger informationsmeddelande; beloppen som inte är fördelade visas inte som noll.
- Även när ett projekt saknar aktivitetssplit ingår dess fulla volym i Totalt och i UO + Projekt.
- Sparandet är jämför-och-byt med kontroll av aktuell arbetsidentitet; ändringar från annan flik skrivs inte över tyst.

## Avgränsning och fortsättning
- Detta första steg erbjuder manuell justering i projektets analysdetalj. Ett följande UX-steg kan samla alla projektfördelningar på den ordinarie fliken Fördelningar.
- Projektets utvecklings/förvaltningsuppdelning importeras inte automatiskt från en ospecificerad matris.
- Om ett helt projekt ska ha en låst andel och projektdelar ska balansera mot den behöver motsvarande UO-regler modelleras separat senare.
- Testerna täcker aktivitet, års-/måttisolering, ofullständig täckning, ersatt källa, ogiltiga procenttal och bibehållen total.

Ingen automatisk merge eller release; full Verify PWA krävs.
