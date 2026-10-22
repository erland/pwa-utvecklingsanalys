import {approvalFromPreview,distributionSignature,evaluateApprovals} from './approved';
import {useMemo,useState} from 'react';
import type {SemanticDataset} from '../domain/semantic';
import {calculateDistribution,type DistributionRule} from './distribution';
import type {GapState} from './store';
type Props={data:SemanticDataset;state:GapState;save:(next:GapState)=>Promise<void>};
export default function DistributionRules({data,state,save}:Props){
 const [reqId,setReqId]=useState(''),[year,setYear]=useState(2027),[activity,setActivity]=useState(''),[weightId,setWeightId]=useState('it_hours'),[reason,setReason]=useState(''),[error,setError]=useState('');
 const candidates=state.requirements.filter(r=>r.entityKind==='lo');
 const selected=candidates.find(r=>r.id===reqId)??candidates[0];
 const rules=state.rules??[];
 const approvals=evaluateApprovals(data,state);
 const previews=useMemo(()=>rules.map(rule=>{
  const requirement=state.requirements.find(r=>r.id===rule.requirementId);
  if(!requirement)return {rule,error:'Informationskravet har tagits bort'};
  try{return {rule,preview:calculateDistribution(data,requirement,rule,state.resolutions)}}
  catch(e){return {rule,error:e instanceof Error?e.message:String(e)}}
 }),[data,state.requirements,state.resolutions,rules]);
 const create=()=>{
  if(!selected)return;
  if(!reason.trim()){setError('Ange varför denna fördelning är lämplig.');return}
  const rule:DistributionRule={id:crypto.randomUUID(),requirementId:selected.id,year,activity:activity||selected.activities[0],weightMeasureId:weightId,reason:reason.trim()};
  try{
   calculateDistribution(data,selected,rule,state.resolutions);
   if(rules.some(r=>r.requirementId===rule.requirementId&&r.year===rule.year&&r.activity===rule.activity))throw new Error('En regel finns redan för samma krav, år och aktivitet');
   setError('');void save({...state,rules:[...rules,rule]});
  }catch(e){setError(e instanceof Error?e.message:String(e))}
 };
 return <section className="panel"><h2>Fördelningsregler</h2><p>Fördela årsuppgifter på UO-nivå till underliggande LO utifrån ett befintligt mått. Beräkningen visas som ett separat förslag och påverkar aldrig källobservationer eller totalsummor. Vid ändrade källor räknas förslaget om eller markeras som ogiltigt.</p>
 {error&&<p role="alert">{error}</p>}
 <label>Informationskrav på LO-nivå<select aria-label="Fördelningskrav" value={selected?.id??''} onChange={e=>{setReqId(e.target.value);setActivity('');const next=candidates.find(r=>r.id===e.target.value);if(next)setYear(next.years[0])}}>{candidates.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
 {selected&&<><label>År<select aria-label="Fördelningsår" value={selected.years.includes(year)?year:selected.years[0]} onChange={e=>setYear(Number(e.target.value))}>{selected.years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
 <label>Dimension<select aria-label="Fördelningsaktivitet" value={activity||selected.activities[0]} onChange={e=>setActivity(e.target.value)}>{selected.activities.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
 <label>Fördelningsnyckel<select aria-label="Viktmått" value={weightId} onChange={e=>setWeightId(e.target.value)}>{data.measures.filter(m=>m.aggregation==='sum').map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
 <label>Motivering<input aria-label="Fördelningsmotivering" value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <button className="primary" onClick={create}>Skapa och kontrollera fördelningsregel</button></>}
 {previews.length===0?<p>Inga fördelningsregler definierade.</p>:previews.map(({rule,...out})=><div key={rule.id} className="mapping-settings"><h3>{state.requirements.find(r=>r.id===rule.requirementId)?.name??rule.requirementId} · {rule.year} · {rule.activity}</h3><p>{rule.reason} · Nyckel: {data.measures.find(m=>m.id===rule.weightMeasureId)?.label??rule.weightMeasureId}</p>
 {'error'in out&&out.error?<p role="alert">Regeln kan inte användas: {out.error}. Granska källor eller kompletteringar.</p>:out.preview&&<><p data-testid="distribution-total">UO-källa: {out.preview.sourceTotal.toLocaleString('sv-SE')} · LO-fördelning: {out.preview.allocatedTotal.toLocaleString('sv-SE')}</p><table className="analysis-table"><thead><tr><th>LO</th><th>Vikt</th><th>Härlett värde</th></tr></thead><tbody>{out.preview.items.map(item=><tr key={item.key}><td>{item.entityName}</td><td>{item.weight.toLocaleString('sv-SE')}</td><td>{item.value.toLocaleString('sv-SE',{maximumFractionDigits:3})}</td></tr>)}</tbody></table></>}
 {(()=>{const approved=approvals.find(a=>a.approval.ruleId===rule.id);return <div><p role="status">{!approved?'Inte godkänd':approved.status==='current'?'Godkänd och aktuell':'Tidigare godkännande ogiltigt: '+approved.reason}</p>{'preview'in out&&out.preview&&<button className="primary" onClick={()=>{void save({...state,approvals:[...(state.approvals??[]).filter(a=>a.ruleId!==rule.id),approvalFromPreview(out.preview!,distributionSignature(rule,state.requirements.find(r=>r.id===rule.requirementId)!))]})}}>{approved?'Godkänn om uppdaterad fördelning':'Godkänn fördelning'}</button>}{approved&&<button className="secondary" onClick={()=>{void save({...state,approvals:(state.approvals??[]).filter(a=>a.ruleId!==rule.id)})}}>Återkalla godkännande</button>}</div>})()}
 <button className="secondary" onClick={()=>{void save({...state,rules:rules.filter(r=>r.id!==rule.id),approvals:(state.approvals??[]).filter(a=>a.ruleId!==rule.id)})}}>Ta bort regel</button></div>)}</section>;
}
