import {useEffect,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,type GapState} from '../gaps/store';
import type {CanonicalDataset} from '../domain/canonical';
import WeightedUoEditor from './WeightedUoEditor';
import {loadAllocations} from '../allocations/store';
import {commitConfiguration,initializeConfiguration,readConfiguration,revisions} from '../config/store';
import {emptyOptionalAllocations,optionalAllocationKey,parseOptionalAllocations,readOptionalAllocations,type OptionalAllocationDimension,type OptionalAllocationRule,type OptionalAllocationScope,type OptionalAllocations} from './optionalModel';
import type {Metric} from '../domain/canonical';

const metricLabels:Record<Metric,string>={it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',consultant_cost:'Konsultkostnader',other_cost:'Övriga kostnader'};
const allMetrics=Object.keys(metricLabels) as Metric[];
const label=(id:string)=>decodeURIComponent(id.split(':').at(-1)??id);

type Unit={id:string;los:string[];hasOverhead:boolean};
const scopeLabel=(scope:OptionalAllocationScope)=>scope.kind==='uo'?'UO-förslag':scope.kind==='uo-overhead'?'UO Övergripande':label(scope.loId);
function PercentEditor({dimension,scope,year,own,base,onSave,onRemove}:{dimension:OptionalAllocationDimension;scope:OptionalAllocationScope;year:number;own?:OptionalAllocationRule;base?:OptionalAllocationRule;onSave:(rule:OptionalAllocationRule)=>Promise<void>;onRemove:(rule:OptionalAllocationRule)=>Promise<void>}){
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(dimension.categories.map(c=>[c.id,String(own?.percentages[c.id]??base?.percentages[c.id]??0)])));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const sum=dimension.categories.reduce((n,c)=>n+Number(values[c.id]??0),0);
 const valid=dimension.categories.every(c=>values[c.id]?.trim()!==''&&Number.isFinite(Number(values[c.id]))&&Number(values[c.id])>=0&&Number(values[c.id])<=100)&&sum<=100.00001;
 const rule:OptionalAllocationRule={dimensionId:dimension.id,year,scope,percentages:Object.fromEntries(dimension.categories.map(c=>[c.id,Number(values[c.id])]))};
 const save=async()=>{setBusy(true);setError('');try{await onSave(rule)}catch(e){setError(String(e))}finally{setBusy(false)}};
 const remove=async()=>{if(!own)return;setBusy(true);setError('');try{await onRemove(own)}catch(e){setError(String(e))}finally{setBusy(false)}};
 return <div className="panel" style={{marginTop:8}}>
  <strong>{scopeLabel(scope)}</strong> <small>{own?'Egen regel':base?'Ärver UO':'Ingen regel'}</small>
  {dimension.categories.length===2&&<label style={{display:'block',minWidth:0,marginTop:12}}>Dra fördelning mellan {dimension.categories[0].name} och {dimension.categories[1].name}<input type="range" min="0" max="100" step="1" aria-label={scopeLabel(scope)+' – Fördelningsreglage'} value={values[dimension.categories[0].id]??0} onChange={e=>{const n=Number(e.target.value);setValues({[dimension.categories[0].id]:String(n),[dimension.categories[1].id]:String(100-n)})}} style={{display:'block',width:'100%',maxWidth:'100%'}}/></label>}
  <div className="mapping-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,12rem),1fr))",minWidth:0}}>{dimension.categories.map(c=><label key={c.id}>{c.name} (%)<input aria-label={scopeLabel(scope)+' – '+c.name} type="number" min="0" max="100" step="0.1" value={values[c.id]??''} onChange={e=>setValues(v=>({...v,[c.id]:e.target.value}))}/></label>)}</div>
  <p>Ofördelat: {valid?Math.max(0,100-sum).toLocaleString('sv-SE')+' %':'Kontrollera procentsatserna'}.</p>
  {error&&<p role="alert">{error}</p>}
  <div className="actions"><button type="button" className="primary" disabled={busy||!valid} onClick={()=>void save()}>Spara {scopeLabel(scope)}</button>{own&&<button type="button" className="secondary" disabled={busy} onClick={()=>void remove()}>Ta bort egen regel</button>}</div>
 </div>;
}

