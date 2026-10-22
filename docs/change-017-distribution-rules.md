# CHANGE-017 – Regler för proportionell fördelning av informationsluckor

## Funktion
En användare kan skapa en fördelningsregel för ett befintligt informationskrav på LO-nivå. Regeln pekar på ett år, ett dimensionsvärde, ett summerbart viktmått och en obligatorisk motivering.

Systemet letar efter ursprungliga observationer på UO-nivå för det angivna måttet, året och dimensionsvärdet. Det läser därefter LO:s detaljvärden för viktmåttet under samma år och fördelar UO-beloppet proportionellt. Alla användardefinierade regler lagras lokalt och följer med projektbackupen.

## Säkerhets- och kvalitetsgrindar
- **Ingen dubbelräkning:** fördelningarna är separata förslag och räknas inte in i standardanalysen.
- För denna första etapp krävs exakt **ett UO** med LO som direkta barn. Detta förhindrar oavsiktlig fördelning mellan UO.
- Kan inte skapa en fördelning när något mål redan har en manuell komplettering, accepterat undantag eller originalobservation för samma informationskrav och dimension.
- Enbart icke-negativa, ändliga vikter och positiv viktssumma accepteras.
- Sista LO får restvärdet så att fördelade värden summerar till UO-källans total (med flyttalsprecision).
- Reglerna använder inte cachelagrade resultat; ändrade källobservationer gör att förhandsgranskningen räknas om. Om indata inte längre är giltiga visas fel och inga resultat.
- Källobservationerna, revisionshistoriken och standardanalysen ändras aldrig av en fördelningsregel.

## Avgränsning
Reglerna är ännu inte en explicit valbar alternativ analysserie; de är gransknings- och kompletteringsförslag. Slutligt godkännande, fler UO, styrd avrundning, generell hierarkisk aggregering och verifiering efter källändringar är separata nästa steg. Fördelningsnyckeln får vara ett befintligt summerbart mått och behöver inte ha samma enhet som värdet som ska fördelas.

## Verifiering
Enhetstester för proportioner, totalsumma, inkompatibla förhållanden, överlapp med existerande uppgifter, ändrade källvärden och ogiltiga vikter samt projektets CI.
