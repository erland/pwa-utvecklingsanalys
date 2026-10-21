import {useEffect,useState} from 'react';
import {loadSemantic} from '../domain/semanticStore';
import {loadAllocations} from '../allocations/store';
import {loadPlanning,savePlanning} from './store';
import {adjustScenario,approveScenario,newScenario,qualityIssues,scenarioCompare,type Issue,type PlanningState} from './model';
import type {SemanticDataset} from '../domain/semantic';
import type {Allocations} from '../allocations/model';
export default function PlanningView(){
 const [data,setData]=useState<SemanticDataset|null>(null),[allocations,setAllocations]=useState<Allocations|null>(null),[state,setState]=useState<PlanningState|null>(null);
 const [year,setYear]=useState(2027),[name,setName]=useState(''),[baseVersion,setBaseVersion]=useState('2027'),[chosen,setChosen]=useState(''),[observationId,setObservation]=useState(''),[value,setValue]=useState(''),[reason,setReason]=useState(''),[measure,setMeasure]=useState('it_hours'),[message,setMessage]=useState('');
 useEffect(()=>{void Promise.all([loadSemantic(),loadAllocations(),loadPlanning()]).then(([d,a,p])=>{setData(d);setAllocations(a);setState(p)}).catch(()=>setMessage('Kunde inte läsa planeringsdata'))},[]);
 const issues:Issue[]=data&&allocations?qualityIssues(data,allocations,year):[];
 const scenario=state?.scenarios.find(s=>s.id===chosen);
 const observations=data?.observations.filter(o=>o.kind==='detail'&&o.period.year===year&&o.planningVersion===(scenario?.baseVersion??baseVersion))??[];
 const selected=observations.find(o=>o.id===observationId);
 const persist=async(next:PlanningState)=>{await savePlanning(next);setState(next)};
 const create=async()=>{if(!state)return;try{const next=newScenario(state,name,baseVersion);await persist(next);setChosen(next.scenarios[next.scenarios.length-1].id);setMessage('Scenarioutkast skapat.')}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte skapa scenario')}};
 const adjust=async()=>{if(!state||!scenario||!selected)return;try{await persist(adjustScenario(state,scenario.id,selected,Number(value),reason));setMessage('Justeringen sparad med motivering.')}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte spara ändringen')}};
 const approve=async()=>{if(!state||!scenario||!data)return;try{await persist(approveScenario(state,scenario.id,data,issues));setMessage('Scenariot godkänt.')}catch(e){setMessage(e instanceof Error?e.message:'Godkännande blockerades')}};
 let comparison:ReturnType<typeof scenarioCompare>|null=null;try{if(data&&scenario)comparison=scenarioCompare(data,scenario.baseVersion,scenario,measure,year)}catch{comparison=null}
 return <><div className="eyebrow">PLANERING · DEV-009</div><h1>Datakvalitet och scenarier</h1><p className="lead">Kontrollera vad som behöver kompletteras. Scenarier ändrar inte importerade originalvärden och godkänns först efter validering.</p>
 <section className="panel"><label>Planeringsår<input aria-label="Planeringsår" type="number" min="2000" max="2100" value={year} onChange={e=>setYear(Number(e.target.value))}/></label><h2>Kompletteringsguide</h2><p>{issues.length} uppmärksammade frågor · {issues.filter(i=>i.severity==='error').length} blockerande fel</p>{issues.length?<ul>{issues.map(i=><li key={i.id}>{i.severity==='error'?'Fel':'Varning'}: {i.description} ({i.code})</li>)}</ul>:<p>Inga problem hittades med nuvarande kontroller. Det innebär inte att underlaget är fullständigt.</p>}</section>
 <section className="panel"><h2>Skapa planeringsscenario</h2><div className="mapping-grid"><label>Scenarionamn<input aria-label="Scenarionamn" value={name} onChange={e=>setName(e.target.value)}/></label><label>Basversion<input aria-label="Basversion" value={baseVersion} onChange={e=>setBaseVersion(e.target.value)}/></label></div><button className="primary" disabled={!state||!name.trim()} onClick={()=>{void create()}}>Skapa scenarioutkast</button>
 {state&&<><label>Välj scenario<select aria-label="Välj scenario" value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Välj</option>{state.scenarios.map(s=><option key={s.id} value={s.id}>{s.name} ({s.status==='approved'?'godkänd':'utkast'})</option>)}</select></label>
 {scenario&&<><p>Basversion: {scenario.baseVersion}. Status: {scenario.status==='approved'?'Godkänd':'Utkast'}.</p>
 <div className="mapping-grid"><label>Källobservation<select aria-label="Källobservation" value={observationId} onChange={e=>{setObservation(e.target.value);const o=observations.find(x=>x.id===e.target.value);setValue(o?String(o.value):'')}}><option value="">Välj värde</option>{observations.map(o=><option key={o.id} value={o.id}>{o.source.fileName} / {o.source.cell}: {o.value}</option>)}</select></label><label>Alternativt värde<input aria-label="Alternativt värde" type="number" value={value} onChange={e=>setValue(e.target.value)}/></label><label>Motivering<input aria-label="Motivering" value={reason} onChange={e=>setReason(e.target.value)}/></label></div>
 <button className="secondary" disabled={scenario.status==='approved'||!selected||!value.trim()||!reason.trim()} onClick={()=>{void adjust()}}>Spara justering</button>
 <button className="primary" disabled={scenario.status==='approved'||issues.some(i=>i.severity==='error')} onClick={()=>{void approve()}}>Godkänn scenario</button>
 <h2>Jämför mot basversionen</h2><label>Mått<select aria-label="Jämförelsemått" value={measure} onChange={e=>setMeasure(e.target.value)}>{data?.measures.filter(m=>m.aggregation==='sum').map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
 {comparison?<p>Bas: {comparison.baseline.toLocaleString('sv-SE')} · Scenario: {comparison.scenario.toLocaleString('sv-SE')} · Skillnad: {comparison.difference.toLocaleString('sv-SE')} ({comparison.sourceCount} källvärden)</p>:<p>Detta mått kan inte jämföras additivt.</p>}
 </>}</>}
 </section>{message&&<p role="status">{message}</p>}</>;
}
