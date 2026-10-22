# DEV-011 – Kort manuell VoiceOver-acceptans

Status: **EJ UTFÖRD**. Detta dokument är en testinstruktion, inte ett intyg.

## Miljö och dokumentation
Testa den driftsatta PWA-versionen från samma commit som PR #11 i Safari på Mac eller iPad. Använd gärna ett testprojekt med syntetiska data, inte verksamhetsuppgifter. Anteckna enhet, operativsystem, webbläsare, datum och byggversion. Rapportera varje avvikelse med vy, kontroll, förväntat/observerat beteende och gärna en skärmbild.

## Mac – 5 korta scenarier
Slå på VoiceOver med **Kommando + F5** (på vissa Mac-datorer även Fn). I Safari:

1. **Start och navigation:** Kontrollera att ”Hoppa till innehållet” går att nå med tangentbordet, att ”Huvudmeny” annonseras och att aktiv vy går att identifiera. Öppna **Import** och **Analys**.
2. **Import:** Hitta ”Välj tabellfil”. Kontrollera att filkontrollen har begripligt namn och att felmeddelanden kan uppfattas utan att titta på skärmen. Avbryt gärna innan uppladdning.
3. **Analys:** Navigera bland rubriker, eventuella filter och resultat. Kontrollera att tabellrubriker och sammanhörande värden är begripliga.
4. **Planering:** Gå till **Planering**, hitta ”Planeringsår”, ändra värdet med tangentbord och kontrollera om resultat/status annonseras.
5. **Backup:** Gå till **Inställningar**, hitta ”Ladda ner komprimerad backup (GZIP)” och ”Välj projektbackup”. Kontrollera namn, statusmeddelanden och att bekräftelse krävs före återställning. Importera inte verklig backup i ett projekt som måste behållas.

## Visuell kontroll
I Safari eller Chrome på Mac: sätt sidzoom till 200 % respektive 400 %, kontrollera Import, Analys, Planering och Inställningar. Undersök att text, knappar, tabeller och felmeddelanden förblir läsbara och nåbara utan horisontell scrollning av hela sidan. Innehållstabeller kan ha egen horisontell scroll.

## Svara med denna korta mall
- Miljö: [Mac/iPad, OS, webbläsare]
- VoiceOver: PASS / AVVIKELSER [ange vy och vad som inte fungerade]
- Zoom 200/400 %: PASS / AVVIKELSER [ange vy]
- Övrigt: [valfritt]

## Beslut
En testad enskild miljö är inte full WCAG 2.2 AA-certifiering. Om något scenario fallerar registreras avvikelsen och PR #11 ska inte beskrivas som tillgänglighetsgodkänd. Även efter PASS behövs bredare testmatris för ett formellt konformitetspåstående.
