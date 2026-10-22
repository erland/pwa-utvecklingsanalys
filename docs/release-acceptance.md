# DEV-011 – Releasebedömning och tillgänglighetsacceptans

**Releasebeslut: ACCEPTED FOR INITIAL RELEASE – automatiserad acceptans godkänd, ingen WCAG-konformitetsförsäkran.**

## Verifierat automatiskt
- Lint, TypeScript, enhetstester, produktionsbygge, Playwright Chromium.
- Samtliga nio huvudvyer granskas för maskinellt identifierbara formulärkontroller utan tillgängligt namn.
- Huvudnavigationen markerar aktiv vy och ger tillgång till huvudlandmärket via skipplänk.
- Projektinställningar och exportkontroller fungerar vid 320 px och ett automatiserat test med 200 % förstorad rottext.
- Projektbackup JSON v2 och GZIP, återimport mellan separata browser-profiler, XLSX-utkastens byteintegritet och kraschåterhämtning via journal.

## Kontrasttest – omfattning
Automatiserat Playwright-test kontrollerar beräknad färgkontrast för synliga rubriker, etiketter, tabellceller, brödtexter och knappar i huvudvyerna mot uppmätt bakgrund, med gränserna 4,5:1 för normal text och 3:1 för stor text. Två avvikelser i översiktsvyn rättades genom mörkare textfärg. Testet hanterar inte pålitligt alla transparenser, gradienter, ikoner, bilder eller sammansatta bakgrunder och utgör därför bara en kompletterande kontroll.

## Medvetet undantagna manuella kontroller
| Kontroll | Status | Godkännandekrav |
|---|---|---|
| VoiceOver på macOS och iOS | EJ VERIFIERAD | Menyer, formulär, tabeller, statusmeddelanden och dialoger fungerar utan mus |
| Kontrast och visuella tillstånd | EJ VERIFIERAD | Text och komponenter uppfyller relevanta WCAG 2.2 AA-kriterier |
| Fokusordning och fokusfällor | EJ VERIFIERAD | Samtliga import-, relations-, fördelnings- och planeringsflöden prövade |
| 200–400 % textförstoring | PARTIAL | Inget innehåll eller kontroller går förlorade vid relevanta viewportbredder |
| Felmeddelanden och förståelighet | EJ VERIFIERAD | Fel annonseras och kan åtgärdas tangentbordsvägen |
| Återställning vid förlorad lokal lagring | BEGRÄNSNING | Extern backup krävs; ingen atomär transaktion över separata IndexedDB-databaser |

## Releasebeslut
Den 22 oktober 2026 valdes manuell VoiceOver- och zoomgranskning bort för första releasen. GitHub Actions #39719051492 och #39719056772 är gröna på tidigare implementation. DEV-011 godkänns för första release på grundval av automatiserade tester, med medvetet accepterad risk för oupptäckta tillgänglighetsbrister. Ingen WCAG 2.2 AA-efterlevnad påstås. Dokumentets manuella testfall är informationsunderlag, inte blockerande releasevillkor.

Inga originalarbetsböcker eller andra verksamhetsdata har checkats in som del av testerna.

## Uppföljning: extrem textförstoring

Chromiumtest med 320 pixlars viewport och rootfont 64 px kontrollerar att formulärfält och knappar ryms inom skärmen i samtliga nio huvudvyer. Testet upptäckte överskridande fil- och inmatningsfält på importvyn och resulterade i CSS-korrigering. Tangentbordstest prövar navigering till planeringsvyn och ändring av årsnummer med pilknapp. Båda testerna passerar i CI-körning 39715103932. Testet är en förenklad simulering av förstoring och styrker **inte** att alla textnoder, diagram, tabeller och browserzoom vid 400 % har fullständigt WCAG-kompatibelt omflöde. Detta och VoiceOver kräver fortsatt manuell granskning.

## Extra tangentbords- och omflödeskontroller

Playwright kontrollerar tabbordning genom hela huvudnavigationen, aktivering med Enter samt omflöde av interaktiva kontroller i de nio huvudvyerna vid en 320-pixlars layoutviewport, motsvarande den tillgängliga CSS-bredden efter 400 % sidzoom från 1280 px. Detta är inte faktisk zoomstyrning i en användares webbläsare och kan inte användas som ensamt bevis på full WCAG-reflow. Tidiga försök med CSS zoom gav missvisande resultat och har ersatts av viewportbaserad metod. Manuella VoiceOver- och visuella zoomtester är inte utförda och har uttryckligen undantagits från första releasens acceptanskrav.

## Genomförande inför manuell acceptans

Se `docs/manual-voiceover-acceptance.md` för fem korta scenarier på Mac med VoiceOver och kompletterande verklig zoomkontroll. Scenarierna är **förberedda men inte genomförda**. Chromiumtesterna i `e2e/keyboard-workflows.spec.ts` täcker tangentbordsåtkomlig filimport, valideringsfel utan möjlighet till osäker återställning samt att planeringsformulär kan användas utan mus. Den manuella granskningen behövs för slutlig releaseacceptans och eventuella kvarstående avvikelser ska registreras innan merge.
