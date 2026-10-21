import {useEffect,useState} from 'react';
import {loadSemantic,saveSemantic} from './semanticStore';
import {addRelation,checkRelation,processReach,type RelationKind} from './relations';
import type {Relation,SemanticDataset} from './semantic';
export default function RelationsView(){
 const[data,setData]=useState<SemanticDataset|null>(null),[message,setMessage]=useState(''),[year,setYear]=useState(2027);
 const[fromId,setFrom]=useState(''),[toId,setTo]=useState(''),[type,setType]=useState<RelationKind>('supports'),[fromDate,setFromDate]=useState('2027-01-01'),[toDate,setToDate]=useState('');
 useEffect(()=>{void loadSemantic().then(setData).catch(()=>setMessage('Kunde inte läsa lokala relationer.'))},[]);
 const draft={type,fromId,toId,validFrom:fromDate,...(toDate?{validTo:toDate}:{})};
 const errors=data?checkRelation(data,draft):[];
 const save=async()=>{if(!data||errors.length)return;try{const next=addRelation(data,draft);await saveSemantic(next);setData(next);setMessage('Relationen sparad.')}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte spara relationen.')}};
 const remove=async(id:string)=>{if(!data)return;const next={...data,relations:data.relations.filter(r=>r.id!==id)};try{await saveSemantic(next);setData(next);setMessage('Relationen borttagen.')}catch{setMessage('Kunde inte ta bort relationen.')}};
 const reach=data?processReach(data,year):null;
 const name=(id:string)=>data?.entities.find(e=>e.id===id)?.name??id;
 const kinds:Relation['type'][]=['supports','enables','performs','contains'];
 return <><div className="eyebrow">RELATIONER · DEV-007</div><h1>Koppla verksamhet och utveckling</h1><p className="lead">Registrera explicita tidsbundna kopplingar. Inga processer eller avdelningar kopplas automatiskt enbart genom namnlikhet.</p>
 {!data?<p>Hämtar relationer…</p>:<><section className="panel"><h2>Ny relation</h2>
 <div className="mapping-grid"><label>Från objekt<select aria-label="Från objekt" value={fromId} onChange={e=>setFrom(e.target.value)}><option value="">Välj objekt</option>{data.entities.map(e=><option key={e.id} value={e.id}>{e.name} ({e.kind})</option>)}</select></label>
 <label>Relationsslag<select aria-label="Relationsslag" value={type} onChange={e=>setType(e.target.value as RelationKind)}>{kinds.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
 <label>Till objekt<select aria-label="Till objekt" value={toId} onChange={e=>setTo(e.target.value)}><option value="">Välj objekt</option>{data.entities.map(e=><option key={e.id} value={e.id}>{e.name} ({e.kind})</option>)}</select></label>
 <label>Giltig från<input aria-label="Giltig från" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label>
 <label>Giltig till (valfritt)<input aria-label="Giltig till (valfritt)" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label></div>
 {fromId&&toId&&errors.length>0&&<p role="alert">Ogiltig koppling: {errors.join(', ')}</p>}
 <button className="primary" disabled={errors.length>0} onClick={()=>{void save()}}>Spara relation</button></section>
 <section className="panel"><h2>Registrerade relationer</h2>{data.relations.length===0?<p>Inga relationer ännu.</p>:<div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>Från</th><th>Relation</th><th>Till</th><th>Giltig</th><th></th></tr></thead><tbody>{data.relations.map(r=><tr key={r.id}><td>{name(r.fromId)}</td><td>{r.type}</td><td>{name(r.toId)}</td><td>{r.validFrom} – {r.validTo??'tills vidare'}</td><td><button className="secondary" onClick={()=>{void remove(r.id)}} aria-label={'Ta bort '+r.id}>Ta bort</button></td></tr>)}</tbody></table></div>}</section>
 <section className="panel"><h2>Processer som stöds</h2><label>Analysår<input aria-label="Relationsår" type="number" min="2000" max="2100" value={year} onChange={e=>setYear(Number(e.target.value))}/></label>
 <div className="cards two"><div className="metric"><span>Unika processer</span><b>{reach?.processCount??0}</b></div><div className="metric"><span>Unika processtimmar</span><b>{reach?.totalHours??0} h</b></div></div>
 <p>{reach?.relationCount??0} aktiva stödrelationer, {reach?.departmentIds.length??0} avdelningar. Processer och timmar räknas endast en gång per källa även vid överlappande kopplingar.</p>
 </section></>}
 {message&&<p role="status">{message}</p>}</>;
}
