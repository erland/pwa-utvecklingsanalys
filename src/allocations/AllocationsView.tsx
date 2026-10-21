import {useEffect,useState} from 'react';
import {loadSemantic} from '../domain/semanticStore';
import type {Entity} from '../domain/semantic';
import {loadAllocations,saveAllocations} from './store';
import {createDimension,effectiveAllocation,setAllocation,weightedAllocation,type Allocations,type Basis} from './model';
export default function AllocationsView(){
 const [data,setData]=useState<Allocations|null>(null),[entities,setEntities]=useState<Entity[]>([]),[name,setName]=useState(''),[categories,setCategories]=useState(''),[basis,setBasis]=useState<Basis>('manual');
 const [dimensionId,setDimension]=useState(''),[uoId,setUo]=useState(''),[loId,setLo]=useState(''),[year,setYear]=useState(2027),[weights,setWeights]=useState<Record<string,string>>({}),[percentages,setPercentages]=useState<Record<string,string>>({}),[message,setMessage]=useState('');
 useEffect(()=>{void Promise.all([loadAllocations(),loadSemantic()]).then(([a,s])=>{setData(a);setEntities(s.entities)}).catch(()=>setMessage('Kunde inte läsa fördelningsdata.'))},[]);
 const dimension=data?.dimensions.find(d=>d.id===dimensionId);
 const uos=entities.filter(e=>e.kind==='uo'),los=entities.filter(e=>e.kind==='lo'&&e.parentId===uoId);
 const effective=data&&dimension&&uoId?effectiveAllocation(data,dimensionId,uoId,loId||undefined,year):null;
 const persist=async(next:Allocations)=>{await saveAllocations(next);setData(next)};
 const create=async()=>{if(!data)return;try{const next=createDimension(data,name,categories.split(';').map(x=>x.trim()),basis);await persist(next);setDimension(next.dimensions[next.dimensions.length-1].id);setName('');setCategories('');setMessage('Fördelningstyp sparad.')}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte skapa fördelningen.')}};
 const save=async()=>{if(!data||!dimension||!uoId)return;try{const values=Object.fromEntries(dimension.categories.map(c=>[c.id,Number(percentages[c.id]??(effective?.values.find(v=>v.id===c.id)?.percent??0))]));const next=setAllocation(data,{dimensionId,entityId:loId||uoId,year,percentages:values,origin:loId?'lo-override':'uo-proposal',source:'user'});await persist(next);setMessage('Fördelningen sparad.')}catch(e){setMessage(e instanceof Error?e.message:'Ogiltig fördelning.')}};
 const itemWeights=los.map(lo=>({uoId,loId:lo.id,weight:Number(weights[lo.id]??0)}));
 let weighted:ReturnType<typeof weightedAllocation>|null=null;try{if(data&&dimension&&uoId)weighted=weightedAllocation(data,dimensionId,year,itemWeights)}catch{weighted=null}
 return <><div className="eyebrow">FÖRDELNINGAR · DEV-008</div><h1>Egna fördelningstyper</h1><p className="lead">Skapa kategorier, ange UO-förslag och överstyr dem på LO-nivå. Ofördelad andel visas alltid separat.</p>
 <section className="panel"><h2>Skapa fördelningstyp</h2><div className="mapping-grid"><label>Namn<input aria-label="Fördelningsnamn" value={name} onChange={e=>setName(e.target.value)}/></label><label>Kategorier (separera med semikolon)<input aria-label="Fördelningskategorier" value={categories} onChange={e=>setCategories(e.target.value)} placeholder="Utveckling; Förvaltning"/></label><label>Fördelningsbas<select aria-label="Fördelningsbas" value={basis} onChange={e=>setBasis(e.target.value as Basis)}><option value="manual">Manuell</option><option value="business_hours">Verksamhetstimmar</option><option value="it_hours">IT-timmar</option><option value="fte">FTE</option><option value="headcount">Antal anställda</option></select></label></div><button className="primary" disabled={!data||!name.trim()||!categories.trim()} onClick={()=>{void create()}}>Skapa fördelningstyp</button></section>
 {data&&<section className="panel"><h2>Fördelning och förslag</h2><div className="mapping-grid">
 <label>Fördelningstyp<select aria-label="Välj fördelningstyp" value={dimensionId} onChange={e=>{setDimension(e.target.value);setPercentages({})}}><option value="">Välj fördelningstyp</option>{data.dimensions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
 <label>UO<select aria-label="Välj UO" value={uoId} onChange={e=>{setUo(e.target.value);setLo('');setPercentages({})}}><option value="">Välj UO</option>{uos.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
 <label>LO (valfritt – överstyrning)<select aria-label="Välj LO" value={loId} onChange={e=>{setLo(e.target.value);setPercentages({})}}><option value="">UO-förslag</option>{los.map(lo=><option key={lo.id} value={lo.id}>{lo.name}</option>)}</select></label>
 <label>År<input aria-label="Fördelningsår" type="number" min="2000" max="2100" value={year} onChange={e=>{setYear(Number(e.target.value));setPercentages({})}}/></label></div>
 {dimension&&effective&&<><p>Aktuellt ursprung: {effective.origin==='lo-override'?'LO-överstyrning':effective.origin==='uo-proposal'?'UO-förslag':'Ingen fördelning ännu'}.</p>
 <div className="mapping-grid">{dimension.categories.map(c=><label key={c.id}>{c.name} (%)<input aria-label={c.name+' procent'} type="number" min="0" max="100" step="0.1" value={percentages[c.id]??String(effective.values.find(v=>v.id===c.id)?.percent??0)} onChange={e=>setPercentages(p=>({...p,[c.id]:e.target.value}))}/></label>)}</div>
 <p>Ofördelat: {Math.max(0,100-dimension.categories.reduce((sum,c)=>sum+Number(percentages[c.id]??(effective.values.find(v=>v.id===c.id)?.percent??0)),0)).toLocaleString('sv-SE')} %</p>
 <button className="primary" onClick={()=>{void save()}}>Spara fördelning</button></>}
 </section>}
 {dimension&&uoId&&los.length>0&&<section className="panel"><h2>Viktad sammanställning per LO</h2><p>Välj vikt per LO enligt vald bas. En LO räknas en gång; UO-förslaget används om LO inte har en egen överstyrning.</p><div className="mapping-grid">{los.map(lo=><label key={lo.id}>{lo.name}, vikt<input aria-label={'Vikt '+lo.name} type="number" min="0" value={weights[lo.id]??'0'} onChange={e=>setWeights(w=>({...w,[lo.id]:e.target.value}))}/></label>)}</div>
 {weighted&&<><p>Vikt totalt: {weighted.totalWeight}. Ofördelat: {weighted.unallocatedWeight.toLocaleString('sv-SE')}.</p><table className="analysis-table"><thead><tr><th>Kategori</th><th>Viktad mängd</th><th>Andel</th></tr></thead><tbody>{dimension.categories.map(c=><tr key={c.id}><td>{c.name}</td><td>{weighted?.amounts[c.id].toLocaleString('sv-SE')}</td><td>{weighted?.percentages[c.id].toLocaleString('sv-SE')} %</td></tr>)}</tbody></table></>}
 </section>}
 {message&&<p role="status">{message}</p>}</>;
}
