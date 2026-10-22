# CHANGE-015 – Utökad sektionseditor

Matrisens befintliga intervallredigering har kompletterats med rubrikalias för **utveckling/förvaltning** och med måttalias som pekar på befintliga semantiska mått. Varje måttalias har enhet och en explicit omräkningsfaktor.

Vid ändrad konfiguration rensas den tidigare förhandsgranskningen; användaren måste läsa om datasektionen innan godkännande kan ske. Okända rubriker/celler visas fortfarande med celladress. Parsern validerar intervall, mått, aktivitet, faktor och enhetsfamilj före läsning. Ett kundanpassat prefix och ett annat källmått kan anges utan kodändring.

Avgränsning: fortfarande **en extra matris per budgetimport**, med development och maintenance som möjliga aktiviteter. Användaren kan inte definiera obegränsat antal sektioner, helt nya semantiska mått eller andra dimensionstyper. Dessa kräver en separat generalisering av domänmodell och importkontrakt. Sektionsregler sparas i importutkastet, inte ännu som delade namngivna konfigurationsprofiler.

Tester: anpassat måttalias, aktivitetsprefix, enhetsfaktor och avslag vid inkompatibel enhet.