export default function OptionalAllocationsView({mode='definitions'}:{mode?:'definitions'|'rules'}){
 const [data,setData]=useState<OptionalAllocations>(emptyOptionalAllocations);
 const [canonicalData,setCanonicalData]=useState<CanonicalDataset|null>(null);
 const [gaps,setGaps]=useState<GapState>({requirements:[],resolutions:[]});
 const [units,setUnits]=useState<Unit[]>([]),[years,setYears]=useState<number[]>([]);
 const [name,setName]=useState(''),[categories,setCategories]=useState('Förutsättningsskapande; Direkt effekt');
 const [unit,setUnit]=useState<'hours'|'costs'>('hours'),[metrics,setMetrics]=useState<Metric[]>(['it_hours','business_hours']);
 const [activities,setActivities]=useState<Array<'development'|'maintenance'>>(['development','maintenance']);
 const [dimensionId,setDimensionId]=useState(''),[year,setYear]=useState(0),[expanded,setExpanded]=useState<string[]>([]);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;void (async()=>{
  const [canonical,legacy,gapState]=await Promise.all([loadCanonical(),loadAllocations(),loadGapState()]);
  const config=mode==='rules'?(await readConfiguration()??await initializeConfiguration(legacy,{})):await initializeConfiguration(legacy,{});
  if(!live)return;
  setData(readOptionalAllocations(config?.sections.optionalAllocations));setCanonicalData(canonical);setGaps(gapState);
  const map=new Map<string,Unit>(),dateSet=new Set<number>();
  for(const record of canonical.records){dateSet.add(record.year);if(record.scope.axis!=='work')continue;
   const {uoId,loId}=record.scope;
   const item=map.get(uoId)??{id:uoId,los:[],hasOverhead:false};
   if(loId&&!item.los.includes(loId))item.los.push(loId);
   if(!loId&&record.workPart==='uo-overhead')item.hasOverhead=true;
   map.set(uoId,item);
  }
  setUnits([...map.values()].sort((a,b)=>label(a.id).localeCompare(label(b.id),'sv')).map(x=>({...x,los:x.los.sort((a,b)=>label(a).localeCompare(label(b),'sv'))})));
  setYears([...dateSet].sort());
 })().catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[mode]);
 const persist=async(next:OptionalAllocations)=>{parseOptionalAllocations(next);const config=await readConfiguration();if(!config)throw new Error('Konfiguration saknas');const history=await revisions();await commitConfiguration({...config,sections:{...config.sections,optionalAllocations:next}},'Update optional allocations',history.at(-1)?.id);setData(next);setRevision(v=>v+1);setNotice('Fördelningen sparades i projektets konfiguration och versionshistorik.')};
 const create=async()=>{setError('');setNotice('');try{
  const values=categories.split(';').map(v=>v.trim()).filter(Boolean);
  if(!name.trim()||values.length<2||new Set(values.map(x=>x.toLocaleLowerCase('sv'))).size!==values.length)throw new Error('Ange namn och minst två unika kategorier.');
  const dimension:OptionalAllocationDimension={id:crypto.randomUUID(),name:name.trim(),categories:values.map(v=>({id:crypto.randomUUID(),name:v})),appliesTo:{metrics,activities:unit==='hours'?activities:'all'}};
  const next={...data,dimensions:[...data.dimensions,dimension]};
  await persist(next);setDimensionId(dimension.id);setName('');
 }catch(e){setError(String(e))}};
 const dimension=data.dimensions.find(d=>d.id===dimensionId)??data.dimensions[0];
 const findRule=(scope:OptionalAllocationScope)=>data.rules.find(r=>r.dimensionId===dimension?.id&&r.year===year&&optionalAllocationKey(r)===optionalAllocationKey({dimensionId:dimension!.id,year,scope,percentages:{}}));
 const saveRule=async(rule:OptionalAllocationRule)=>{const key=optionalAllocationKey(rule);await persist({...data,rules:[...data.rules.filter(r=>optionalAllocationKey(r)!==key),rule]})};
 const removeRule=async(rule:OptionalAllocationRule)=>await persist({...data,rules:data.rules.filter(r=>optionalAllocationKey(r)!==optionalAllocationKey(rule))});
 const renderRule=(scope:OptionalAllocationScope,base?:OptionalAllocationRule)=>dimension&&<PercentEditor key={JSON.stringify([dimension.id,year,scope,revision,findRule(scope)?.percentages,base?.percentages])} dimension={dimension} year={year} scope={scope} own={findRule(scope)} base={base} onSave={saveRule} onRemove={removeRule}/>;
 return <section aria-label={mode==='rules'?'Valfria fördelningar':'Valfria fördelningstyper'} className="panel" style={{minWidth:0,overflowWrap:"anywhere"}}><h2>{mode==='rules'?'Fördela timmar och kostnader':'Valfria fördelningstyper'}</h2><p>{mode==='rules'?'Välj fördelningstyp. Grundfördelningen gäller alla år; välj ett enskilt år för att göra ett undantag. Dra reglaget för två kategorier, eller ange procenttal. Fördelning på UO- och LO-nivå följer tills vidare de befintliga arvsreglerna.':'Skapa kategorier och välj vilka timmar eller kostnader som ska omfattas. Själva fördelningen gör du sedan under fliken Fördelningar.'}</p>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {mode==='definitions'&&<fieldset style={{minWidth:0}}><legend>Ny fördelningstyp</legend>
  <div className="mapping-grid"><label>Namn<input style={{maxWidth:"100%",minWidth:0}} aria-label="Namn på fördelningstyp" value={name} onChange={e=>setName(e.target.value)}/></label><label>Kategorier (semikolonseparerade)<input style={{maxWidth:"100%",minWidth:0}} aria-label="Fördelningskategorier" value={categories} onChange={e=>setCategories(e.target.value)}/></label>
  <label>Enhet<select style={{maxWidth:"100%",minWidth:0}} aria-label="Enhet för fördelningstyp" value={unit} onChange={e=>{const v=e.target.value as 'hours'|'costs';setUnit(v);setMetrics(v==='hours'?['it_hours','business_hours']:['consultant_cost','other_cost'])}}><option value="hours">Timmar</option><option value="costs">Kostnader</option></select></label></div>
  <fieldset style={{minWidth:0}}><legend>Omfattade mått</legend>{allMetrics.filter(m=>unit==='hours'?m.endsWith('_hours'):m.endsWith('_cost')).map(m=><label className="check" key={m}><input type="checkbox" checked={metrics.includes(m)} onChange={e=>setMetrics(old=>e.target.checked?[...old,m]:old.filter(x=>x!==m))}/>{metricLabels[m]}</label>)}</fieldset>
  {unit==='hours'&&<fieldset style={{minWidth:0}}><legend>Aktiviteter</legend>{(['development','maintenance'] as const).map(a=><label className="check" key={a}><input type="checkbox" checked={activities.includes(a)} onChange={e=>setActivities(old=>e.target.checked?[...old,a]:old.filter(x=>x!==a))}/>{a==='development'?'Utveckling':'Förvaltning'}</label>)}</fieldset>}
  <button className="primary" type="button" disabled={!name.trim()||metrics.length===0||unit==='hours'&&activities.length===0} onClick={()=>void create()}>Skapa fördelningstyp</button>
 </fieldset>}
 {mode==='rules'&&(data.dimensions.length===0?<p>Skapa först en fördelningstyp under Inställningar.</p>:null)}
 {mode==='rules'&&data.dimensions.length>0&&<><h3>Fördela per UO och LO</h3><div className="mapping-grid">
  <label>Fördelningstyp<select aria-label="Aktuell fördelningstyp" value={dimension?.id??''} onChange={e=>setDimensionId(e.target.value)}>{data.dimensions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  <label>Fördelningsperiod<select aria-label="Fördelningsår" value={year} onChange={e=>setYear(Number(e.target.value))}><option value={0}>Samtliga år (grundfördelning)</option>{years.map(y=><option key={y} value={y}>{y} (egen justering)</option>)}</select></label>
 </div><p>Omfattning: {dimension?.appliesTo.metrics.map(m=>metricLabels[m]).join(', ')}. En LO utan egen regel ärver UO-förslaget.</p>
 {units.length===0?<p>Importera UO-data innan du gör en fördelning.</p>:units.map(u=>{
  const scope:OptionalAllocationScope={kind:'uo',uoId:u.id},base=findRule(scope);
  const open=expanded.includes(u.id);
  if(dimension?.categories.length===2&&canonicalData)return <WeightedUoEditor key={JSON.stringify([dimension.id,year,u.id])} data={canonicalData} gaps={gaps} config={data} dimension={dimension} year={year} uoId={u.id} onSave={persist}/>;
  return <div key={u.id} className="panel" style={{marginTop:12}}><button type="button" className="secondary" aria-expanded={open} onClick={()=>setExpanded(prev=>open?prev.filter(id=>id!==u.id):[...prev,u.id])}>{open?'▾':'▸'} {label(u.id)} – {open?'Dölj detaljer':'Visa LO'}</button>
  {renderRule(scope)}
  {open&&<div style={{paddingLeft:12}}>{u.los.map(loId=><div key={loId}>{renderRule({kind:'lo',uoId:u.id,loId},base)}</div>)}{u.hasOverhead&&renderRule({kind:'uo-overhead',uoId:u.id},base)}</div>}
  </div>;
 })}</>}
 </section>;
}
