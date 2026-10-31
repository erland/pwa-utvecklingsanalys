# Funktionell specifikation v0.2

## Syfte och målbild
Användaren ska snabbt kunna samla in, förstå och analysera resurs- och verksamhetsuppgifter från heterogena Excelarbetsböcker och manuella kompletteringar. Lösningen ska vara begriplig utan BI-kompetens och klara årsvisa mallförändringar.

## Roller
Analytiker/importör och lokal projektägare. Ingen inloggning i första versionen; projektfiler delas med medveten export/import.

## Krav
- FR-001 Importera många XLSX-filer via dra/släpp, filväljare eller mappladdning där stöds.
- FR-002 Identifiera källtyp och profil med synlig träffsäkerhet; användaren kan välja/korrigera.
- FR-003 Importguide: förhandsgranska rader/celler, mappa rubriker/perioder/enheter, hantera konflikter, identifiera UO, se valideringsresultat och godkänna. Spara utkast och återuppta.
- FR-004 Definiera återanvändbara profiler för layout, tabeller, rubrikalias och cellmönster; versionshantera och exportera/importera profiler.
- FR-005 Flera källtyper: UO-budget, arbetstid per arbetsprocess, personal/FTE per avdelning; även flexibel tabellimport med användarstyrd mappning.
- FR-006 Gemensamma stabila ID för UO, LO, arbetsprocess, avdelning; föreslå men aldrig tyst anta tvetydiga matchningar.
- FR-007 Relationsregister för tillhör, utför, stödjer, förutsättningsskapande beroende; stöd för omfattning, källa, period och osäkerhet.
- FR-008 Användardefinierade mått och attribut med datatyp, enhet, aggregeringsregel och tidsgiltighet.
- FR-009 Fördelningstyper som har namngiven bas (mått + filter + period + enhet), kategorier och giltiga totalsummeringsregler.
- FR-010 Ange fördelningar per LO/UO med uttryckligt val mellan ärvt, föreslaget, godkänt eller egen överstyrning; uppgifter på UO-nivå ger förslag till LO.
- FR-011 Ange fördelningsbas som exempelvis IT-utvecklingstid. Saknad uppdelning kan tillföras via bedömning, med separat ursprungsdata.
- FR-012 Skilj faktauppgift, bedömning, antagande, prognos och beräknat resultat; visa källa och datum.
- FR-013 Analys med filtrering, gruppering, pivottabell, sortering, tabell/diagram, sparade vyer och valfria UO-urval.
- FR-014 Egna UO-grupper i flera oberoende grupperingsmodeller; varna för dubbelräkning vid överlapp.
- FR-015 Behovsår och planeringsversion är separata dimensioner. Användaren styr vilka versioner som jämförs eller sammanställs.
- FR-016 Kontrollera dubblettimporter, periodöverlapp, konflikter och att total-/detaljnivå inte dubbelräknas.
- FR-017 Jämför utvecklingsresurser med processtimmar och personalunderlag; differentiera berörd processvolym från faktisk nyttorealisering.
- FR-018 Visa ofördelade värden, datatäckning, osäkerhet och vilka analyser som påverkas av datagap.
- FR-019 Exportera analysresultat till CSV/XLSX och hela projektet (inkl. metadata, profiler, regler och eventuellt originalfiler) som flyttbart arkiv.
- FR-020 Lokalt sparande med säkerhetskopiering, import av projektfil samt versions-/migrationsstöd.
- FR-021 Exempelprojekt och guidade snabbval som 'IT-timmar', 'utveckling', 'UO-grupper' och 'andel processtid'.
- FR-022 Tillgängligt tangentbordsnavigerbart gränssnitt som fungerar på desktop/surfplatta och läsbart på mobil.
- FR-023 Flexibla dimensioner och fördelningar kan läggas till i appen utan kod; typade konfigurationsscheman och tydliga begränsningar.
- FR-024 Exportera/importera **fristående konfigurationspaket**, oberoende av importerad faktadata och projektarkiv. Paket kan innehålla importprofiler, mått/dimensioner, relationstyper, fördelningstyper, valfria fördelningsregler och procentsatser, grupperingsmodeller samt sparade analysdefinitioner. Användaren väljer innehåll och får en begriplig sammanfattning före export.
- FR-025 Vid ny planeringsomgång kan konfiguration återanvändas som **struktur utan värden**, som **struktur med schabloner/förslag** eller som **fullständig kopia inklusive befintliga regler/värden**. Tidigare års procentsatser och periodbundna värden får aldrig automatiskt betraktas som godkända för ett nytt år; föreslagna värden märks uttryckligen och måste godkännas.
- FR-026 Import av konfigurationspaket ska göra kompatibilitets- och beroendekontroll med förhandsgranskning (nytt, identiskt, förändrat, inkompatibelt eller saknat beroende). Användaren väljer per konflikt att behålla befintligt, importera som ny version/kopia, ersätta genom en säker migrering eller hoppa över. Förhandsgranskning visar berörda analyser/regler. Inget ändras innan användaren godkänt transaktionen.
- FR-027 Konfigurationsobjekt har stabila ID, typ, schema-/objektversion, ursprung, ändringsdatum och beroenden. Import/export ska vara portabelt och kunna valideras offline. Export ska stödja JSON för ett konfigurationspaket och ZIP för paket med flera profiler/övriga resursfiler. Migrationer och bakåtkompatibilitet gäller projektfil och konfigurationsformat separat.
- FR-028 Hantera historik och återställning av konfiguration: redigering av en tillämpad regel skapar en spårbar revision, och tidigare revisioner kan granskas eller återställas. Vid återställning får importerade originalfakta inte ändras; analysresultat räknas om och eventuella brutna beroenden rapporteras.

