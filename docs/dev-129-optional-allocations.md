# DEV-129 – Valfria, konfigurerbara fördelningstyper

Status: **föreslagen målbild för efterföljande implementation**. Inga kodändringar i DEV-129.

## Syfte och avgränsning
Användaren ska kunna skapa egna analysdimensioner som delar upp befintliga tim- eller kostnadsvärden utan att förändra grundunderlaget eller den obligatoriska aktivitetsklassificeringen utveckling/förvaltning.

Exempel: **Effekt** tillämpad på IT- och verksamhetstimmar, utveckling och förvaltning, med kategorierna **Förutsättningsskapande** och **Direkt effekt**.

## Funktionella krav

- **FR-129-01 – Definition:** skapa, namnge, ändra och arkivera en fördelningstyp. Den har stabil identitet, minst två unikt identifierade kategorier och ett urval av kanoniska mått (`it_hours`, `business_hours`, `consultant_cost`, `other_cost`). Måtten måste ha **samma enhet**; timmar och SEK får inte summeras tillsammans.
- **FR-129-02 – Aktivitetsurval:** för timmar kan utveckling, förvaltning eller båda väljas. När båda väljs används grundtotalen (även vid ofullständig aktivitetstäckning); vid enbart utveckling/förvaltning får endast befintligt godkänt aktivitetsunderlag ingå. Ofullständig täckning ska signaleras, inte tyst räknas som noll. För kostnader ska aktivitet bara kunna väljas när kanoniskt godkänt aktivitetsunderlag finns; annars används `all`.
- **FR-129-03 – Regel:** lagra fördelningsprocent per fördelningstyp, kalenderår och **entydigt organisationsscope** (UO, LO inom visst UO eller UO Övergripande). Kategorier summerar till högst 100 %, och ofördelad rest är explicit; felaktiga värden avvisas.
- **FR-129-04 – Hierarki:** ange UO-fördelning som förslag. Varje LO ärver den, tills en egen regel anges. LO-regeln ersätter fördelningen för just den LO:n, inte hela UO. UO Övergripande får egen regel eller ärver UO-förslaget. Samma LO-namn i två UO får aldrig dela identitet.
- **FR-129-05 – Frivillighet:** enbart skapad definition innebär **ingen analysvisning**. Dimensionen blir tillgänglig först om det finns minst en tillämpbar, sparad regel med faktisk kategorifördelning (>0 %) i aktuellt urval. Ej klassificerad mängd redovisas som **Ofördelat** när dimensionen visas. Ingen fördelning alls ska inte producera ett diagram med 100 % Ofördelat.
- **FR-129-06 – UI:** hantera definitioner och omfattning under Inställningar. Separat fördelningsarbetsyta: välj dimension och år, visa UO som rader och expandera UO för LO samt UO Övergripande. Indikera **Ingen regel**, **Ärver UO**, **Egen regel** och **Delvis fördelad**. Tillåt att ta bort LO-överstyrning och återgå till arv.
- **FR-129-07 – Analys:** visa en valfri analyssektion först när FR-129-05 uppfylls. Använd samma år, organisationsurval, mått och aktivitet som huvudanalysen, med cirkeldiagram där lämpligt och tabell som alternativ. Redovisa kategori, ofördelat och täckningsgrad. Vid flerårsanalys summeras beräknade belopp årsvis; olika årsregler blandas aldrig till en enda procentsats före viktning.
- **FR-129-08 – Integritet:** inga extra kanoniska tim-/kostnadsrecords skapas för fördelningen. Fördelningsbelopp är härledda, inte separata volymer. Spara regel och definition i projektets konfigurations-/backupflöde. Förändringar i källunderlaget ska räknas om vid analys.
- **FR-129-09 – Livscykel:** inga regler får bli tvetydiga efter ändringar av definitioner. Ta bort/arkivera dimension eller kategori med sparade regler kräver uttrycklig hantering; förhindra tyst förlust av fördelning.
- **FR-129-10 – Oberoende:** flera dimensioner får klassificera **samma** underlag parallellt, men får aldrig adderas till varandra eller till grundtotalen som om de vore nya timmar/kronor.

## Beräkningsprincip

1. Hämta kanoniskt, godkänt underlag för vald enhet, mått, aktivitet, år och organisationsdel, med samma deduplicering, källprioritet och täckningslogik som huvudanalysen.
2. Dela upp UO i *disjunkta* basposter: LO-poster och UO Övergripande. Använd inte en UO-total plus dess LO som separata värden.
3. Bestäm effektiv regel för varje baspost: egen LO-/övergripanderegel, annars UO-regeln, annars ingen regel.
4. För varje baspost med värde `v`, kategori `c` och procent `p`: `amount(c) += v * p / 100`. Lägg återstående del i `unallocated`. Aggregera **belopp**, inte snittprocent.
5. `sum(categoryAmounts) + unallocated === selectedCanonicalTotal` (inom avrundningstolerans), endast för de disjunkta basposter vars underlag kan beräknas. Otillgänglig/ej godkänd aktivitet markeras separat som otäckt underlag och får inte förvandlas till noll.
6. Rapportera var en regel kommer ifrån (UO-förslag, LO-överstyrning, UO Övergripande eller saknas).

