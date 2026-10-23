import {useEffect,useMemo,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {previewActivityAllocation,approveActivityAllocation,approvedActivityParts,type ActivityAllocationRule} from '../domain/activityAllocation';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from './store';

export default function ActivityAllocationsV2({state,save}:{state:GapState;save:(s:GapState)=>Promise<void>}){
 const [data,setData]=useState<CanonicalDataset|null>(null),[error,setError]=useState('');
 const [selection,setSelection]=useState(''),[reason,setReason]=useState('Fördelning proportionellt mot LO-totaler'),[approvalReasons,setApprovalReasons]=useState<Record<string,string>>({});
 useEffect(()=>{void loadCanonical().then(setData).catch(e=>setError(String(e)))},[]);
 const rules=state.activityAllocationRules??[],decisions=state.activityAllocationDecisions??[];
 const candidates=useMemo(()=>{
  if(!data)return [];
  const found=new Map<string,{datasetId:string;uoId:string;metric:'it_hours'|'business_hours';year:number}>();
  for(const record of data.records){
   if(record.scope.axis!=='work'||record.granularity!=='activity-part'||record.authority!=='original'||!record.source||!['it_hours','business_hours'].includes(record.metric))continue;
   const candidate={datasetId:record.source.datasetId,uoId:record.scope.uoId,metric:record.metric as 'it_hours'|'business_hours',year:record.year};
   found.set(JSON.stringify(candidate),candidate);
  }
  return [...found.values()];
 },[data]);
 const current=selection?candidates.find(c=>JSON.stringify(c)===selection):candidates[0];
 const add=()=>{
  if(!current||!reason.trim()){setError('Välj källa och ange motivering.');return}
  const rule:ActivityAllocationRule={id:crypto.randomUUID(),...current,reason:reason.trim()};
  try{previewActivityAllocation(data!,rule)}catch(e){setError('Kan inte fördela: '+String(e));return}
  void save({...state,activityAllocationRules:[...rules,rule]});setError('');
 };
 return <section className="panel"><h2>Aktivitetsfördelning till LO</h2><p>Fördela rapporterade UO-timmar för utveckling och förvaltning proportionellt mot LO:s originaltotaler. Endast avstämda och godkända fördelningar används. Originalvärden ändras inte.</p>
 {error&&<p role="alert">{error}</p>}
 <label>Källa, UO, mått och år<select aria-label="fördelningskälla" value={current?JSON.stringify(current):''} onChange={e=>setSelection(e.target.value)}><option value="">Välj underlag</option>{candidates.map(c=><option key={JSON.stringify(c)} value={JSON.stringify(c)}>{c.uoId} · {c.metric} · {c.year} · {c.datasetId}</option>)}</select></label>
 <label>Motivering för fördelningsregel<input aria-label="regelmotivering" value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <button className="secondary" disabled={!current||!data} onClick={add}>Skapa fördelning</button>
 {rules.length===0?<p>Inga fördelningar skapade.</p>:rules.map(rule=>{
  let preview:ReturnType<typeof previewActivityAllocation>|null=null,problem='';
  try{if(data)preview=previewActivityAllocation(data,rule)}catch(e){problem=String(e)}
  const decision=decisions.find(d=>d.ruleId===rule.id);
  const parts=data&&decision?approvedActivityParts(data,rule,decision):[];
  const status=parts.length?'Godkänd':problem?'Blockerad: '+problem:decision?'Kräver nytt godkännande':'Inväntar godkännande';
  return <section key={rule.id} className="mapping-settings"><h3>{rule.uoId} · {rule.metric} · {rule.year}</h3><p role="status">{status}</p><p>{rule.reason}</p>
  {preview&&<><p>UO: {preview.uo.development.toLocaleString('sv-SE')} timmar utveckling, {preview.uo.maintenance.toLocaleString('sv-SE')} timmar förvaltning.</p>
  <div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>LO</th><th>Totalt</th><th>Utveckling</th><th>Förvaltning</th></tr></thead><tbody>{preview.items.map(i=><tr key={i.loId}><td>{i.loId}</td><td>{i.total.toLocaleString('sv-SE')}</td><td>{i.development.toLocaleString('sv-SE')}</td><td>{i.maintenance.toLocaleString('sv-SE')}</td></tr>)}</tbody></table></div>
  <label>Godkännandemotivering<input aria-label={'godkännandemotivering '+rule.id} value={approvalReasons[rule.id]??''} onChange={e=>setApprovalReasons(p=>({...p,[rule.id]:e.target.value}))}/></label>
  <button className="secondary" onClick={()=>{try{const next=approveActivityAllocation(preview!,approvalReasons[rule.id]??'');void save({...state,activityAllocationDecisions:[...decisions.filter(d=>d.ruleId!==rule.id),next]});setError('')}catch(e){setError(String(e))}}}>Godkänn fördelning</button></>}
  {decision&&<button className="secondary" onClick={()=>{void save({...state,activityAllocationDecisions:decisions.filter(d=>d.ruleId!==rule.id)})}}>Återkalla godkännande</button>}
  <button className="secondary" onClick={()=>{void save({...state,activityAllocationRules:rules.filter(r=>r.id!==rule.id),activityAllocationDecisions:decisions.filter(d=>d.ruleId!==rule.id)})}}>Ta bort regel</button>
  </section>;
 })}
 </section>;
}
