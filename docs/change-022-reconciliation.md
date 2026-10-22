# CHANGE-022 – Generell avstämning mellan datasektioner

## Leverans
En avstämningsregel definierar två oberoende urval över den semantiska observationsmodellen: objektet själv eller dess direkta barn, observationstyp (detail, subset, subtotal), eventuellt sektions-ID och aktivitet, gemensamt summerbart mått, år och absolut/relativ tolerans. Reglerna behöver inte känna till en viss Excelmall.

Exempel: jämför IT-timmar på samtliga underliggande LO med utvecklings- och förvaltningstimmar på UO-nivå. Beräkningen tar hänsyn till år och skiljer på **saknat** och ett faktiskt nollvärde. Källorna redovisas med fil/blads- och celladress. Identifierade avvikelser korrigeras inte automatiskt.

Användaren kan dokumentera en accepterad avvikelse med obligatorisk motivering. Beslutet lagrar ett fingeravtryck av jämförelseunderlaget, inklusive urvalsregel och ingående observationer. Om något ändras återgår statusen till avvikelse och kräver ny granskning.

Regler, beslut och motiveringar lagras i det befintliga kompletteringsregistret, som följer med projektbackup och påverkas av arbetsytans återställningsfunktion. Reglerna valideras vid import av backup.

## Viktiga avgränsningar
Den generella jämförelsen är årsbaserad och summerar observationer inom respektive valt urval. Den kan inte avgöra om två annars olika datasektioner faktiskt är jämförbara; detta måste användaren definiera. Månads-/årsöverlappar inom samma urval identifieras inte automatiskt. Ursprungsvärden och godkända kompletteringar skrivs aldrig över. Ett saknat urval rapporteras som ofullständig avstämning, inte som ett nollvärde.

## Verifiering
Enhetstester för överensstämmelse, avvikelse, saknade värden, toleranser, källredovisning, exkluderade summeringar och omprövning vid ändrade källvärden; projektets ordinarie CI verifierar typkontroll, byggnation och webbläsarregressioner.
