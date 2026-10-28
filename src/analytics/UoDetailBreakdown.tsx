import {useState} from 'react';
import {analyzeCanonical} from './canonicalQuery';
import type {CanonicalDataset,Metric,Activity} from '../domain/canonical';
import type {GapState} from '../gaps/store';

/** Treat UO overhead as a display sibling of LOs, never as an actual LO identity. */
export default function UoDetailBreakdown({data,state,metrics,activity,year,selectedUoId}:{data:CanonicalDataset;state:GapState;metrics:Metric[];activity:Activity|'all';year?:number;selectedUoId?:string}){
 const [localUoId,setLocalUoId]=useState('');
 const uoId=selectedUoId??localUoId;
 const uos=[...new Set(data.records.filter(r=>r.scope.axis==='work').map(r=>r.scope.axis==='work'?r.scope.uoId:''))].filter(Boolean).sort();
 let result:ReturnType<typeof analyzeCanonical>|null=null,error='';
 if(uoId&&metrics.length){
  try{result=analyzeCanonical(data,state,{axis:'work',metrics,activity,year,detailUoId:uoId})}
  catch(e){error=String(e)}
 }
 const format=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 return <section aria-label="Detaljer per UO">
  <h3>LO och UO Övergripande</h3>
  <p>Välj ett UO för att jämföra dess LO och UO Övergripande på samma nivå. UO Övergripande är en separat delpost, inte ett LO.</p>
  {selectedUoId===undefined&&<label>UO för detaljanalys<select aria-label="UO för detaljanalys" value={uoId} onChange={e=>setLocalUoId(e.target.value)}>
   <option value="">Välj UO</option>{uos.map(id=><option key={id} value={id}>{decodeURIComponent(id.slice(3))}</option>)}
  </select></label>}
  {error&&<p role="alert">{error}</p>}
  {result&&<><div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="LO och UO Övergripande"><thead><tr><th>Delområde</th><th>Värde</th><th>Andel av UO</th></tr></thead><tbody>
   {result.rows.map(row=><tr key={row.key}><th scope="row">{row.label}</th><td>{format(row.value)} {result!.unit}</td><td>{result!.total?format(100*row.value/result!.total)+' %':'–'}</td></tr>)}
  </tbody><tfoot><tr><th scope="row">Totalt UO</th><td>{format(result.total)} {result.unit}</td><td>{result.total?'100 %':'–'}</td></tr></tfoot></table></div>
  {result.unknownCount>0&&<p role="status">Aktivitetsfördelningen är ofullständig för {result.unknownCount} underlag. Saknade värden visas inte som noll.</p>}
  </>}
 </section>;
}
