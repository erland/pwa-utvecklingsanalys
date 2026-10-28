import {useState} from 'react';
import type {AllocationPreview} from '../domain/activityAllocation';
import {uoBudget2027_30} from '../import/formats/uoBudget2027_30';

/** Ephemeral what-if preview; approval and persistence of overrides is a separate change. */
export default function LoAllocationDraft({preview}:{preview:AllocationPreview}){
 const [changes,setChanges]=useState<Record<string,string>>({});
 const adjusted=Object.keys(changes).length>0;
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
  <p>Pröva utvecklingsandel per LO. Ändrade andelar låses i beräkningen och övriga LO balanseras automatiskt utifrån sina timmar. Förhandsgranskningen sparas inte.</p>
  <div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>LO</th><th>Totalt</th><th>Utveckling %</th><th>Utveckling (h)</th><th>Förvaltning (h)</th></tr></thead>
  <tbody>{shown.items.map(item=>{
   const original=preview.items.find(x=>x.loId===item.loId)!;
   const pct=changes[item.loId]??String(original.total?Number((100*item.development/item.total).toFixed(2)):0);
   return <tr key={item.loId}><td>{item.loId}</td><td>{format(item.total)}</td><td><input type="number" min="0" max="100" step="0.1" style={{maxWidth:110}} aria-label={'Utvecklingsandel '+item.loId} value={pct} onChange={e=>setChanges(previous=>({...previous,[item.loId]:e.target.value}))}/></td><td>{format(item.development)}</td><td>{format(item.maintenance)}</td></tr>;
  })}</tbody></table></div>
  {problem&&<p role="alert">Fördelningen kan inte balanseras: {problem}</p>}
  <p role="status">UO-avstämning: utveckling {format(totalDev)} / {format(preview.uo.development)} h, förvaltning {format(totalMaint)} / {format(preview.uo.maintenance)} h – {aligned?'stämmer':'inte avstämd'}.</p>
  {adjusted&&<><p>Det här är ett osparat förslag. Eventuellt tidigare godkännande påverkas inte. Möjlighet att spara justeringar införs i nästa steg.</p><button className="secondary" onClick={()=>setChanges({})}>Återställ föreslagen fördelning</button></>}
 </div>;
}
