import {useEffect,useMemo,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState,type GapState} from '../gaps/store';
import {previewActivityAllocation,approveSharedActivityAllocation,approvedActivityParts,type ActivityAllocationRule,type AllocationPreview} from '../domain/activityAllocation';
import type {CanonicalDataset} from '../domain/canonical';
import LoAllocationDraft from '../gaps/LoAllocationDraft';

/** Import-format completion appears automatically; no manual rule creation is needed. */
export default function BudgetCompletionAfterImport({refreshKey,onAnalyze}:{refreshKey:number;onAnalyze:()=>void}){
 const [data,setData]=useState<CanonicalDataset|null>(null);
 const [state,setState]=useState<GapState|null>(null);
 const [error,setError]=useState('');
 const [bulkBusy,setBulkBusy]=useState(false);
 const [bulkMessage,setBulkMessage]=useState('');
 useEffect(()=>{
  let active=true;
  void Promise.all([loadCanonical(),loadGapState()]).then(([canonical,gaps])=>{
   if(active){setData(canonical);setState(gaps);setError('')}
  }).catch(e=>{if(active)setError(String(e))});
  return ()=>{active=false};
 },[refreshKey]);
 const {candidates,diagnostics}=useMemo(()=>{
  if(!data)return {candidates:[],diagnostics:[]};
  const diagnostics:string[]=[];
  const found=new Map<string,{rule:ActivityAllocationRule;preview:ReturnType<typeof previewActivityAllocation>;decision?:ReturnType<typeof approveSharedActivityAllocation>;approved:boolean}>();
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
    found.set(key,{rule,preview,decision,approved:Boolean(decision&&approvedActivityParts(data,rule,decision).length)});
   }catch(e){diagnostics.push(`${candidate.uoId} · ${candidate.metric} · ${candidate.year}: ${e instanceof Error?e.message:String(e)}`);}
  }
  return {candidates:[...found.values()],diagnostics};
 },[data,state]);
 // One annual allocation UI per UO: IT and business hours share LO percentages.
 const grouped=new Map<string,typeof candidates>();
 for(const item of candidates){
  const key=JSON.stringify([item.rule.datasetId,item.rule.uoId,item.rule.year]);
  grouped.set(key,[...(grouped.get(key)??[]),item]);
 }
 const yearGroups=[...grouped.entries()].map(([key,entries])=>{
  const items=new Map<string,AllocationPreview['items'][number]>();
  for(const {preview} of entries)for(const item of preview.items){
   const old=items.get(item.loId);
   items.set(item.loId,old?{...old,total:old.total+item.total,development:old.development+item.development,maintenance:old.maintenance+item.maintenance}:item);
  }
  const mergedItems=[...items.values()];
  const total=mergedItems.reduce((n,i)=>n+i.total,0);
  const development=mergedItems.reduce((n,i)=>n+i.development,0);
  const preview:AllocationPreview={ruleId:key,fingerprint:entries.map(e=>e.preview.fingerprint).join('|'),items:mergedItems,uo:{development,maintenance:total-development}};
  return {key,entries,preview,approved:entries.every(e=>e.approved&&e.decision?.sharedPercentages)};
 });
 const pending=yearGroups.filter(g=>!g.approved);
 const saveShared=async(entries:typeof candidates,overrides:{loId:string;developmentPercent:number}[],reason:string,latest:GapState)=>{
  const rules=[...(latest.activityAllocationRules??[])],decisions=[...(latest.activityAllocationDecisions??[])];
  for(const {rule,preview} of entries){
   const existing=rules.find(r=>r.datasetId===rule.datasetId&&r.uoId===rule.uoId&&r.metric===rule.metric&&r.year===rule.year);
   const target=existing??rule;
   const decision=approveSharedActivityAllocation(preview,reason,overrides);
   if(!existing)rules.push(target);
   const index=decisions.findIndex(d=>d.ruleId===target.id);
   const updated={...decision,ruleId:target.id};
   if(index>=0)decisions[index]=updated;else decisions.push(updated);
  }
  return {...latest,activityAllocationRules:rules,activityAllocationDecisions:decisions};
 };
 const approveAll=async()=>{
  if(!data||!pending.length)return;
  setBulkBusy(true);setBulkMessage('');
  try{
   const latest=await loadGapState();
   let next=latest;
   for(const group of pending){
    const overrides=group.preview.items.map(item=>({loId:item.loId,developmentPercent:item.total?100*item.development/item.total:0}));
    next=await saveShared(group.entries,overrides,'Gemensamt godkännande av årsbaserad LO-fördelning',next);
   }
   await saveGapState(next);
   setState(next);
   setBulkMessage(`${pending.length} fördelningar godkända. Analysen använder nu de sparade fördelningarna.`);
  }catch(e){setBulkMessage(`Kunde inte godkänna alla fördelningar: ${e instanceof Error?e.message:String(e)}`)}
  finally{setBulkBusy(false)}
 };
 if(error)return <p role="alert">Kunde inte läsa kompletteringar: {error}</p>;
 if(!data||!state)return null;
 if(!candidates.length)return <div className="panel"><p>{diagnostics.length?'LO-fördelningen kan inte visas eftersom underlaget inte stämmer med aktivitetsmatrisen.':'Det finns inga LO-fördelningar att justera för importerade budgetunderlag.'}</p>{diagnostics.length>0&&<ul>{diagnostics.map((item,i)=><li key={i}>{item}</li>)}</ul>}<button className="primary" onClick={onAnalyze}>Gå till analys</button></div>;
 return <section className="panel" aria-label="Komplettera efter import">
  <h2>Fördela utveckling och förvaltning per LO och år</h2>
  <p>En gemensam utvecklingsandel per LO och år gäller för både IT-timmar och verksamhetstimmar. UO Övergripande ingår som egen rad. Godkänn för att använda fördelningen i årsanalysen.</p>
  {pending.length>0&&<button className="primary" disabled={bulkBusy} onClick={()=>void approveAll()}>{bulkBusy?'Godkänner…':`Godkänn alla föreslagna fördelningar (${pending.length})`}</button>}
  {pending.length>0&&<p>Massgodkännande använder de automatiskt föreslagna procentandelarna. Osparade ändringar i reglagen ingår inte; spara sådana i respektive tabell först.</p>}
  {bulkMessage&&<p role="status">{bulkMessage}</p>}
  {yearGroups.map(({key,entries,preview,approved})=><div key={key} className="mapping-settings">
   <h3>{decodeURIComponent(entries[0].rule.uoId.startsWith('uo:')?entries[0].rule.uoId.slice(3):entries[0].rule.uoId)} · {entries[0].rule.year} · Gemensam utvecklingsandel för IT- och verksamhetstimmar</h3>
   <p role="status">{approved?'Godkänd fördelning – kan justeras på nytt':'Behöver godkännas'}</p>
   <LoAllocationDraft key={preview.fingerprint+'-'+JSON.stringify(entries[0].decision?.overrides??[])} preview={preview} decision={approved?entries[0].decision:undefined} sharedMode quick onApprove={async(overrides,reason)=>{
    const latest=await loadGapState();
    const next=await saveShared(entries,overrides,reason,latest);
    await saveGapState(next);
    setState(next);
   }}/>
  </div>)}
  <p>Ej godkända fördelningar ingår inte som fastställd uppdelning i analysen. Du kan återkomma till Import och justera tidigare beslut.</p>
  <button className="secondary" onClick={onAnalyze}>Gå till analys</button>
 </section>;
}
