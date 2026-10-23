# CHANGE-027 – första v2-analysvyn

En separat vy för analys enligt den kanoniska modellen v2 visas överst i Analys. Användaren väljer **enhet**, ett eller flera **mått**, **aktivitet**, organisatoriskt perspektiv (UO/LO eller avdelningar) och **år**. Ursprungliga observationer och godkända, fortfarande aktuella beräknade aktivitetsdelar ingår. Gamla importer läses som tidigare i den äldre analysen nedanför för att undvika ett ofullständigt skifte.

Källans UO-matris är en alternativ beskrivning av LO:s totaler och får inte adderas till LO-detaljerna. Avdelningsperspektivet summeras separat. Vid aktivitetsspecifika analyser visas antal objekt med okänd aktivitetstäckning; saknade värden behandlas inte som noll. Inaktuella godkännanden efter förändrat källmaterial inkluderas inte och synliggörs. Kombinationen timmar och kostnader avvisas.

**Begränsning:** Detta är ett första, separat analyssnitt. Den äldre vyn finns kvar för funktioner som gruppmodeller och planeringsanalyser. V2-filtersamlingen behöver senare kompletteras med UO/LO-flerurval, källval och trenddiagram. V2-kontraktet behöver fortsatt stöd för personal- och processmått. Summering mellan flera oberoende källor som beskriver samma verksamhet behöver avstämmas användardrivet.

Tester verifierar att UO + LO inte dubbelräknas, godkänd fördelning 600/400 går att filtrera, inaktuella beslut inte används och avdelning redovisas separat.
