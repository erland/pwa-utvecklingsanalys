# CHANGE-034 – analysfunktioner: gammal vy jämfört med v2

Inventering från `src/analytics/AnalyticsView.tsx` och `src/analytics/CanonicalAnalytics.tsx` (23 oktober 2026).

| Funktion | Tidigare analys | V2 | Fortsättning |
|---|---|---|---|
| Urval av mått och enhet | Enskilt eller grupperat | Flerurval per enhet | Behåll v2 |
| Årsfilter | Ja | Ja | Behåll v2 |
| Datakällor och UO | Flerurval | Flerurval | Behåll v2 |
| LO | Indirekt via källaobjekt | Direkt urval | Behåll v2 |
| Aktiviteter utveckling/förvaltning | Separat redovisning | Källsäker analys med godkända fördelningar | Behåll v2 |
| Avdelningar | Inte som samma organiseringsaxel | Separat analysaxel | Behåll v2 |
| Årsvisa diagram | Staplar och linjer | Årsstaplar samt årsjämförelse | Trendlinjer återstår |
| Organisationsdiagram | Stapel och cirkel | Tabell + stapel (CHANGE-034) | Cirkeldiagram återstår |
| UO-grupper | Konfigurerbar gruppmodell och förstarankningsregel | Inte ännu | Migrera med tydlig dubbelräkningsregel |
| Gruppering på källfil / år / UO | Valbar gruppering | Huvudtabell per organisationsdel, årsdiagram | Migrera källfilgruppering |
| CSV-export | Saknas i äldre analysvyn | Finns | Behåll v2 |
| Källposter och undantagna dubbletter | Antalsredovisning | Alternativräkning och täckning, men inte radantal | Komplettera |
| Kompletteringar och underlag | Integrerat med semantiska importen | V2-granskning och beslut finns i separat flöde | Säkerställ sammanhållen navigering |

## Beslut och nästa prioritet

Behåll de båda analysvyerna parallellt tills UO-gruppmodeller, gruppering efter källa och relevanta kompletteringsfunktioner kan användas i v2. Ingen automatisk avveckling. CHANGE-034 lägger till stapelvisning för organisationsdelar utan att förändra den kanoniska frågan eller källdata.

## Acceptans

Tabell och stapeldiagram ska visa identiska värden och enheter utifrån samma `analyzeCanonical`-resultat. UO Övergripande och LO förblir additiva; alternativ aktivitetsmatris räknas inte igen. Bevara mobilresponsivitet och textvärden för tillgänglighet.
