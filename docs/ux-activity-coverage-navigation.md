# UX-granskning: UO, projekt och avdelningar – synlighet vid ofullständig aktivitetsfördelning

## Granskat flöde
- **Import:** UO och projekt sparas som separata planeringsobjekt. Avdelningstimmar sparas som en alternativ fördelning och räknas inte ovanpå budgettotalsummor.
- **Fördelningar:** Projektens procentbeslut är knutna till källpostens identitet och kan bli inaktuella efter ny import. Ofördelad volym exponeras i indikatorerna.
- **Analys:** Alla / UO / Projekt summerar separata budgetbehov, medan Utveckling och Förvaltning bara kan beräknas för poster med fullständiga fördelningar.

## Identifierad UX-brist och åtgärd i denna PR
När Utveckling eller Förvaltning valdes byggde objektlistan tidigare bara på observationer med komplett fördelning. Projekt utan fördelningar **försvann helt ur listan**, trots att projekten fanns i underlagen och totalsumman i Totalt visade dem. Detsamma gällde projektdelar utan färdig fördelning. Detta försvårade både förståelse och navigering.

Objektlistan och fördjupningen byggs nu från **samtliga planerade behov**; valda aktivitetsvärden kopplas på där de finns. Saknad fördelning visas som **Ej fördelat**, och delvis fördelade projekt visar separat ofördelad volym. Den valda aktivitetens totalsumma räknas fortfarande enbart från fullständiga fördelningar.

## Regler
- Ofördelat är **inte** ett verkligt nollvärde.
- Fullständiga fördelningar med 0 % Utveckling får fortfarande redovisas som **0**.
- All-data-totaler är UO + Projekt och påverkas inte av aktivitetsvalet; avdelningsdata räknas aldrig till.
- Valt år och valda tim- respektive kostnadsmått styr både tillgängliga objekt och aktivitetsvärden.
- Befintliga UO-fördelningar, projektbeslut och semantisk import ändras inte.

## Fortsatt förbättring
UO:s äldre LO-detaljvy har separat navigeringsmodell. En senare PR kan ge även den detaljerade LO-listan samma synliga markering för saknad aktivitetsfördelning.
