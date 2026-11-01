import {useEffect,useMemo,useState} from 'react';
import UoAnalysisNavigator from './UoAnalysisNavigator';
import OptionalAllocationAnalysis from '../allocations/OptionalAllocationAnalysis';
import {readOptionalAllocations,type OptionalAllocations} from '../allocations/optionalModel';
import {defaultOrganizationSelection,organizationScope,type OrganizationSelection} from './organizationContext';
import {readConfiguration} from '../config/store';
import type {UoGroupModel} from './groupModels';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,type GapState} from '../gaps/store';
import {analyzeCanonical} from './canonicalQuery';
import {prepareAnalysisDataset} from '../domain/preparedAnalysis';
import {canonicalTrend} from './canonicalTrend';
import {canonicalGroupYears} from './canonicalGroupYears';
import AnnualTrendReport from './AnnualTrendReport';
import CostTypeAnalysis from './CostTypeAnalysis';
import OrganizationYearLines from './OrganizationYearLines';
import {canonicalCsv} from './canonicalCsv';
import type {CanonicalDataset,Metric,ReportingAxis,Activity} from '../domain/canonical';
export default function CanonicalAnalytics({refreshKey}:{refreshKey:number;onOpenCompletions:()=>void}){
 const [data,setData]=useState<CanonicalDataset|null>(null),[state,setState]=useState<GapState>({requirements:[],resolutions:[]}),[error,setError]=useState('');
 const [axis,setAxis]=useState<ReportingAxis>('work'),[unit,setUnit]=useState<'hours'|'costs'>('hours'),[selectedActivities,setSelectedActivities]=useState<Array<'development'|'maintenance'>>(['development','maintenance']),[year,setYear]=useState('all'),[selected,setSelected]=useState<Metric[]>(['it_hours','business_hours','consultant_cost','other_cost']);
 useEffect(()=>{let alive=true;void Promise.all([loadCanonical(),loadGapState()]).then(([d,s])=>{if(alive){setData(d);setState(s);setError('')}}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[refreshKey]);
 // Annual reporting uses published annual records; monthly source rows remain preserved for future analyses.
 const annualData=useMemo(()=>{
  if(!data)return null;
  // Prefer annual records for an identical source, scope, metric and year.
  // Preserve month-only legacy imports until their annual replacement exists.
  const annualKeys=new Set(data.records.filter(r=>r.month===undefined).map(r=>JSON.stringify([r.source?.datasetId??r.workloadId.split('|')[0],r.scope,r.metric,r.year])));
  return {...data,allocationSourceRecords:data.records,records:data.records.filter(r=>r.month===undefined||!annualKeys.has(JSON.stringify([r.source?.datasetId??r.workloadId.split('|')[0],r.scope,r.metric,r.year])))};
 },[data]);
 const preparedData=useMemo(()=>annualData?prepareAnalysisDataset(annualData,state).dataset:null,[annualData,state]);
 const [organization,setOrganization]=useState<OrganizationSelection>(defaultOrganizationSelection);
 const [models,setModels]=useState<UoGroupModel[]>([]),[activeGroupModelId,setActiveGroupModelId]=useState('');
 const [optionalAllocations,setOptionalAllocations]=useState<OptionalAllocations|null>(null);
 useEffect(()=>{let active=true;readConfiguration().then(c=>{if(active){setModels(c?.sections.groups??[]);setActiveGroupModelId(c?.activeGroupModelId??'');setOptionalAllocations(readOptionalAllocations(c?.sections.optionalAllocations))}}).catch(()=>{if(active){setModels([]);setActiveGroupModelId('');setOptionalAllocations(null)}});return()=>{active=false}},[refreshKey]);

 const years=useMemo(()=>[...new Set((data?.records??[]).map(r=>r.year))].sort((a,b)=>a-b),[data]);
 const activity:Activity|'all'|'allocated'=unit==='costs'?'all':selectedActivities.length===2?'all':selectedActivities[0];
 const metrics:Metric[]=unit==='hours'?['it_hours','business_hours']:['consultant_cost','other_cost'];
 const choices=selected.filter(m=>metrics.includes(m));
 let result:ReturnType<typeof analyzeCanonical>|null=null;
 let trend:ReturnType<typeof canonicalTrend>=[];
 let groupYears:ReturnType<typeof canonicalGroupYears>|null=null;
 let queryError='';
 let costQuery:Parameters<typeof CostTypeAnalysis>[0]['query']|null=null;
 try{if(preparedData&&choices.length){const scope=organizationScope(preparedData!,organization,models.find(m=>m.id===activeGroupModelId)??models[0]);const query={axis,metrics:choices,activity,year:year==='all'?undefined:Number(year),datasetIds:[],uoIds:axis==='work'?(scope.uoIds.length?scope.uoIds:['uo:__no_matching_uo__']):[],loIds:[],organizationLevel:axis==='work'&&['all-uos','group'].includes(organization.level)?'uo' as const:undefined,groupModel:axis==='work'&&(organization.level==='groups'||organization.level==='all-uos'&&Boolean(activeGroupModelId))?(models.find(m=>m.id===activeGroupModelId)??models[0]):undefined,groupBy:'organization' as const,...(axis==='work'&&scope.detailUoId?{detailUoId:scope.detailUoId,...(scope.partId?{detailPartId:scope.partId}:{})}:{})};costQuery={...query,metrics:choices,activity:'all'};result=analyzeCanonical(preparedData,state,query);trend=canonicalTrend(preparedData,state,{...query,year:undefined});groupYears=canonicalGroupYears(preparedData,state,{...query,year:undefined})}}catch(e){queryError=String(e)}
 const labels:Record<Metric,string>={it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',consultant_cost:'Konsultkostnader',other_cost:'Övriga kostnader'};
 const format=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 return <section className="panel canonical-analytics"><h2>Analys av importerade uppgifter</h2><p>Alla importerade datakällor ingår. Välj budgetår och utforska UO-grupper, UO och LO genom organisationsnavigeringen.</p>
 {(error||queryError)&&<p role="alert">{error||queryError}</p>}
 {years.length>1&&year==='all'&&<p role="status" className="notice">Du visar just nu alla {years.length} år ({years[0]}–{years.at(-1)}). Totalen summerar flera år och är inte en årsbudget. Välj ett år nedan för att jämföra UO och LO inom ett enskilt budgetår.</p>}
 <p className="notice">Analysen använder årsvärden när både års- och månadsuppgifter finns för samma underlag. Månadsuppgifterna finns kvar i den underliggande datamodellen.</p>
 <section className="panel" aria-label="Analysurval"><h3>1. Välj analysurval</h3><p>Välj år, enhet, aktivitet och redovisning. Alla resultat nedan uppdateras för ditt urval.</p>
 <div className="mapping-grid">
 <div role="tablist" aria-label="Analysområde" style={{display:'flex',gap:8,gridColumn:'1 / -1'}}><button type="button" role="tab" aria-selected={unit==='hours'} onClick={()=>setUnit('hours')}>Timmar</button><button type="button" role="tab" aria-selected={unit==='costs'} onClick={()=>setUnit('costs')}>Kostnader</button></div>
 {unit==='hours'?<div className="mapping-grid" aria-label="Tim- och aktivitetsfilter">
 <fieldset><legend>Timmar</legend>{(['it_hours','business_hours'] as const).map(m=><label className="check" key={m}><input type="checkbox" aria-label={labels[m]} checked={choices.includes(m)} onChange={e=>setSelected(old=>e.target.checked?[...old,m]:old.length>1?old.filter(x=>x!==m):old)}/>{labels[m]}</label>)}</fieldset>
 <fieldset><legend>Aktivitet</legend>{(['development','maintenance'] as const).map(a=><label className="check" key={a}><input type="checkbox" aria-label={a==='development'?'Utveckling':'Förvaltning'} checked={selectedActivities.includes(a)} onChange={e=>setSelectedActivities(old=>e.target.checked?[...old,a]:old.length>1?old.filter(x=>x!==a):old)}/>{a==='development'?'Utveckling':'Förvaltning'}</label>)}</fieldset>
 </div>:<details><summary>Välj kostnadsmått – {choices.length} valda</summary><fieldset><legend>Kostnadsmått</legend>{metrics.map(m=><label className="check" key={m}><input type="checkbox" checked={choices.includes(m)} onChange={e=>setSelected(old=>e.target.checked?[...old,m]:old.length>1?old.filter(x=>x!==m):old)}/>{labels[m]}</label>)}</fieldset></details>}
 <div className="panel" aria-label="Välj analysår"><p><strong>Budgetår</strong> – använd ett enskilt år för att jämföra UO och LO. Alla år summerar hela perioden.</p><label>År<select aria-label="period" value={year} onChange={e=>setYear(e.target.value)}><option value="all">Alla år</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label></div>
 <section className="analysis-advanced-options" aria-label="Redovisning och gruppering"><h3>Redovisning och gruppering</h3><div className="mapping-grid"><label>Redovisning<select aria-label="organisation" value={axis} onChange={e=>setAxis(e.target.value as ReportingAxis)}><option value="work">UO och LO</option><option value="department">Avdelningar</option></select></label>

 </div></section>
 
 {axis==='work'&&activeGroupModelId&&<p className="notice">Varje UO tilldelas första matchande grupp i vald modell. UO utan grupp visas som Ej grupperad. Årssummor och jämförelser räknas fortfarande från källuppgifter.</p>}
 </div></section>
 {!data?<p>Hämtar analysdata…</p>:!data.records.length?<p>Inga data i analysmodellen. Importera ett Excelunderlag.</p>:!choices.length?<p>Välj minst ett mått.</p>:result?<><section className="analysis-summary" aria-label="Sammanfattning av analys"><h3>2. Sammanfattning</h3><p>Resultatet gäller valt urval och uppdateras när filtren ändras.</p><div className="canonical-result-head"><div><span>Totalt i vald redovisning</span><strong>{format(result.total)} {result.unit}</strong><small>{result.includedRecords} bidragande källposter i aktuellt urval</small></div></div><div className="actions"><button type="button" className="secondary" onClick={()=>{if(!result)return;const blob=new Blob([canonicalCsv(result,trend)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='analys.csv';link.click();URL.revokeObjectURL(url)}}>Exportera analys som CSV</button></div>
 {result.unknownCount>0&&<p role="status" className="notice">Ofullständig täckning: {result.coverage}</p>}
 {result.staleApprovals>0&&<p role="status" className="notice">{result.staleApprovals} sparade LO-justeringar är inaktuella efter ändrat källunderlag. Kontrollera dem under Fördelningar.</p>}
 </section>
 <section className="analysis-details" aria-label="Fördjupad analys"><h3>3. Fördjupning</h3><p>Utforska organisationen, fördelningarna och utvecklingen över tid.</p>
 {axis==='work'&&preparedData&&choices.length>0&&<UoAnalysisNavigator data={preparedData} state={state} models={models} metrics={choices} activity={activity} year={year==='all'?undefined:Number(year)} selection={organization} onSelectionChange={setOrganization} selectedModelId={activeGroupModelId}/>}
 {axis==='work'&&preparedData&&optionalAllocations&&<OptionalAllocationAnalysis data={preparedData} state={state} config={optionalAllocations} metrics={choices} activity={activity} year={year==='all'?undefined:Number(year)} organization={organization} groupModel={models.find(m=>m.id===activeGroupModelId)??models[0]}/>}
 {unit==='costs'&&axis==='work'&&preparedData&&costQuery&&<CostTypeAnalysis data={preparedData} state={state} query={costQuery} showTrend={year==='all'&&years.length>1}/>}
 {year==='all'&&years.length>1&&<><AnnualTrendReport trend={trend} metrics={choices}/>
 <OrganizationYearLines matrix={groupYears}/>
 <section className="organization-year-details" aria-label="Organisation per år för valt organisationsurval"><h3>Organisation per år</h3><p>Tabellen visar samma organisationsurval och år som diagrammet ovan. Streck betyder saknat värde, inte noll.</p>{groupYears&&groupYears.years.length>0?<div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Organisation per år"><thead><tr><th>Organisation</th>{groupYears.years.map(y=><th key={y}>{y}</th>)}<th>Totalt</th></tr></thead><tbody>{groupYears.rows.map(row=><tr key={row.key}><th scope="row">{row.label}</th>{row.values.map((value,i)=><td key={groupYears!.years[i]}>{value===null?'–':format(value)+' '+groupYears!.unit}</td>)}<td>{format(row.total)} {groupYears!.unit}</td></tr>)}</tbody><tfoot><tr><th scope="row">Totalt</th>{groupYears.yearTotals.map((value,i)=><td key={groupYears!.years[i]}>{format(value)} {groupYears!.unit}</td>)}<td>{format(groupYears.total)} {groupYears.unit}</td></tr></tfoot></table></div>:<p>Inga årsvärden för aktuellt urval.</p>}</section></>}

 </section></>:null}
 </section>;
}
