# UX-006 – Navigering och tillgänglighet på mindre skärmar

**Bas:** `main` `4aab1ac62ba55652497ac60523880a4159a3abe2`, efter mergad UX-005/PR #282.

## Verifierat problem

Vid högst 1150 px byter `src/styles.css` huvudmenyn till en horisontellt rullbar lista. Menyn saknade en synlig förklaring att fler vyer kan ligga utanför skärmen och kontroller för att förflytta sig längs listan. Att detta sannolikt försämrar upptäckbarhet, särskilt på iPad i stående läge, är en UX-hypotes härledd från implementeringen – inget fysiskt iPad-användartest har genomförts. I sidhuvudet syntes även den interna märkningen `DEV-011`.

## Avgränsad UX-ändring

- Under 1150 px visas en instruktion, **Fler vyer? Svep menyn eller använd pilarna**, samt två riktiga knappar med tillgängliga namn: **Bläddra menyn åt vänster** och **Bläddra menyn åt höger**.
- Knapparna förflyttar den befintliga horisontella menyn. De har minst 38×38 CSS-px klickyta och fungerar med tangentbordets Enter. Den synliga huvudmenyn och dess `aria-current`-märkning behålls; inga vyer läggs till eller tas bort.
- Desktop-layouten med vertikal sidomeny påverkas inte; hjälpkontrollerna döljs.
- Sidhuvudets interna utvecklingsetikett ersätts med den begripliga texten **Projektdata lagras lokalt**.

## Automatiska verifieringar

`e2e/ux-006-responsive-navigation.spec.ts` kontrollerar 320 px mobilbredd med synliga kontroller, horisontell förflyttning med Enter, fortsatt navigering till Inställningar och frånvaro av `DEV-011`, samt 820 px surfplattebredd och 1280 px desktop.

Befintlig `e2e/release-a11y.spec.ts`, `e2e/keyboard-workflows.spec.ts`, tester för 320 px reflow och alla andra tester ska också passera. Full Verify PWA krävs på exakt sista PR-headen.

## Manuell testmatris – ännu EJ UTFÖRD

1. **iPad Safari, stående (ca 820 CSS-px):** Prova att svepa huvudmenyn, använda pilarna, växla mellan Fördelningar/Analys/Inställningar och återvända. Kontrollera att aktiva menyval och fokus syns och att sidan inte får oavsiktlig horisontell scroll.
2. **iPad Safari, liggande:** Kontrollera att menyn och verktygen ger rimlig plats åt analysen och att den vertikala desktop-menyn återkommer vid tillräcklig bredd.
3. **iPhone Safari, smalt läge:** Svep/pilar i huvudmenyn, importera testfil, öppna analys, använd fördelningsreglage och kontrollera att alla knappar går att nå.
4. **Mac Safari + VoiceOver:** Kontrollera att `Huvudmeny`, vänster-/högerknappar, aktiv sida och projektets statusmeddelanden annonseras rätt. Granska modal massändring för fokusordning och återgång vid avbryt.
5. **Zoom, tangentbord och kontrast:** Verifiera 200/400 % faktisk zoom i Safari och att analys- och fördelningstabeller omflödar/kan skrollas utan att kontroller försvinner. Granska fokus, kontrast och pekytor enligt WCAG 2.2 AA.

**Dokumentera** enhet, OS, Safari-version, sidbredd/zoom, scenario, resultat PASS/AVVIKELSE och skärmbild vid avvikelse. Denna text är en checklista, inte ett testprotokoll med godkända resultat.

## Kvarstående risk och release

Full tillgänglighet enligt WCAG 2.2 AA kan inte fastställas av Chromium/Playwright. iPad, VoiceOver, faktisk Safari-zoom och manuell RG-01–RG-10 är fortfarande inte verifierade. Inga förändringar av dataformat eller analyser ingår. **Release: NO-GO.**

## Nästa steg

UX-007 – språk och hjälpinformation, inklusive konsekvent borttagning av återstående utvecklarkoder och användarcentrerad förklaring av diagnostik, i separat verifierbar PR.
