# DEV-006 – ytterligare Excelprofiler

Den befintliga UO-budgetimporten behålls. En separat importpanel stöder enskilda tabellbaserade XLSX-underlag:
- **Processarbete**: arbetsprocess/objekt, år och timmar, normalt `business_hours`.
- **Personal/FTE**: avdelning, år och `headcount` eller `fte`. Båda är snapshotmått, alltså inte additiva över år.
- **Generisk tabell**: välj själv blad, rad med rubriker, objektkolumn, årskolumn, värdekolumn, objekttyp och mått.

Förslagen är heuristiska och är **inte** en garanti för rätt tolkning. Användaren ska granska föreslagna fält innan importen godkänns. Inga personuppgifter behövs i tabellerna; mappning sker på avdelnings-/processnivå.

Ogiltiga år och värden ger blockerande fel; formler hoppas över med varning; negativa headcount/FTE-värden blockeras. Varje värde bevarar fil, blad och cell.

Vid aliasmatchning av tidigare objekt krävs uttrycklig bekräftelse. Vid flera kandidater måste användaren välja en. Nya namn skapar separata objekt; de slås inte ihop genom gissning. Relationer till UO och processer kräver fortsatt explicit modellering, planerat i DEV-007.

Importen lagras lokalt i den semantiska datamodellen och kan väljas som källa i analysvyn. Personal/FTE summeras inte av DEV-005:s generiska summafunktion; separat snapshotfråga behövs i senare steg.

Begränsningar: tabellimporten hanterar för närvarande ett blad per arbetsflöde; flervalsuppladdning av UO-budget finns kvar separat. Det här är inte en helt allmän import av valfria kors- och matristabeller.
