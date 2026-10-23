import CanonicalAnalytics from './CanonicalAnalytics';

/** The v2 analysis is the sole user-facing analysis. Historical semantic data remains in storage for backup compatibility. */
export default function AnalyticsView({refreshKey,onOpenCompletions}:{refreshKey:number;onOpenCompletions:()=>void}){
 return <><div className="eyebrow">ANALYS · IMPORTERADE DATA</div><h1>Analysera utvecklingsbehoven</h1><p className="lead">Analysen baseras på analysmodellen och godkända källuppgifter. Alternativa observationer och aktivitetsfördelningar hanteras utan dubbelräkning.</p><CanonicalAnalytics refreshKey={refreshKey} onOpenCompletions={onOpenCompletions}/></>;
}
