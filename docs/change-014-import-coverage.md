# CHANGE-014 – LO-identifiering och täckningsgranskning

## Orsak
Den tidigare regeln accepterade bara LO följt av ett nummer. I verkliga Excelmallar heter områden exempelvis `LO AUL` och `LO IA`. Vid en anpassad mappning accepterades dessutom nästan varje områdestext, vilket skapade olika tolkningsresultat. En oidentifierad rubrik kunde lämna kvar föregående LO som aktivt.

## Genomförande
- UO Övergripande och LO följt av ett icke-tomt namn identifieras konsekvent vid standardmappning och explicit mappning.
- Okänd rubrik i områdeskolumnen bryter kopplingen till föregående LO, så värden inte tyst felklassificeras.
- Numeriska celler i periodkolumner på detaljrader inventeras. Värden med okänt mått eller område markeras som blockerande fel med cellreferens.
- Formler i kända detaljrader redovisas separat som utelämnade. Detaljsummeringar (TOT/SUMMA) och blad utanför profilen ingår inte i täckningstalet.
- Importvyn visar kandidater, importerade och oidentifierade celler, antal formler och antal observationer per område.

## Begränsningar
Täckningskontrollen täcker det valda UO-totalbladet och dess igenkända periodkolumner; den analyserar inte alla tal i hela arbetsboken. Formelresultat beräknas inte. Verksamhetsacceptans med anonymiserade riktiga filer rekommenderas innan release.
