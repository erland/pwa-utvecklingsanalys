# DEV-004 – semantisk datamodell

Domänmodellen i `src/domain/semantic.ts` är en versionssatt, typad grund för att koppla budget, arbetsprocesser, avdelningar och andra källor. Den skiljer på:

- **Entiteter** med stabila ID, typ, namn, alias och eventuellt föräldraobjekt. UO-övergripande resurser är en separat objekttyp och räknas inte som LO.
- **Mått** med enhet och aggregeringspolicy. Timmar/kostnader är summerbara där tidsperioder och omfattning är kompatibla; personalantal och FTE är ögonblicksmått och ska inte summeras över tid.
- **Observationer** med mått, period, planeringsversion, scenario, datakvalitet och exakt fil-/blad-/cellreferens samt detalj-/subtotal-/delmängdsklassificering.
- **Relationer** med typ, giltighetsintervall och möjlighet till källhänvisning.

En importadapter `src/domain/importAdapter.ts` omvandlar godkända budgetdetaljer till observationer. Upprepad godkänd import av **samma dataset-ID** ersätter tidigare observationer från det datasetet i stället för att duplicera dem. Olika dataset-ID innebär olika källor; deduplicering mellan olika filer måste hanteras i framtida analyslogik.

`matchEntity` gör endast säker matchning av exakta namn och entydiga alias inom samma objekttyp. Tvetydiga alias kräver uttryckligt användarbeslut – automatisk hopslagning är förbjuden.

Validering kontrollerar ID-konflikter, referenser, perioder, ändliga numeriska värden och källreferenser. `migrateSemantic` accepterar endast schema v1 och avvisar okända versioner. Senare migreringssteg ska utvecklas som explicita versionstransformationer.

Data sparas lokalt via `src/domain/semanticStore.ts`. Detta är separerat från befintligt projektsammanfattningslager. De två skrivningarna är **ännu inte en atomär gemensam transaktion**; fullständig projektlagringskonsolidering och återställning behandlas i senare persistence-/projektexportarbete.

## Avgränsning och nästa steg

DEV-004 inför domänkontraktet och koppling från importer till källobservationer. Den nuvarande analysvyn visar fortfarande syntetiska exempelvärden. Pivottabeller, gruppaggregering och rapporter på verkliga importerade fakta utvecklas i DEV-005.

Varken verksamhetens originalarbetsböcker eller verkliga observationer checkas in. Testerna använder syntetisk data.
