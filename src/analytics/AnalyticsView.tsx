import CanonicalAnalytics from './CanonicalAnalytics';
import CompletionAnalysis from '../gaps/CompletionAnalysis';
import {useEffect,useMemo,useState} from 'react';
import {loadSemantic} from '../domain/semanticStore';
import type {SemanticDataset} from '../domain/semantic';
import {readConfiguration} from '../config/store';
import type {UoGroupModel} from './groupModels';
import ResultChart from './ResultChart';
import YearChart,{type YearMode} from './YearChart';
import {analyzeYears} from './yearSeries';
import type {ChartType} from './charts';
import {analyze,measureSelection,type GroupBy} from './query';
export default function AnalyticsView({refreshKey,onOpenCompletions}:{refreshKey:number;onOpenCompletions:()=>void}){
 const [yearMode,setYearMode]=useState<YearMode>('total');
 const [chartType,setChartType]=useState<ChartType>('bar');
 const [models,setModels]=useState<UoGroupModel[]>([]),[modelId,setModelId]=useState('');
 const [data,setData]=useState<SemanticDataset|null>(null),[error,setError]=useState('');
 const [measureId,setMeasureId]=useState('it_hours'),[year,setYear]=useState('all'),[groupBy,setGroupBy]=useState<GroupBy>('uo'),[datasets,setDatasets]=useState<string[]>([]),[uos,setUos]=useState<string[]>([]);
 useEffect(()=>{let active=true;readConfiguration().then(c=>{if(active)setModels(c?.sections.groups??[])}).catch(()=>{if(active)setModels([])});return()=>{active=false}},[refreshKey]);
 useEffect(()=>{let active=true;loadSemantic().then(d=>{if(active){setData(d);setError('')}}).catch(()=>{if(active)setError('Kunde inte läsa importerade analysdata.')});return()=>{active=false}},[refreshKey]);
 const sources=useMemo(()=>[...new Map((data?.observations??[]).map(o=>[o.source.datasetId,o.source.fileName])).entries()],[data]);
 const units=useMemo(()=>data?.entities.filter(e=>e.kind==='uo')??[],[data]);
 const years=useMemo(()=>[...new Set((data?.observations??[]).map(o=>o.period.year))].sort(),[data]);
 const query=useMemo(()=>({measureId,year:year==='all'?undefined:Number(year),datasetIds:datasets.length?datasets:undefined,uoIds:uos.length?uos:undefined,groupBy,groupModel:groupBy==='uo-group'?models.find(m=>m.id===(modelId||models[0]?.id)):undefined}),[measureId,year,datasets,uos,groupBy,models,modelId]);
 let outcome:ReturnType<typeof analyze>|null=null;
 try{if(data)outcome=analyze(data,query)}catch{outcome=null}
 const selectedMeasure=data?(()=>{try{return measureSelection(data,measureId)}catch{return null}})():null;
 const yearly=data&&year==='all'&&yearMode!=='total'&&selectedMeasure?analyzeYears(data,query):null;
 const allocations=useMemo(()=>{
  const obs=(data?.observations??[]).filter(o=>o.kind==='subset'&&o.sectionId&&o.activity&&(year==='all'||o.period.year===Number(year))&&(!datasets.length||datasets.includes(o.source.datasetId))&&(!uos.length||data?.entities.some(e=>e.id===o.entityId&&e.kind==='uo'&&uos.includes(e.id))));
  const ids=new Set<string>();const by=new Map<string,{label:string;value:number;unit:string}>();
  for(const o of obs){const id=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');if(ids.has(id))continue;ids.add(id);
   const unit=data?.measures.find(m=>m.id===o.measureId)?.unit??'';const label=[o.measureId,o.activity==='development'?'Utveckling':'Förvaltning',o.period.year].join(' · ');const k=[o.measureId,o.activity,o.period.year].join('|');
   const prev=by.get(k);by.set(k,{label,value:(prev?.value??0)+o.value,unit});
  }
  return [...by.values()].sort((a,b)=>a.label.localeCompare(b.label,'sv'));
 },[data,year,datasets,uos]);
 const chosenMeasure=selectedMeasure;
 const toggle=(id:string,selection:string[],set:(x:string[])=>void)=>set(selection.includes(id)?selection.filter(x=>x!==id):[...selection,id]);
 const fmt=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 return <><div className="eyebrow">ANALYS · IMPORTERADE DATA</div><h1>Analysera utvecklingsbehoven</h1><p className="lead">Resultaten baseras på godkända importer i webbläsaren. Varje mått visas separat och källornas totalrader räknas inte dubbelt.</p>
 <CanonicalAnalytics refreshKey={refreshKey} onOpenCompletions={onOpenCompletions}/>
 {error&&<p role="alert">{error}</p>}
 {!data?<p>Hämtar analysdata…</p>:!data.observations.length?<section className="panel"><h2>Inga importerade analysvärden ännu</h2><p>Gå till Import och godkänn en Excel-fil. Demoanalysen visas inte som verkliga uppgifter.</p></section>:
 <div className="analysis-layout"><details className="analysis-filter-disclosure" open><summary>Analysfilter – visa eller dölj</summary><section className="panel filters">
 <h2>Välj analys</h2><label htmlFor="measure">Mått</label><select id="measure" value={measureId} onChange={e=>setMeasureId(e.target.value)}><option value="all_hours">Alla timmar (h)</option><option value="all_costs">Alla kostnader (SEK)</option>{data.measures.map(m=><option value={m.id} key={m.id}>{m.label} ({m.unit})</option>)}</select>
 <label htmlFor="year">År</label><select id="year" value={year} onChange={e=>setYear(e.target.value)}><option value="all">Alla år</option>{years.map(y=><option value={y} key={y}>{y}</option>)}</select>
 <label htmlFor="grouping">Gruppera efter</label><select id="grouping" value={groupBy} onChange={e=>setGroupBy(e.target.value as GroupBy)}><option value="uo">Utvecklingsområde</option><option value="entity">LO / källaobjekt</option><option value="year">År</option><option value="source">Källfil</option>{models.length>0&&<option value="uo-group">UO-gruppmodell</option>}</select>
 <fieldset><legend>Datakällor (ingen vald = alla)</legend>{sources.map(([id,name])=><label key={id} className="check"><input type="checkbox" checked={datasets.includes(id)} onChange={()=>toggle(id,datasets,setDatasets)}/>{name}</label>)}</fieldset>
 <fieldset><legend>Utvecklingsområden (ingen vald = alla)</legend>{units.map(u=><label key={u.id} className="check"><input type="checkbox" checked={uos.includes(u.id)} onChange={()=>toggle(u.id,uos,setUos)}/>{u.name}</label>)}</fieldset>
 {groupBy==='uo-group'&&<><label htmlFor="group-model">Gruppmodell</label><select id="group-model" value={modelId||models[0]?.id||''} onChange={e=>setModelId(e.target.value)}>{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><p className="notice">Vid överlapp tilldelas UO första gruppen i modellen; ingen observation dubbelräknas.</p></>}
 </section></details><section className="panel results"><h2>Resultat</h2>{outcome?<><div className="result-head"><div><span>Totalt {chosenMeasure?.label.toLowerCase()}</span><strong>{fmt(outcome.total)} {outcome.unit}</strong></div><span className="pill">{outcome.included} detaljvärden</span></div>
 {selectedMeasure&&selectedMeasure.members.length>1&&<p className="notice" data-testid="measure-components">Ingår: {selectedMeasure.members.map(m=>m.label).join(', ')}. Endast summerbara mått med samma enhet.</p>}
 <p className="notice">{outcome.excluded} summeringar, delmängder eller dubbletter exkluderade inom aktuellt urval.</p><div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>Gruppering</th><th>Värde</th><th>Källposter</th></tr></thead><tbody>{outcome.rows.map(r=><tr key={r.key}><td>{r.label}</td><td>{fmt(r.value)} {outcome?.unit}</td><td>{r.count}</td></tr>)}</tbody></table></div>
 {year==='all'&&<><label htmlFor="year-mode">Tidsvisning</label><select id="year-mode" value={yearMode} onChange={e=>setYearMode(e.target.value as YearMode)}><option value="total">Summerat resultat</option><option value="grouped">Grupperade årsstaplar</option><option value="trend">Trendlinjer</option></select></>}
 {year==='all'&&yearMode!=='total'&&yearly?<><p className="notice">Tidsserien använder samma mått, källor, UO-urval och gruppmodell.</p><YearChart series={yearly} mode={yearMode}/><div style={{overflowX:'auto'}}><table className="analysis-table" aria-label="Periodtabell"><thead><tr><th>Grupp</th>{yearly.years.map(y=><th key={y}>{y}</th>)}</tr></thead><tbody>{yearly.rows.map(r=><tr key={r.key}><td>{r.label}</td>{r.values.map((v,i)=><td key={yearly.years[i]}>{fmt(v)} {yearly.unit}</td>)}</tr>)}</tbody></table></div></>:<><label htmlFor="chart-type">Visualisering</label><select id="chart-type" value={chartType} onChange={e=>setChartType(e.target.value as ChartType)}><option value="bar">Stapeldiagram</option><option value="pie">Cirkeldiagram</option><option value="table">Endast tabell</option></select>
 <ResultChart result={outcome} type={chartType}/></>}
 {!outcome.rows.length&&<p>Inga värden för valt urval.</p>}</>:<p role="alert">Detta mått kan inte summeras säkert med den valda analysen. Välj ett summerbart mått.</p>}</section><CompletionAnalysis data={data} year={year==='all'?undefined:Number(year)} measureId={measureId}/>{allocations.length>0&&<section className="panel" style={{marginTop:18}}><h2>Utveckling och förvaltning – separat fördelning</h2><p className="notice">Årsuppgifter från en annan datasektion. De ingår inte i huvudanalysens detaljsummor för att undvika dubbelräkning.</p><div style={{overflowX:'auto'}}><table className="analysis-table" aria-label="Utveckling och förvaltning"><thead><tr><th>Mått · aktivitet · år</th><th>Värde</th></tr></thead><tbody>{allocations.map(x=><tr key={x.label}><td>{x.label}</td><td>{fmt(x.value)} {x.unit}</td></tr>)}</tbody></table></div></section>}</div>}
 </>;
}
