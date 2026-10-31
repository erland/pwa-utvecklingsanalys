import BuiltInAllocations from './BuiltInAllocations';
import {allocationTypeOverview} from './typeOverview';
import {useEffect,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,type GapState} from '../gaps/store';
import type {CanonicalDataset} from '../domain/canonical';
import WeightedUoEditor,{PeriodSlider,PeriodButtons} from './WeightedUoEditor';
import {bulkSetPercentages,bulkClearPercentages,previewBulkChange} from './bulkInitialize';
import {updateDimension,deleteDimension,dimensionChangeImpact} from './dimensionManagement';
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
 const [name,setName]=useState(''),[categories,setCategories]=useState<Array<{id:string|null;name:string}>>([{id:null,name:'Förutsättningsskapande'},{id:null,name:'Direkt effekt'}]);
 const [editingId,setEditingId]=useState<string|null>(null),[creating,setCreating]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null),[confirmImpact,setConfirmImpact]=useState(false);
 const [unit,setUnit]=useState<'hours'|'costs'>('hours'),[metrics,setMetrics]=useState<Metric[]>(['it_hours','business_hours']);
 const [activities,setActivities]=useState<Array<'development'|'maintenance'>>(['development','maintenance']);
 const [dimensionId,setDimensionId]=useState(''),[showDimensionDetails,setShowDimensionDetails]=useState(false),[year,setYear]=useState(0),[expanded,setExpanded]=useState<string[]>([]);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 const [bulkCategory,setBulkCategory]=useState<string|null>(null),[bulkBusy,setBulkBusy]=useState(false),[bulkOpen,setBulkOpen]=useState(false),[bulkAction,setBulkAction]=useState<'set'|'equal'|'clear'|null>(null);
 const [selectedUo,setSelectedUo]=useState<string|null>(null),[uoSearch,setUoSearch]=useState(''),[uoFilter,setUoFilter]=useState<'all'|'configured'|'missing'>('all');
 useEffect(()=>{let live=true;void (async()=>{
  const [canonical,legacy,gapState]=await Promise.all([loadCanonical(),loadAllocations(),loadGapState()]);
  // Imported allocations do not depend on optional allocation configuration.
  if(!live)return;
  setCanonicalData(canonical);setGaps(gapState);
  const config=mode==='rules'?(await readConfiguration()??await initializeConfiguration(legacy,{})):await initializeConfiguration(legacy,{});
  if(!live)return;
  setData(readOptionalAllocations(config?.sections.optionalAllocations));
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
  const values=categories.map(v=>v.name.trim());
  if(!name.trim()||values.length<2||new Set(values.map(x=>x.toLocaleLowerCase('sv'))).size!==values.length)throw new Error('Ange namn och minst två unika kategorier.');
  const dimension:OptionalAllocationDimension={id:crypto.randomUUID(),name:name.trim(),categories:values.map(v=>({id:crypto.randomUUID(),name:v})),appliesTo:{metrics,activities:unit==='hours'?activities:'all'}};
  const next={...data,dimensions:[...data.dimensions,dimension]};
  await persist(next);setDimensionId(dimension.id);setName('');setCreating(false);
 }catch(e){setError(String(e))}};
 const beginEdit=(d:OptionalAllocationDimension)=>{setConfirmImpact(false);setCreating(false);setEditingId(d.id);setDeleteId(null);setName(d.name);setCategories(d.categories.map(c=>({...c})));const isHours=d.appliesTo.metrics.every(m=>m.endsWith('_hours'));setUnit(isHours?'hours':'costs');setMetrics([...d.appliesTo.metrics]);setActivities(d.appliesTo.activities==='all'?['development','maintenance']:[...d.appliesTo.activities]);setError('');setNotice('')};
 const cancelEdit=()=>{setConfirmImpact(false);setCreating(false);setEditingId(null);setName('');setCategories([{id:null,name:'Förutsättningsskapande'},{id:null,name:'Direkt effekt'}]);setError('')};
 const editInput=()=>({name,names:categories.map(c=>c.name),categoryIds:categories.map(c=>c.id),metrics,activities:(unit==='hours'?activities:'all') as 'all'|Array<'development'|'maintenance'>});
 const saveEdit=async(confirmed=false)=>{if(!editingId)return;setError('');try{const input=editInput();const impact=dimensionChangeImpact(data,editingId,input);if(impact.requiresConfirmation&&!confirmed){setConfirmImpact(true);return}const next=updateDimension(data,editingId,input,()=>crypto.randomUUID(),confirmed);await persist(next);cancelEdit()}catch(e){setError(String(e))}};
 const confirmDelete=async()=>{if(!deleteId)return;setError('');try{await persist(deleteDimension(data,deleteId));setDeleteId(null);if(editingId===deleteId)cancelEdit();if(dimensionId===deleteId)setDimensionId('')}catch(e){setError(String(e))}};
 const dimension=data.dimensions.find(d=>d.id===dimensionId);
 const runBulk=async()=>{if(!dimension||!bulkAction||bulkBusy)return;setBulkBusy(true);setError('');try{const ids=units.map(u=>u.id);const selected=bulkCategory??dimension.categories[0].id;const values=Object.fromEntries(dimension.categories.map(c=>[c.id,bulkAction==='equal'?100/dimension.categories.length:c.id===selected?100:0]));const next=bulkAction==='clear'?bulkClearPercentages(data,dimension.id,year,ids):bulkSetPercentages(data,dimension.id,year,ids,values);await persist(next);setBulkAction(null);setBulkCategory(null);setBulkOpen(false)}catch(e){setError(String(e))}finally{setBulkBusy(false)}};
 const findRule=(scope:OptionalAllocationScope)=>data.rules.find(r=>r.dimensionId===dimension?.id&&r.year===year&&optionalAllocationKey(r)===optionalAllocationKey({dimensionId:dimension!.id,year,scope,percentages:{}}));
 const saveRule=async(rule:OptionalAllocationRule)=>{const key=optionalAllocationKey(rule);await persist({...data,rules:[...data.rules.filter(r=>optionalAllocationKey(r)!==key),rule]})};
 const removeRule=async(rule:OptionalAllocationRule)=>await persist({...data,rules:data.rules.filter(r=>optionalAllocationKey(r)!==optionalAllocationKey(rule))});
 const renderRule=(scope:OptionalAllocationScope,base?:OptionalAllocationRule)=>dimension&&<PercentEditor key={JSON.stringify([dimension.id,year,scope,revision,findRule(scope)?.percentages,base?.percentages])} dimension={dimension} year={year} scope={scope} own={findRule(scope)} base={base} onSave={saveRule} onRemove={removeRule}/>;
 return <section aria-label={mode==='rules'?'Valfria fördelningar':'Valfria fördelningstyper'} className="panel" style={{minWidth:0,overflowWrap:"anywhere"}}><h2>{mode==='rules'?'Fördela timmar och kostnader':'Valfria fördelningstyper'}</h2><p>{mode==='rules'?'Välj fördelningstyp. Grundfördelningen gäller alla år; välj ett enskilt år för att göra ett undantag. Dra reglaget för två kategorier, eller ange procenttal. Fördelning på UO- och LO-nivå följer tills vidare de befintliga arvsreglerna.':'Skapa kategorier och välj vilka timmar eller kostnader som ska omfattas. Själva fördelningen gör du sedan under fliken Fördelningar.'}</p>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {mode==='definitions'&&(creating||editingId!==null)&&<fieldset style={{minWidth:0}}><legend>{editingId?'Redigera fördelningstyp':'Ny fördelningstyp'}</legend>
  <div className="mapping-grid"><label>Namn<input style={{maxWidth:"100%",minWidth:0}} aria-label="Namn på fördelningstyp" value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Enhet<select style={{maxWidth:"100%",minWidth:0}} aria-label="Enhet för fördelningstyp" value={unit} onChange={e=>{const v=e.target.value as 'hours'|'costs';setUnit(v);setMetrics(v==='hours'?['it_hours','business_hours']:['consultant_cost','other_cost'])}}><option value="hours">Timmar</option><option value="costs">Kostnader</option></select></label></div>
  <fieldset style={{minWidth:0}}><legend>Kategorier</legend>{categories.map((category,i)=><div className="actions" key={category.id??'new-'+i}><label style={{flex:1}}>Kategori {i+1}<input style={{width:'100%',minWidth:0}} aria-label={'Kategori '+(i+1)} value={category.name} onChange={e=>{setConfirmImpact(false);setCategories(old=>old.map((c,j)=>j===i?{...c,name:e.target.value}:c))}}/></label><button type="button" className="secondary" disabled={categories.length<=2} onClick={()=>{setConfirmImpact(false);setCategories(old=>old.filter((_,j)=>j!==i))}}>Ta bort kategori {i+1}</button></div>)}<button type="button" className="secondary" onClick={()=>{setConfirmImpact(false);setCategories(old=>[...old,{id:null,name:''}])}}>Lägg till kategori</button></fieldset>
  <fieldset style={{minWidth:0}}><legend>Omfattade mått</legend>{allMetrics.filter(m=>unit==='hours'?m.endsWith('_hours'):m.endsWith('_cost')).map(m=><label className="check" key={m}><input type="checkbox" checked={metrics.includes(m)} onChange={e=>setMetrics(old=>e.target.checked?[...old,m]:old.filter(x=>x!==m))}/>{metricLabels[m]}</label>)}</fieldset>
  {unit==='hours'&&<fieldset style={{minWidth:0}}><legend>Aktiviteter</legend>{(['development','maintenance'] as const).map(a=><label className="check" key={a}><input type="checkbox" checked={activities.includes(a)} onChange={e=>setActivities(old=>e.target.checked?[...old,a]:old.filter(x=>x!==a))}/>{a==='development'?'Utveckling':'Förvaltning'}</label>)}</fieldset>}
  <div className="actions"><button className="primary" type="button" disabled={!name.trim()||metrics.length===0||unit==='hours'&&activities.length===0} onClick={()=>void (editingId?saveEdit():create())}>{editingId?'Spara ändringar':'Skapa fördelningstyp'}</button><button className="secondary" type="button" onClick={cancelEdit}>Avbryt</button></div>
  {editingId&&<div className="actions"><button type="button" className="secondary" onClick={()=>{setDeleteId(editingId);setError('')}}>Ta bort</button></div>}
  {editingId&&deleteId===editingId&&<div role="group" className="notice" aria-label="Bekräfta borttagning av fördelningstyp"><p>Ta bort fördelningstypen och dess {data.rules.filter(r=>r.dimensionId===editingId).length} sparade regler? Ändringen sparas som en ny revision.</p><div className="actions"><button type="button" className="primary" onClick={()=>void confirmDelete()}>Bekräfta borttagning</button><button type="button" className="secondary" onClick={()=>setDeleteId(null)}>Avbryt</button></div></div>}
  {editingId&&confirmImpact&&<div className="panel" role="group" aria-label="Bekräfta ändrad fördelningstyp"><p>Ändrad omfattning eller borttagna kategorier ogiltigförklarar {data.rules.filter(r=>r.dimensionId===editingId).length} sparade fördelningsregler. Dessa tas bort när ändringen sparas. Tidigare konfigurationsrevisioner behålls.</p><div className="actions"><button type="button" className="primary" onClick={()=>void saveEdit(true)}>Bekräfta och rensa regler</button><button type="button" className="secondary" onClick={()=>setConfirmImpact(false)}>Avbryt ändringen</button></div></div>}
  {editingId&&<p>Kategoriers identitet bevaras vid namnändring. Om du tar bort en kategori krävs bekräftelse och sparade regler för fördelningstypen rensas.</p>}
 </fieldset>}
 {mode==='definitions'&&!creating&&editingId===null&&<section aria-label="Befintliga fördelningstyper"><div className="actions"><h3>Befintliga fördelningstyper</h3><button type="button" className="secondary" onClick={()=>{cancelEdit();setDeleteId(null);setCreating(true)}}>Ny fördelningstyp</button></div>{data.dimensions.length===0?<p>Inga fördelningstyper har skapats.</p>:data.dimensions.map(d=><button type="button" className="panel" key={d.id} onClick={()=>beginEdit(d)} style={{display:'block',width:'100%',textAlign:'left',cursor:'pointer'}}><strong>{d.name} ›</strong><p>{d.categories.map(c=>c.name).join(' · ')}. {d.appliesTo.metrics.map(m=>metricLabels[m]).join(', ')} · {data.rules.filter(r=>r.dimensionId===d.id).length} regler.</p></button>)}</section>}
 {mode==='rules'&&!showDimensionDetails&&canonicalData&&<BuiltInAllocations data={canonicalData} years={years} gaps={gaps} onSaved={setGaps}/>}
 {mode==='rules'&&!showDimensionDetails&&data.dimensions.length>0&&canonicalData&&<section className="panel" aria-label="Översikt fördelningstyper"><h3>Fördelningstyper – viktade andelar</h3><p>Andelarna beräknas från fördelade timmar eller kostnader, inte antal UO. UO med ofördelade värden räknas separat.</p>

 {data.dimensions.map(d=>{const stats=allocationTypeOverview(canonicalData,gaps,data,d.id,year,units.map(u=>u.id));return <div key={d.id} className="panel" style={{width:'100%',minWidth:0}}>
 <button type="button" className="secondary" onClick={()=>{setDimensionId(d.id);setShowDimensionDetails(true);setSelectedUo(null);setBulkCategory(null);setBulkAction(null)}} style={{display:'block',width:'100%',textAlign:'left'}}><strong>{d.name} ›</strong></button>
 <PeriodButtons years={years} selected={year} onSelect={setYear} label={'Period '+d.name}/>
 {stats.allocated>0?<><div role="img" aria-label={d.categories.map(c=>c.name+' '+stats.percentages[c.id].toFixed(1)+' procent').join(', ')} style={{display:'flex',width:'100%',height:14,overflow:'hidden',borderRadius:8,marginTop:12,background:'#e2e8f0'}}>{d.categories.map((c,i)=><span key={c.id} style={{width:stats.percentages[c.id]+'%',background:['#2563eb','#0d9488','#b45309','#9333ea','#be123c','#64748b'][i%6]}}/>)}</div><p>{d.categories.map(c=>c.name+': '+stats.percentages[c.id].toLocaleString('sv-SE',{maximumFractionDigits:1})+' %').join(' · ')}</p></>:<p>Ingen fördelning har sparats för tillämpliga värden.</p>}
 <p>{stats.missing>0?stats.missing+' av '+stats.applicable+' UO har ofördelade värden':stats.applicable>0?'Alla '+stats.applicable+' tillämpliga UO är fördelade':'Inga tillämpliga UO med värden'}{stats.unallocated>0?' · Ofördelat: '+stats.unallocated.toLocaleString('sv-SE',{maximumFractionDigits:1})+' '+(d.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'):''}</p>
 </div>})}</section>}
 {mode==='rules'&&showDimensionDetails&&dimension&&<><button type="button" className="secondary" onClick={()=>{setShowDimensionDetails(false);setDimensionId('');setSelectedUo(null);setBulkAction(null)}}>← Alla fördelningstyper</button><h3>{dimension.name} – Fördela per UO och LO</h3><p>Omfattning: {dimension?.appliesTo.metrics.map(m=>metricLabels[m]).join(', ')}. En LO utan egen regel ärver UO-förslaget.</p>
 {dimension&&units.length>0&&<div className="actions"><button type="button" className="secondary" onClick={()=>{setBulkOpen(true);setBulkAction(null);setBulkCategory(dimension.categories[0].id)}}>Massfördela samtliga UO</button></div>}
 {dimension&&bulkOpen&&<div role="dialog" aria-modal="true" aria-label="Massfördelning för samtliga UO" className="panel" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
  <div className="panel" style={{background:'var(--surface, white)',color:'var(--text, #111)',width:'min(100%,540px)',maxHeight:'90vh',overflowY:'auto',padding:20}}>
   <h4>Massfördelning för samtliga UO</h4>
   <p>{dimension.name} · {year===0?'Samtliga år (grundfördelning)':year} · {units.length} UO. {year===0?'Tidigare årsundantag för berörda UO ersätts.':'Andra år påverkas inte.'}</p>
   {!bulkAction?<><label>100 % till kategori<select aria-label="Kategori för 100 procent" value={bulkCategory??dimension.categories[0].id} onChange={e=>setBulkCategory(e.target.value)}>{dimension.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <div className="actions"><button type="button" className="secondary" onClick={()=>setBulkAction('set')}>Fördela 100 %</button><button type="button" className="secondary" onClick={()=>setBulkAction('equal')}>Fördela jämnt</button><button type="button" className="secondary" onClick={()=>setBulkAction('clear')}>Rensa nuvarande</button></div></>:null}
   {bulkAction&&<div role="group" aria-label="Bekräfta massändring">{(()=>{const impact=previewBulkChange(data,dimension.id,year,units.map(u=>u.id));return <p>{bulkAction==='clear'?'Rensa regler':bulkAction==='equal'?'Fördela lika mellan alla kategorier':'Fördela 100 % till '+dimension.categories.find(c=>c.id===bulkCategory)?.name} för {impact.uos} UO. {impact.removedRules} befintliga regler ersätts eller tas bort, varav {impact.loRules} LO och {impact.overheadRules} UO Övergripande. {year===0?'Tidigare årsundantag ersätts.': 'Andra år påverkas inte.'} En revision sparas.</p>})()}<div className="actions"><button type="button" className="primary" disabled={bulkBusy} onClick={()=>void runBulk()}>Bekräfta massändring</button><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>setBulkAction(null)}>Tillbaka</button></div></div>}
   <button type="button" className="secondary" disabled={bulkBusy} onClick={()=>{setBulkOpen(false);setBulkAction(null)}}>Stäng</button>
  </div>
 </div>}
 {units.length===0?<p>Importera UO-data innan du gör en fördelning.</p>:<section aria-label="Översikt UO-fördelningar" className="panel">
  <h4>UO-fördelningar</h4>
  <p>{units.length} UO · {dimension&&canonicalData?units.filter(u=>{const v=allocationTypeOverview(canonicalData,gaps,data,dimension.id,year,[u.id]);return v.total>0&&v.unallocated<=Math.max(1e-7,v.total*1e-7)}).length:0} fullständigt fördelade</p>
  <div className="mapping-grid"><label>Sök UO<input aria-label="Sök UO" value={uoSearch} onChange={e=>setUoSearch(e.target.value)} placeholder="Filtrera på namn"/></label>
  <label>Status<select aria-label="Filtrera UO-status" value={uoFilter} onChange={e=>setUoFilter(e.target.value as 'all'|'configured'|'missing')}><option value="all">Alla UO</option><option value="configured">Fullständigt fördelade</option><option value="missing">Med ofördelade värden</option></select></label></div>
  {units.filter(u=>{const stats=dimension&&canonicalData?allocationTypeOverview(canonicalData,gaps,data,dimension.id,year,[u.id]):null;const configured=Boolean(stats&&stats.total>0&&stats.unallocated<=Math.max(1e-7,stats.total*1e-7));return label(u.id).toLocaleLowerCase('sv-SE').includes(uoSearch.trim().toLocaleLowerCase('sv-SE'))&&(uoFilter==='all'||configured===(uoFilter==='configured'))}).map(u=>{
  const stats=dimension&&canonicalData?allocationTypeOverview(canonicalData,gaps,data,dimension.id,year,[u.id]):null;
  const configured=Boolean(stats&&stats.total>0&&stats.unallocated<=Math.max(1e-7,stats.total*1e-7));
  const open=selectedUo===u.id;
  const scope:OptionalAllocationScope={kind:'uo',uoId:u.id},base=findRule(scope);
  const detailsOpen=expanded.includes(u.id);
  return <div key={u.id} className="panel" style={{marginTop:8}}>
   <button type="button" aria-expanded={open} className="secondary" onClick={()=>setSelectedUo(open?null:u.id)} style={{display:'block',width:'100%',textAlign:'left',padding:12}}>
    <strong>{label(u.id)} {open?'▾':'›'}</strong>
    <p>{u.los.length} LO · {stats?.total?configured?'Fullständigt fördelat':'Saknar helt eller delvis fördelning':'Inga tillämpliga värden'}</p>
    {stats&&stats.unallocated>0&&<p>Ofördelat: {stats.unallocated.toLocaleString('sv-SE',{maximumFractionDigits:1})} {dimension?.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}</p>}
   </button>
   {!open&&dimension?.categories.length===2&&canonicalData&&<PeriodSlider key={JSON.stringify([dimension.id,u.id,revision])} data={canonicalData} gaps={gaps} config={data} dimension={dimension} uoId={u.id} scope={{kind:'uo',uoId:u.id}} years={years} selected={year} onSelect={setYear} onSave={persist}/>}
   {open&&(dimension?.categories.length===2&&canonicalData?<WeightedUoEditor key={JSON.stringify([dimension.id,year,u.id])} data={canonicalData} gaps={gaps} config={data} dimension={dimension} year={year} onSelectYear={setYear} uoId={u.id} onSave={persist}/>:<div><button type="button" className="secondary" aria-expanded={detailsOpen} onClick={()=>setExpanded(prev=>detailsOpen?prev.filter(id=>id!==u.id):[...prev,u.id])}>{detailsOpen?'Dölj LO':'Visa LO'}</button>{renderRule(scope)}{detailsOpen&&<div style={{paddingLeft:12}}>{u.los.map(loId=><div key={loId}>{renderRule({kind:'lo',uoId:u.id,loId},base)}</div>)}{u.hasOverhead&&renderRule({kind:'uo-overhead',uoId:u.id},base)}</div>}</div>)}
  </div>;
  })}
 </section>}</>}
 </section>;
}
