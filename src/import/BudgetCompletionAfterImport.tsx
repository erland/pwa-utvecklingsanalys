import {useEffect,useMemo,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState,type GapState} from '../gaps/store';
import {previewActivityAllocation,approveActivityAllocation,approvedActivityParts,type ActivityAllocationRule} from '../domain/activityAllocation';
import type {CanonicalDataset} from '../domain/canonical';
import LoAllocationDraft from '../gaps/LoAllocationDraft';

/** Import-format completion appears automatically; no manual rule creation is needed. */
export default function BudgetCompletionAfterImport({refreshKey,onAnalyze}:{refreshKey:number;onAnalyze:()=>void}){
 const [data,setData]=useState<CanonicalDataset|null>(null);
 const [state,setState]=useState<GapState|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  void Promise.all([loadCanonical(),loadGapState()]).then(([canonical,gaps])=>{
   if(active){setData(canonical);setState(gaps);setError('')}
  }).catch(e=>{if(active)setError(String(e))});
  return ()=>{active=false};
 },[refreshKey]);
 const candidates=useMemo(()=>{
  if(!data)return [];
  const found=new Map<string,{rule:ActivityAllocationRule;preview:ReturnType<typeof previewActivityAllocation>}>();
  for(const record of data.records){
   if(record.authority!=='original'||record.granularity!=='activity-part'||record.scope.axis!=='work'||record.scope.loId||!record.source||!['it_hours','business_hours'].includes(record.metric))continue;
   const candidate={datasetId:record.source.datasetId,uoId:record.scope.uoId,metric:record.metric as 'it_hours'|'business_hours',year:record.year};
   const key=JSON.stringify(candidate);
   if(found.has(key))continue;
   const existing=state?.activityAllocationRules?.find(r=>r.datasetId===candidate.datasetId&&r.uoId===candidate.uoId&&r.metric===candidate.metric&&r.year===candidate.year);
   const rule:ActivityAllocationRule=existing??{...candidate,id:key,reason:'Komplettering från UO-budgetformat'};
   try{
    const preview=previewActivityAllocation(data,rule);
    const decision=state?.activityAllocationDecisions?.find(d=>d.ruleId===rule.id);
    if(!decision||!approvedActivityParts(data,rule,decision).length)found.set(key,{rule,preview});
   }catch{/* No valid UO/LO reconciliation: do not offer an unsafe quick approval. */}
  }
  return [...found.values()];
 },[data,state]);
 if(error)return <p role="alert">Kunde inte läsa kompletteringar: {error}</p>;
 if(!data||!state)return null;
 if(!candidates.length)return <div className="panel"><p>Inga nya avstämda LO-fördelningar behöver godkännas.</p><button className="primary" onClick={onAnalyze}>Gå till analys</button></div>;
 return <section className="panel" aria-label="Komplettera efter import">
  <h2>Fördela utveckling och förvaltning per LO</h2>
  <p>Excel-formatet har föreslagit en fördelning. Justera bara de LO som behöver ändras. UO:s och LO:s totaler är låsta.</p>
  {candidates.map(({rule,preview})=><div key={rule.id} className="mapping-settings">
   <h3>{rule.uoId} · {rule.metric==='it_hours'?'IT-timmar':'Verksamhetstimmar'} · {rule.year}</h3>
   <LoAllocationDraft key={preview.fingerprint} preview={preview} quick onApproved={candidates.length===1?onAnalyze:undefined} onApprove={async(overrides,reason)=>{
    const decision=approveActivityAllocation(preview,reason,overrides);
    const latest=await loadGapState();
    const matching=latest.activityAllocationRules?.find(r=>r.datasetId===rule.datasetId&&r.uoId===rule.uoId&&r.metric===rule.metric&&r.year===rule.year);
    const targetRule=matching??rule;
    const nextDecision={...decision,ruleId:targetRule.id};
    const next:GapState={...latest,
     activityAllocationRules:matching?latest.activityAllocationRules:[...(latest.activityAllocationRules??[]),targetRule],
     activityAllocationDecisions:[...(latest.activityAllocationDecisions??[]).filter(d=>d.ruleId!==targetRule.id),nextDecision]};
    await saveGapState(next);
    setState(next);
   }}/>
  </div>)}
  <p>Godkänn samtliga visade fördelningar innan du analyserar deras utvecklings- och förvaltningsuppdelning.</p>
  <button className="secondary" onClick={onAnalyze}>Gå till analys</button>
 </section>;
}
