# CHANGE-054 – kodbaserade importformat, första steget

Beslut: formatet **UO Tot 2027-30** definieras i kod och identifieras automatiskt, utan att användaren behöver ange var formatreglerna finns.

## Arkitektur
- `src/import/formats/uoBudget2027_30.ts`: det enskilda formatets identitet, igenkänning, cellregler, formelstöd, parser och resultatform.
- `src/import/formats/registry.ts`: liten lista över tillåtna format; registrerar formatmoduler och avvisar tvetydiga träffar.
- `src/import/detectWorkbook.ts`: bevarar befintligt API och låter okända tabellformat gå till den tidigare manuella tabellgranskningen under övergången.
- `src/import/uoBudget.ts`: tillfällig kompatibilitetsexport för befintliga beroenden.
- `src/import/formats/registry.test.ts`: verifierar igenkänning och ett verkligt parserscenario med `LOAUL` och `=B25`.

## Avgränsning
Ingen importvy förenklas och inget existerande källformat tas bort i denna PR. Ingen direktimport införs ännu; godkännande, återställning, importutkast och tidigare mappningar fungerar fortfarande. Detta isolerar flytten av befintliga parseregler från den kommande förändringen av användarflödet.

## Nästa steg
Inför ett gemensamt resultat-/commitkontrakt för formatmodulerna och migrera övriga verifierade format ett i taget. Därefter kan importvyn reduceras till val av flera filer och en resultatlista utan konfiguration eller preview. Okända/ogiltiga filer måste alltid stoppas säkert.
