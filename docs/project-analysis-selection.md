# Analysurval för UO och projekt (PR #291)

## Beslut
UO-budgetar och tvärgående projekt är separata, additiva behov. Samma år och samma mått kan summeras rakt av. Avdelningsfördelning är en alternativ vy och får inte adderas på nytt.

## Beteende i denna leverans
- Under **UO och LO** kan planeringstyp väljas: **UO**, **Projekt**, **Alla**.
- **UO** behåller befintlig organisationsnavigering, fördelningar och aktivitetsanalys.
- **Projekt** redovisar total och projektlista för valda år och tim-/kostnadsmått. Projekt kan öppnas för att visa projektdelar.
- **Alla** summerar UO + Projekt, visar bidrag från respektive typ och gör objekten navigerbara.
- Tim- och kostnadsvyn delar samma planeringstypväljare, och även år och mått gäller båda.
- Projektimport saknar ännu uppdelningen Utveckling/Förvaltning. I Projekt/Alla väljs därför alltid alla aktiviteter; vi får inte visa nollor som om fördelning vore känd.

## Verifiering och fortsättning
Regressionstest för aggregering av skilda axlar, år, timmar/kostnader och avdelningsperspektiv. Full Verify PWA på PR-head krävs.
Kommande steg: samlad avdelningsanalys för projekt och UO samt projektens aktivitetssplit; i detta steg ska varken projektens behov eller avdelningsfördelningar felklassificeras.