## Tekniskt nuläge och konsekvenser

- `src/allocations/model.ts` har redan definitioner, kategorier, procent, UO-förslag och LO-överstyrning, men saknar omfattning per mått/aktivitet och använder endast `entityId` i regeln. Det behöver en otvetydig organisatorisk nyckel.
- Befintlig `basis` (`manual`, `it_hours`, `business_hours`, `fte`, `headcount`) är en **viktningsmetod**, inte vilka kanoniska värden som ska omfattas; ersätt inte omfattningsfältet med `basis`. För nya regler rekommenderas härledda belopp från kanoniskt underlag; äldre viktningsregler kräver en tydlig migreringsstrategi.
- `src/analytics/canonicalQuery.ts` har relevant source-/activity-/UO-logik men är grupperad för presentation. Bygg en intern gemensam projektion av disjunkta basposter i stället för att dividera övergripande presentationssummor; säkerställ konsekvent deduplicering.
- `src/config/packages.ts` är versionssatt; ändra schema genom en kontrollerad migration och verifiera både definitions-only och full backup/import.
- Fördelningsvyn ligger i dagsläget huvudsakligen i äldre/kompatibilitetsnavigation. Nytt UI måste vara åtkomligt i normala arbetsflödet och inte exponera den gamla generella konfigurationsmenyn av misstag.

## Föreslaget datakontrakt (princip, inte färdig TypeScript-definition)

`AllocationDimension { id, name, categories:[{id,name}], appliesTo:{metrics:Metric[],activities:('development'|'maintenance')[]|'all'}, status }`

`AllocationRule { dimensionId, year, scope:{kind:'uo'|'lo'|'uo-overhead',uoId,loId?}, percentages:{categoryId:number}, provenance }`

Äldre `AllocationDimension.basis` och `AllocationRule.entityId/origin` ska kunna importeras och konverteras eller behållas i explicit legacy-läge. **Migrera inte automatiskt** gamla fördelningar till ett godtyckligt nytt måtturval.

## Acceptanskriterier

- **AC-129-01:** två UO med var sitt LO med samma namn använder aldrig varandras överstyrning.
- **AC-129-02:** UO 60/40, LO A 90/10, LO B utan regel → LO A 90/10, LO B 60/40; övergripande post hanteras separat.
- **AC-129-03:** dimension utan sparad faktisk fördelning visas inte i analysen; efter en sparad regel visas den med Ofördelat och täckningsinformation.
- **AC-129-04:** endast IT-timmar + utveckling ingår när det urvalet definierats; förvaltnings- eller verksamhetstimmar kan inte läcka in.
- **AC-129-05:** 2027-regler tillämpas inte på 2028; vid Alla år summeras beräknade kategoribelopp per år.
- **AC-129-06:** flera fördelningstyper kan klassificera samma grundvärden utan att huvudtotalen ändras eller att typerna adderas.
- **AC-129-07:** 70 %+20 % → Ofördelat 10 %; 70 %+40 % avvisas.
- **AC-129-08:** ofullständigt godkännande/aktivitet ger tydlig täckningsstatus; saknade värden blir inte noll.
- **AC-129-09:** projektbackup/import, schema och äldre definitioner fungerar för både gamla och nya projekt.
- **AC-129-10:** expanderbar UO/LO-vy fungerar med tangentbord och smal skärm, inklusive att rensa en överstyrning.

## Föreslagen utvecklingsordning

- **DEV-130:** nytt versionssatt datakontrakt, validering, migrering och round-trip i konfiguration/backup. Enhetstester.
- **DEV-131:** definiera typer och gör frivilliga UO/LO-regler i expanderbar arbetsyta; spara/ta bort/arv. Browser-acceptans.
- **DEV-132:** gemensam kanonisk baspost-projektion och separat härledd fördelningsanalys; balansering och täckning. Enhetstester mot dubbelräkning.
- **DEV-133:** visa valfria fördelningar i Analys; multi-år, grupper/UO/LO, cirkel/tabell och integrationstest.
- **DEV-134:** samlad regression för backup, tidigare fördelningar, offline och mobil; releasebedömning.

## Beslut och avgränsningar

Denna specifikation rekommenderar härledning från befintliga tim-/kostnadsvärden, **inte nya hårdkodade Activity-värden i kanonisk schema v2**. Definitiva gränssnittsdetaljer och migration av äldre, semantiska viktningsregler verifieras i DEV-130. Inga ändringar av den obligatoriska utveckling/förvaltning-fördelningen ingår.
