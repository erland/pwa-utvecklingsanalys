import {useState} from 'react';
import {analyzeCanonical} from './canonicalQuery';
import ComparisonResults from './ComparisonResults';
import {uoActivityRows} from './activityBreakdown';
import {visiblePartRows} from './organizationContext';
import type {CanonicalDataset,Metric,Activity} from '../domain/canonical';
import type {GapState} from '../gaps/store';

/** Build navigation from the complete budget, not only the selected activity.
 * A missing split is unknown (null), while a genuine 0%-activity split remains zero.
 */
export function visibleUoDetailRows(data:CanonicalDataset,state:GapState,metrics:Metric[],year:number|undefined,uoId:string,activity:Activity|'all'|'allocated'){
 const query={axis:'work' as const,metrics,year,detailUoId:uoId};
 const original=analyzeCanonical(data,state,{...query,activity:'all'}).rows;
 const selected=activity==='all'?original:analyzeCanonical(data,state,{...query,activity}).rows;
 const unknown=activity==='all'?[]:analyzeCanonical(data,state,{...query,activity:'unknown'}).rows;
 const selectedById=new Map(selected.map(row=>[row.key,row.value]));
 const unknownById=new Map(unknown.map(row=>[row.key,row.value]));
 const splits=activity==='all'?uoActivityRows(data,state,metrics,year,uoId):{};
 return original.map(row=>({
  key:row.key,label:row.label,
  value:selectedById.get(row.key)??null,
  ...(activity==='all'?{split:splits[row.key]}:{}),
  ...(activity!=='all'?{unallocated:unknownById.get(row.key)??0}:{})
 }));
}

/** Treat UO overhead as a display sibling of LOs, never as an actual LO identity. */
export default function UoDetailBreakdown({data,state,metrics,activity,year,selectedUoId,selectedPartId,onPartSelect}:{data:CanonicalDataset;state:GapState;metrics:Metric[];activity:Activity|'all'|'allocated';year?:number;selectedUoId?:string;selectedPartId?:string;onPartSelect?:(partId?:string)=>void}){
 const [localUoId,setLocalUoId]=useState('');
 const uoId=selectedUoId??localUoId;
 const uos=[...new Set(data.records.filter(r=>r.scope.axis==='work').map(r=>r.scope.axis==='work'?r.scope.uoId:''))].filter(Boolean).sort();
 let result:ReturnType<typeof analyzeCanonical>|null=null,error='';
 let rows:ReturnType<typeof visibleUoDetailRows>=[];
 if(uoId&&metrics.length){
  try{result=analyzeCanonical(data,state,{axis:'work',metrics,activity,year,detailUoId:uoId});rows=visibleUoDetailRows(data,state,metrics,year,uoId,activity)}
  catch(e){error=String(e)}
 }
 return <section aria-label="Detaljer per UO">
  <h3>LO och UO Övergripande</h3>
  <p>Välj ett UO för att jämföra dess LO och UO Övergripande på samma nivå. UO Övergripande är en separat delpost, inte ett LO.</p>
  {selectedUoId===undefined&&<label>UO för detaljanalys<select aria-label="UO för detaljanalys" value={uoId} onChange={e=>setLocalUoId(e.target.value)}>
   <option value="">Välj UO</option>{uos.map(id=><option key={id} value={id}>{decodeURIComponent(id.slice(3))}</option>)}
  </select></label>}
  {error&&<p role="alert">{error}</p>}
  {result&&<>{selectedPartId&&<button type="button" className="secondary" onClick={()=>onPartSelect?.(undefined)}>Visa alla LO och UO Övergripande</button>}<ComparisonResults title={selectedPartId?'Vald delpost':'LO och UO Övergripande'} totalLabel={selectedPartId?'Totalt vald delpost':'Totalt UO'} unit={result.unit} rows={visiblePartRows(rows,{level:selectedPartId?'part':'uo',uoId,partId:selectedPartId})} onOpen={selectedPartId?undefined:onPartSelect}/>
  {result.unknownCount>0&&<p role="status">Aktivitetsfördelningen är ofullständig för {result.unknownCount} underlag. Saknade värden visas inte som noll.</p>}
  </>}
 </section>;
}
