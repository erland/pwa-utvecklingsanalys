# CHANGE-064 – webbläsartest av direktimport

De två generella import-/analystesterna använder nu `#direct-import-files` i stället för äldre `#import-files` och manuellt godkännande. Testerna verifierar att importresultatet visas, att UO-källan ligger kvar efter sidomladdning och att kanonisk v2-analys fortsatt kan filtreras.

Äldre granskningspanel och data i sparade utkast lämnas orörda. Det särskilda end-to-end-testet för fördelningsgodkännande och omprövning efter källbyte kör fortfarande legacy-flödet. Det ska migreras separat och behöver bevisa att samma analysregler bevaras när källan ersätts genom direktimport.

Detta är ett avgränsat förberedelsesteg före borttagning av panelen, inte ett byte av informationsmodell eller radering av lagrade utkast.
