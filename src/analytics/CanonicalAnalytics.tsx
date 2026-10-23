import {useEffect,useMemo,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,type GapState} from '../gaps/store';
import {analyzeCanonical} from './canonicalQuery';
import type {CanonicalDataset,Metric,ReportingAxis,Activity} from '../domain/canonical';
export default function CanonicalAnalytics({refreshKey}:{refreshKey:number}){
 const [data,setData]=useState<CanonicalDataset|null>(null),[state,setState]=useState<GapState>({requirements:[],resolutions:[]}),[error,setError]=useState('');
 const [axis,setAxis]=useState<ReportingAxis>('work'),[unit,setUnit]=useState<'hours'|'costs'>('hours'),[activity,setActivity]=useState<Activity|'all'>('all'),[year,setYear]=useState('all'),[selected,setSelected]=useState<Metric[]>(['it_hours','business_hours']);
 useEffect(()=>{let alive=true;void Promise.all([loadCanonical(),loadGapState()]).then(([d,s])=>{if(alive){setData(d);setState(s);setError('')}}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[refreshKey]);
 const years=useMemo(()=>[...new Set((data?.records??[]).map(r=>r.year))].sort((a,b)=>a-b),[data]);
 const metrics:Metric[]=unit==='hours'?['it_hours','business_hours']:['consultant_cost','other_cost'];
 const choices=selected.filter(m=>metrics.includes(m));
 let result:ReturnType<typeof analyzeCanonical>|null=null;
 let queryError='';
 try{if(data&&choices.length)result=analyzeCanonical(data,state,{axis,metrics:choices,activity,year:year==='all'?undefined:Number(year)})}catch(e){queryError=String(e)}
 const labels:Record<Metric,string>={it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',consultant_cost:'Konsultkostnader',other_cost:'Övriga kostnader'};
 const format=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 return <section className="panel canonical-analytics"><h2>Analys – informationsmodell v2</h2><p>Välj enhet och innehåll, därefter aktivitet och organisation. LO och avdelningar är alternativa redovisningar som inte adderas till varandra.</p>
 {(error||queryError)&&<p role="alert">{error||queryError}</p>}
 <div className="mapping-grid">
 <label>Enhet<select aria-label="V2 enhet" value={unit} onChange={e=>{const next=e.target.value as 'hours'|'costs';setUnit(next);setSelected(next==='hours'?['it_hours','business_hours']:['consultant_cost','other_cost'])}}><option value="hours">Timmar</option><option value="costs">Kostnader</option></select></label>
 <fieldset><legend>Ingår i analysen</legend>{metrics.map(m=><label className="check" key={m}><input type="checkbox" checked={choices.includes(m)} onChange={e=>setSelected(old=>e.target.checked?[...old,m]:old.filter(x=>x!==m))}/>{labels[m]}</label>)}</fieldset>
 <label>Aktivitet<select aria-label="V2 aktivitet" value={activity} onChange={e=>setActivity(e.target.value as Activity|'all')}><option value="all">Alla aktiviteter</option><option value="development">Utveckling</option><option value="maintenance">Förvaltning</option><option value="unknown">Okänd aktivitetsfördelning</option></select></label>
 <label>Redovisning<select aria-label="V2 organisation" value={axis} onChange={e=>setAxis(e.target.value as ReportingAxis)}><option value="work">UO och LO</option><option value="department">Avdelningar</option></select></label>
 <label>År<select aria-label="V2 år" value={year} onChange={e=>setYear(e.target.value)}><option value="all">Alla år</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
 </div>
 {!data?<p>Hämtar v2-data…</p>:!data.records.length?<p>Inga data i informationsmodell v2. Importera ett Excelunderlag.</p>:!choices.length?<p>Välj minst ett mått.</p>:result?<><div className="result-head"><div><span>Totalt i vald redovisning</span><strong>{format(result.total)} {result.unit}</strong></div></div>
 {result.unknownCount>0&&<p role="status" className="notice">Ofullständig täckning: {result.coverage}</p>}
 {result.staleApprovals>0&&<p role="status" className="notice">{result.staleApprovals} godkännanden behöver omprövas efter ändrat källunderlag.</p>}
 {result.excludedAlternatives>0&&<p className="notice">{result.excludedAlternatives} alternativa UO-observationer har uteslutits för att undvika dubbelräkning.</p>}
 <div style={{overflowX:'auto'}}><table className="analysis-table" aria-label="V2 analysresultat"><thead><tr><th>Organisationsdel</th><th>Värde</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.key}><td>{row.label}</td><td>{format(row.value)} {result?.unit}</td></tr>)}</tbody></table></div></>:null}
 </section>;
}
