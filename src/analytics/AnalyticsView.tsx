import {useEffect,useMemo,useState} from 'react';
import {loadSemantic} from '../domain/semanticStore';
import type {SemanticDataset} from '../domain/semantic';
import {analyze,type GroupBy} from './query';
export default function AnalyticsView({refreshKey}:{refreshKey:number}){
 const [data,setData]=useState<SemanticDataset|null>(null),[error,setError]=useState('');
 const [measureId,setMeasureId]=useState('it_hours'),[year,setYear]=useState('all'),[groupBy,setGroupBy]=useState<GroupBy>('uo'),[datasets,setDatasets]=useState<string[]>([]),[uos,setUos]=useState<string[]>([]);
 useEffect(()=>{let active=true;loadSemantic().then(d=>{if(active){setData(d);setError('')}}).catch(()=>{if(active)setError('Kunde inte läsa importerade analysdata.')});return()=>{active=false}},[refreshKey]);
 const sources=useMemo(()=>[...new Map((data?.observations??[]).map(o=>[o.source.datasetId,o.source.fileName])).entries()],[data]);
 const units=useMemo(()=>data?.entities.filter(e=>e.kind==='uo')??[],[data]);
 const years=useMemo(()=>[...new Set((data?.observations??[]).map(o=>o.period.year))].sort(),[data]);
 const query=useMemo(()=>({measureId,year:year==='all'?undefined:Number(year),datasetIds:datasets.length?datasets:undefined,uoIds:uos.length?uos:undefined,groupBy}),[measureId,year,datasets,uos,groupBy]);
 let outcome:ReturnType<typeof analyze>|null=null;
 try{if(data)outcome=analyze(data,query)}catch{outcome=null}
 const chosenMeasure=data?.measures.find(m=>m.id===measureId);
 const toggle=(id:string,selection:string[],set:(x:string[])=>void)=>set(selection.includes(id)?selection.filter(x=>x!==id):[...selection,id]);
 const fmt=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 return <><div className="eyebrow">ANALYS · IMPORTERADE DATA</div><h1>Analysera utvecklingsbehoven</h1><p className="lead">Resultaten baseras på godkända importer i webbläsaren. Varje mått visas separat och källornas totalrader räknas inte dubbelt.</p>
 {error&&<p role="alert">{error}</p>}
 {!data?<p>Hämtar analysdata…</p>:!data.observations.length?<section className="panel"><h2>Inga importerade analysvärden ännu</h2><p>Gå till Import och godkänn en Excel-fil. Demoanalysen visas inte som verkliga uppgifter.</p></section>:
 <div className="analysis-layout"><section className="panel filters">
 <h2>Välj analys</h2><label htmlFor="measure">Mått</label><select id="measure" value={measureId} onChange={e=>setMeasureId(e.target.value)}>{data.measures.map(m=><option value={m.id} key={m.id}>{m.label} ({m.unit})</option>)}</select>
 <label htmlFor="year">År</label><select id="year" value={year} onChange={e=>setYear(e.target.value)}><option value="all">Alla år</option>{years.map(y=><option value={y} key={y}>{y}</option>)}</select>
 <label htmlFor="grouping">Gruppera efter</label><select id="grouping" value={groupBy} onChange={e=>setGroupBy(e.target.value)}><option value="uo">Utvecklingsområde</option><option value="entity">LO / källaobjekt</option><option value="year">År</option><option value="source">Källfil</option></select>
 <fieldset><legend>Datakällor (ingen vald = alla)</legend>{sources.map(([id,name])=><label key={id} className="check"><input type="checkbox" checked={datasets.includes(id)} onChange={()=>toggle(id,datasets,setDatasets)}/>{name}</label>)}</fieldset>
 <fieldset><legend>Utvecklingsområden (ingen vald = alla)</legend>{units.map(u=><label key={u.id} className="check"><input type="checkbox" checked={uos.includes(u.id)} onChange={()=>toggle(u.id,uos,setUos)}/>{u.name}</label>)}</fieldset>
 </section><section className="panel results"><h2>Resultat</h2>{outcome?<><div className="result-head"><div><span>Totalt {chosenMeasure?.label.toLowerCase()}</span><strong>{fmt(outcome.total)} {outcome.unit}</strong></div><span className="pill">{outcome.included} detaljvärden</span></div>
 <p className="notice">{outcome.excluded} summeringar, delmängder eller dubbletter exkluderade inom aktuellt urval.</p><div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>Gruppering</th><th>Värde</th><th>Källposter</th></tr></thead><tbody>{outcome.rows.map(r=><tr key={r.key}><td>{r.label}</td><td>{fmt(r.value)} {outcome?.unit}</td><td>{r.count}</td></tr>)}</tbody></table></div>
 {outcome.rows.map(r=><div key={r.key} className="bar-row"><div className="bar-label"><span>{r.label}</span><b>{fmt(r.value)} {outcome?.unit}</b></div><div className="bar-track"><div className="bar-fill" style={{width:(outcome.total>0?100*Math.max(0,r.value)/outcome.total:0)+'%'}}/></div></div>)}
 {!outcome.rows.length&&<p>Inga värden för valt urval.</p>}</>:<p role="alert">Detta mått kan inte summeras säkert med den valda analysen. Välj ett summerbart mått.</p>}</section></div>}
 </>;
}