## Konfigurationspaket: återanvändning och skyddsregler
- Separera **definitionspaket** (t.ex. fördelningstypens namn, bas och kategorier) från **instansvärden** (t.ex. procentsatser på UO/LO, år och scenario). Användaren väljer uttryckligen om instansvärden ska tas med.
- Beroenden mellan konfigurationsobjekt exporteras genom stabila ID och versioner. Vid import saknade basmått/objekttyper måste mappas eller blockeras; importerade UO-/LO-specifika regler får inte tilldelas andra objekt med enbart namnlikhet.
- Import är atomär: misslyckad kontroll lämnar den aktiva konfigurationen oförändrad. Visa skillnader och erbjud en säkerhetskopia före ersättning.
- Källbundna identiteter, personuppgifter och potentiellt känsliga värden ska inte följa med när användaren väljer konfiguration utan verksamhetsdata. Exportens innehåll redovisas tydligt.
- Konfigurationspaket innehåller ett manifest med `formatVersion`, `packageId`, `createdAt`, innehållsförteckning, objektversioner och checksummor. Läs inte in exekverbar kod, makron eller godtyckliga formler från importpaket.

## Beräknings- och kvalitetsregler
- Timmar och kronor summeras bara för kompatibla enheter, perioder och icke-överlappande faktarader.
- FTE, headcount-snapshots och procenttal kräver måttspecifika aggregeringsregler; summera aldrig procent rakt av.
- En process berörd av två UO ska inte räknas dubbelt i den gemensamma berörda processtiden.
- Aktivering är en delmängd av relevanta totaler, inte automatiskt ett extra adderbart värde.
- Fördelningar inom en partition ska summera till 100 % eller ha explicit ofördelad rest. Oberoende dimensioner får överlappa.
- Fördelningsregelns bas måste vara väldefinierad. Förhindra cirkulära härledningar och felaktiga korsprodukter av marginalandelar.
- Saknad data är inte noll; källformler kan sakna eller ha gamla cachade resultat. Räkna om relevanta totalsummor från källdata.
- Vid aggregering av LO-fördelning till UO används viktning efter aktuell fördelningsbas, inte aritmetiskt medel.
- Skillnad mellan UO-schablon och LO-viktat utfall är en granskningssignal, inte en automatisk justering.

## Icke-funktionellt
- NFR-001 Offline-first: ingen uppladdning till server vid normal användning.
- NFR-002 Källvärden och tolkningar är spårbara ner till fil, blad och cell/rad.
- NFR-003 Stora filer behandlas stegvis/worker utan låsta vyer; rimliga gränser och varningar.
- NFR-004 Förebygg dataförlust med lokal autosparning och synlig backup/export.
- NFR-005 Deterministisk och testbar beräkningsmotor; importerade data får inte ändras genom analyser.
- NFR-006 Tillgänglighet WCAG 2.2 AA som mål och responsivt gränssnitt.
- NFR-007 Kryptering av projektfil kan utredas som tillval; lokal lagring är inte kryptering.

## Acceptanskriterier
- AC-001 Import av Test.xlsx känner igen aktuell budgetstruktur, visar tomt/platshållar-UO och kräver identifiering, utan att presentera nollor som godkända faktiska behov.
- AC-002 En modifierad mall med förflyttad rubrik ger mappningsförslag och kan räddas via guidens korrigering.
- AC-003 Minst två UO och en processdatakälla kan importeras; koppling skapas och unik processtid beräknas utan dubbelräkning.
- AC-004 En egenskapad fördelningstyp på basen IT-utvecklingstid används av flera LO; UO-profil kan föreslås och överstyras.
- AC-005 Analyser med IT-timmar och utvecklingstid skiljer aggregerat värde från härlett bedömningsvärde.
- AC-006 Projekt kan exporteras och återimporteras med identiska mått, relationer, fördelningar och analysvyer.
- AC-007 Förhandsgranskning och felrapport visar källa, cellreferens och datakvalitet.
- AC-008 Ett paket med två fördelningstyper, importprofil, mått och grupperingsmodell kan exporteras och importeras i ett nytt tomt projekt utan faktadata och behåller samma identiteter/definitioner.
- AC-009 Återanvändning för nytt planeringsår med valet 'struktur och förslag' flyttar inte över gamla godkännanden eller gör procentsatserna giltiga för det nya året utan bekräftelse.
- AC-010 Vid ID-konflikt och saknat basmått visar förhandsgranskningen skillnader/beroenden; avbruten eller misslyckad import lämnar mottagande projekt oförändrat.
- AC-011 Ändrade regler kan versionshanteras och återställas; importerad faktadata och dess källreferenser förblir intakta och härledda analyser räknas om.

## Utanför första leverans
Samarbetsredigering i realtid, serverlagring, godtyckligt användarskript/formelspråk, automatisk effektattribuering, avancerad kausal effekthemtagning.

## Målbild: gemensam hantering av fördelningar (CHANGE-175)
Den beslutade målbilden och acceptanskriterierna finns i [change-175-unified-allocations.md](change-175-unified-allocations.md). De kompletterar FR-009–FR-012 och gäller specifikt de inbyggda fördelningarna Utveckling/Förvaltning och IT-timmar/Verksamhetstimmar utan att ändra regler för användardefinierade dimensioner. Importerade UO-aktivitetsvärden ska vara låsta och styra balanseringen av justerbara LO; importerade LO-aktivitetsvärden ska vara låsta och inte rubbas vid omfördelning.
