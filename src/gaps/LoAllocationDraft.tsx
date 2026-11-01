import {useRef,useState} from 'react';
import {applySharedPercentages,approveBalancedActivityGroup,type AllocationPreview,type ActivityAllocationDecision} from '../domain/activityAllocation';
import type {LoDevelopmentOverride} from '../import/formats/uoBudgetCompletion';
import {uoBudget2027_30} from '../import/formats/uoBudget2027_30';
import {rebalanceUoBudgetAllocation} from '../import/formats/uoBudgetCompletion';

/** Human-readable labels; canonical identifiers remain unchanged in persisted overrides. */
export function allocationLabel(id:string):string{
 if(id.startsWith('uo-overhead:'))return 'UO Övergripande';
 const encoded=id.startsWith('lo:')?id.split(':').slice(2).join(':'):id;
 try{return decodeURIComponent(encoded)}catch{return encoded}
}

/** Intersection of feasible shares across the selected years; imported LO shares remain fixed. */
export function feasibleLoPercentRange(previews:readonly AllocationPreview[],loId:string):{min:number;max:number}{
 let min=0,max=100;
 for(const preview of previews){
  const item=preview.items.find(i=>i.loId===loId);
  if(!item||item.total<=0)continue;
  const locks=new Map((preview.lockedLo??[]).map(lock=>[lock.loId,lock]));
  if(locks.has(loId))continue;
  const fixed=[...locks.values()].reduce((n,v)=>n+v.development,0);
  const freeOthers=preview.items.filter(i=>i.loId!==loId&&!locks.has(i.loId)).reduce((n,i)=>n+i.total,0);
  const target=preview.uo.development-fixed;
  min=Math.max(min,100*Math.max(0,target-freeOthers)/item.total);
  max=Math.min(max,100*Math.min(item.total,target)/item.total);
 }
 return {min:Math.max(0,Math.min(100,min)),max:Math.max(0,Math.min(100,max))};
}

