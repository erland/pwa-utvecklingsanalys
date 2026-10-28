import {useState} from 'react';
import type {AllocationPreview,ActivityAllocationDecision} from '../domain/activityAllocation';
import type {LoDevelopmentOverride} from '../import/formats/uoBudgetCompletion';
import {uoBudget2027_30} from '../import/formats/uoBudget2027_30';

/** Adjustments are persisted only when explicitly approved. */
export default function LoAllocationDraft({preview,decision,onApprove,quick=false,onApproved}:{preview:AllocationPreview;decision?:ActivityAllocationDecision;onApprove:(overrides:LoDevelopmentOverride[],reason:string)=>Promise<void>;quick?:boolean;onApproved?:()=>void}){
 const [changes,setChanges]=useState<Record<string,string>>(()=>Object.fromEntries((decision?.overrides??[]).map(o=>[o.loId,String(o.developmentPercent)])));
 const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);
 const [approvalError,setApprovalError]=useState('');
 const adjusted=Object.keys(changes).length>0;
 const overrides=Object.entries(changes).map(([loId,value])=>({loId,developmentPercent:Number(value)}));
 let shown=preview,problem='';
 try{
  const overrides=Object.entries(changes).map(([loId,value])=>{
   if(!value.trim())throw new Error('Ange en procentandel mellan 0 och 100.');
   return {loId,developmentPercent:Number(value)};
  });
  if(uoBudget2027_30.kind==='budget'&&uoBudget2027_30.completion){
   shown=uoBudget2027_30.completion(preview,overrides);
  }
 }catch(e){problem=e instanceof Error?e.message:String(e)}
 const totalDev=shown.items.reduce((sum,item)=>sum+item.development,0);
 const totalMaint=shown.items.reduce((sum,item)=>sum+item.maintenance,0);
 const aligned=!problem&&Math.abs(totalDev-preview.uo.development)<1e-6&&Math.abs(totalMaint-preview.uo.maintenance)<1e-6;
 const format=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 return <div>
  <p>Pröva utvecklingsandel per LO. Ändrade andelar balanseras automatiskt. Förslaget används i analysen först när du godkänner det.</p>
  <div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>LO</th><th>Totalt</th><th>Utveckling %</th><th>Utveckling (h)</th><th>Förvaltning (h)</th></tr></thead>
  <tbody>{shown.items.map(item=>{
   const original=preview.items.find(x=>x.loId===item.loId)!;
   const pct=changes[item.loId]??String(original.total?Number((100*item.development/item.total).toFixed(2)):0);
   return <tr key={item.loId}><td>{item.loId}</td><td>{format(item.total)}</td><td><input type="number" min="0" max="100" step="0.1" style={{maxWidth:110}} aria-label={'Utvecklingsandel '+item.loId} value={pct} onChange={e=>setChanges(previous=>({...previous,[item.loId]:e.target.value}))}/></td><td>{format(item.development)}</td><td>{format(item.maintenance)}</td></tr>;
  })}</tbody></table></div>
  {problem&&<p role="alert">Fördelningen kan inte balanseras: {problem}</p>}
  <p role="status">UO-avstämning: utveckling {format(totalDev)} / {format(preview.uo.development)} h, förvaltning {format(totalMaint)} / {format(preview.uo.maintenance)} h – {aligned?'stämmer':'inte avstämd'}.</p>
  {adjusted&&<button className="secondary" disabled={busy} onClick={()=>setChanges({})}>Återställ föreslagen fördelning</button>}
  {!quick&&<label>Godkännandemotivering<input aria-label={'godkännandemotivering '+preview.ruleId} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
  <button className="secondary" disabled={busy||!aligned||(!quick&&!reason.trim())} onClick={()=>{setBusy(true);setApprovalError('');void onApprove(overrides,quick?'Automatiskt avstämd LO-fördelning från importflödet':reason).then(()=>{setReason('');onApproved?.()}).catch(e=>setApprovalError(String(e))).finally(()=>setBusy(false))}}>{quick?(onApproved?'Spara fördelning och analysera':'Spara fördelning'):'Godkänn '+(adjusted?'justerad':'föreslagen')+' fördelning'}</button>
  {approvalError&&<p role="alert">Kunde inte godkänna: {approvalError}</p>}
  {decision?.overrides?.length?<p role="status">En manuellt justerad fördelning är sparad. Den gäller bara så länge källvärdena är oförändrade.</p>:null}
 </div>;
}
