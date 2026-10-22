# CHANGE-016 – Informationskrav, luckor och kompletteringsbeslut

## Syfte
Applikationen ska kunna redovisa vad en analys behöver även när källfilen inte innehåller motsvarande data. Ingen komplettering får skriva över importerade originalobservationer eller ändra de befintliga analysaggregaten tyst.

## Levererad första etapp
- Definiera ett informationskrav med namn, befintligt semantiskt mått, objektnivå, år och dimensionsvärden.
- Härled de förväntade kombinationerna som kartesisk produkt av befintliga objekt × år × dimensionsvärden; jämför mot importerade observationer.
- Redovisa skillnaden mellan saknad information, faktiskt nollvärde, manuell komplettering, okänt och ej tillämpligt.
- Registrera manuellt tal med angiven motivering, uttryckligt okänt eller ej tillämpligt (motivering krävs). Dessa sparas i ett separat lokalt register och förs inte in i källobservationerna.
- Ta med krav och beslut i projektbackup och återställning som frivilligt fält för äldre arkiv.
- Ny flik **Kompletteringar** i appens huvudmeny.

## Avgränsningar
Enbart användardefinierade krav prövas; frånvaro kan inte upptäckas utan ett krav på förväntad data. I denna etapp representerar varje informationskrav ett specifikt mått, en objektnivå, år och en valfri namngiven dimensionsmängd. Registrerade kompletteringar är besluts-/kvalitetsuppgifter; de räknas ännu inte som alternativa analysobservationer.

En överordnad UO-fördelning förs inte automatiskt ned på LO-nivå. Proportionell fördelning, generella beräkningsregler, täckningsbedömning och statusen föråldrad komplettering när källor ändras kräver egna kontroller och ingår i efterföljande steg.

## Verifiering
Enhetstester kontrollerar identifiering av saknade kombinationer, skillnad mellan noll och saknat, källornas oföränderlighet och validering av undantag. Full CI omfattar lint, typkontroll, enhetstester, PWA-/singlefile-byggnation och Chromium. Manuell verksamhetsacceptans återstår.