/** Adjustments are persisted only when explicitly approved. */
export default function LoAllocationDraft({preview,decision,onApprove,quick=false,onApproved,sharedMode=false,balancedPreviews,cards=false,onlyLoId,autoSave=false}:{preview:AllocationPreview;decision?:ActivityAllocationDecision;onApprove:(overrides:LoDevelopmentOverride[],reason:string)=>Promise<void>;quick?:boolean;onApproved?:()=>void;sharedMode?:boolean;balancedPreviews?:AllocationPreview[];cards?:boolean;onlyLoId?:string;autoSave?:boolean}){
 const [changes,setChanges]=useState<Record<string,string>>(()=>autoSave?{}:Object.fromEntries((decision?.overrides??[]).map(o=>[o.loId,String(o.developmentPercent)])));
 const pending=useRef<Record<string,string>>({});
 const saving=useRef(false);
 const saveOnRelease=async()=>{
  if(!autoSave||saving.current||!Object.keys(pending.current).length)return;
  const requested=Object.entries(pending.current).map(([loId,value])=>({loId,developmentPercent:Number(value)}));
  pending.current={};saving.current=true;setBusy(true);setApprovalError('');
  try{await onApprove(requested,'Automatiskt avstämd LO-fördelning från Fördelningar');setChanges({})}
  catch(e){setApprovalError(e instanceof Error?e.message:String(e))}
  finally{saving.current=false;setBusy(false)}
 };
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
  const completion=uoBudget2027_30.kind==='budget'?uoBudget2027_30.completion:undefined;
  // The built-in Alla card may already contain a validated, weighted snapshot of saved decisions.
  // Do not replace it with an unedited source rebalance until the user moves the slider.
  if(completion&&(!cards||!balancedPreviews?.length||Object.keys(changes).length>0)){
   shown=balancedPreviews?.length?(()=>{
    approveBalancedActivityGroup(balancedPreviews,'Förhandsgranskning',overrides);
    const results=balancedPreviews.map(p=>rebalanceUoBudgetAllocation(p,overrides,p.lockedLo??[]));
    const items=new Map<string,AllocationPreview['items'][number]>();
    for(const result of results)for(const item of result.items){
     const old=items.get(item.loId);
     items.set(item.loId,old?{...old,total:old.total+item.total,development:old.development+item.development,maintenance:old.maintenance+item.maintenance}:item);
    }
    return {...preview,items:[...items.values()],uo:{development:results.reduce((n,p)=>n+p.uo.development,0),maintenance:results.reduce((n,p)=>n+p.uo.maintenance,0)}};
   })():sharedMode?applySharedPercentages(preview,overrides):completion(preview,overrides);
  }
 }catch(e){problem=e instanceof Error?e.message:String(e)}
 const totalDev=shown.items.reduce((sum,item)=>sum+item.development,0);
 const totalMaint=shown.items.reduce((sum,item)=>sum+item.maintenance,0);
 const aligned=!problem&&(Boolean(balancedPreviews?.length)||sharedMode||Math.abs(totalDev-preview.uo.development)<1e-6&&Math.abs(totalMaint-preview.uo.maintenance)<1e-6);
 const format=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 return <div>
  {!cards&&<p>Justera utvecklingsandelen med reglaget eller ange procenten direkt. Förvaltningen är återstående andel. Övriga delområden balanseras automatiskt mot UO:s totalsumma.</p>}
  {!cards?<div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>LO / UO Övergripande</th><th>Totalt</th><th>Utveckling %</th><th>Utveckling (h)</th><th>Förvaltning (h)</th></tr></thead>
  <tbody>{shown.items.filter(item=>!onlyLoId||item.loId===onlyLoId).map(item=>{
   const original=preview.items.find(x=>x.loId===item.loId)!;
   const isLocked=Boolean(balancedPreviews?.some(p=>p.lockedLo?.some(lock=>lock.loId===item.loId))||preview.lockedLo?.some(lock=>lock.loId===item.loId));
   const pct=changes[item.loId]??String(original.total?Number((100*item.development/item.total).toFixed(2)):0);
   return <tr key={item.loId}><td>{allocationLabel(item.loId)}{isLocked?' · Importerad, låst':''}</td><td>{format(item.total)}</td><td><div style={{display:'flex',alignItems:'center',gap:8,minWidth:210}}><input type="range" min="0" max="100" step="0.1" style={{flex:1,minWidth:90}} aria-label={'Reglage utvecklingsandel '+allocationLabel(item.loId)} disabled={isLocked} value={pct} onChange={e=>setChanges(previous=>({...previous,[item.loId]:e.target.value}))}/><input type="number" min="0" max="100" step="0.1" style={{maxWidth:75}} aria-label={'Utvecklingsandel '+item.loId} disabled={isLocked} value={pct} onChange={e=>setChanges(previous=>({...previous,[item.loId]:e.target.value}))}/><span aria-hidden="true">%</span></div></td><td>{format(item.development)}</td><td>{format(item.maintenance)}</td></tr>;
  })}</tbody></table></div>:<div aria-label="LO-reglage" style={{display:'grid',gap:10}}>{shown.items.filter(item=>!onlyLoId||item.loId===onlyLoId).map(item=>{
   const isLocked=Boolean(balancedPreviews?.some(p=>p.lockedLo?.some(lock=>lock.loId===item.loId))||preview.lockedLo?.some(lock=>lock.loId===item.loId));
   const pct=changes[item.loId]??String(item.total?Number((100*item.development/item.total).toFixed(2)):0);
   const limits=autoSave?feasibleLoPercentRange(balancedPreviews??[preview],item.loId):{min:0,max:100};
   const clamp=(raw:string)=>String(Number(Math.min(limits.max,Math.max(limits.min,Number(raw))).toFixed(4)));
   return <div key={item.loId}>
    {!onlyLoId&&<strong>{allocationLabel(item.loId)}</strong>}
    {isLocked?<div role="img" aria-label={'Låst fördelning '+allocationLabel(item.loId)} style={{display:'flex',height:14,overflow:'hidden',borderRadius:8,background:'#e2e8f0',marginTop:12}}><span style={{width:(item.total?100*item.development/item.total:0)+'%',background:'#2563eb'}}/><span style={{flex:1,background:'#0d9488'}}/></div>:<input type="range" step="any" style={{display:'block',width:'100%',marginTop:12}} aria-label={'Reglage utvecklingsandel '+allocationLabel(item.loId)} value={pct} min={limits.min} max={limits.max} disabled={busy||limits.max<limits.min} onChange={e=>{const value=autoSave?clamp(e.target.value):e.target.value;setChanges(previous=>({...previous,[item.loId]:value}));if(autoSave)pending.current={[item.loId]:value}}} onPointerUp={()=>void saveOnRelease()} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))void saveOnRelease()}} onBlur={()=>void saveOnRelease()}/>}
    {!isLocked&&<label>Utveckling (%) <input type="number" step="0.1" aria-label={'Utvecklingsandel '+item.loId} min={limits.min} max={limits.max} value={pct} onChange={e=>{const value=autoSave?clamp(e.target.value):e.target.value;setChanges(previous=>({...previous,[item.loId]:value}));if(autoSave)pending.current={[item.loId]:value}}} onBlur={()=>void saveOnRelease()} onKeyDown={e=>{if(e.key==='Enter')void saveOnRelease()}}/></label>}
    <p>Utveckling: {format(item.development)} h · Förvaltning: {format(item.maintenance)} h</p>
   </div>;
  })}</div>}
  {problem&&!autoSave&&<p role="alert">Fördelningen kan inte balanseras: {problem}</p>}
  {!cards&&<p role="status">UO-avstämning: utveckling {format(totalDev)} / {format(preview.uo.development)} h, förvaltning {format(totalMaint)} / {format(preview.uo.maintenance)} h – {aligned?'stämmer':'inte avstämd'}.</p>}
  {adjusted&&!autoSave&&<button className="secondary" disabled={busy} onClick={()=>setChanges({})}>Återställ föreslagen fördelning</button>}
  {!quick&&<label>Godkännandemotivering<input aria-label={'godkännandemotivering '+preview.ruleId} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
  {!autoSave&&<button className="secondary" disabled={busy||!aligned||(!quick&&!reason.trim())} onClick={()=>{setBusy(true);setApprovalError('');void onApprove(sharedMode&&!balancedPreviews?.length?shown.items.map(item=>({loId:item.loId,developmentPercent:item.total?100*item.development/item.total:0})):overrides,quick?'Automatiskt avstämd LO-fördelning från importflödet':reason).then(()=>{setReason('');onApproved?.()}).catch(e=>setApprovalError(String(e))).finally(()=>setBusy(false))}}>{quick?(onApproved?'Spara fördelning och analysera':'Spara LO-fördelning'):'Godkänn '+(adjusted?'justerad':'föreslagen')+' fördelning'}</button>}
  {approvalError&&<p role="alert">Kunde inte godkänna: {approvalError}</p>}
  {!autoSave&&decision?.overrides?.length?<p role="status">En manuellt justerad fördelning är sparad. Den gäller bara så länge källvärdena är oförändrade.</p>:null}
 </div>;
}
