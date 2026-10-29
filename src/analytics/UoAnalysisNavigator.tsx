import {useState} from 'react';
import type {OrganizationSelection} from './organizationContext';
import type {CanonicalDataset,Metric,Activity} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import type {UoGroupModel} from './groupModels';
import {groupForUo} from './groupModels';
import {analyzeCanonical} from './canonicalQuery';
import UoDetailBreakdown from './UoDetailBreakdown';
import ComparisonResults from './ComparisonResults';
import {uoActivityRows,addActivitySplits} from './activityBreakdown';

type Entry='groups'|'uos';
type View={entry:Entry;groupId?:string;uoId?:string};
const name=(id:string)=>decodeURIComponent(id.startsWith('uo:')?id.slice(3):id);
export default function UoAnalysisNavigator({data,state,models,metrics,activity,year,selection,onSelectionChange,selectedModelId,onModelChange}:{data:CanonicalDataset;state:GapState;models:UoGroupModel[];metrics:Metric[];activity:Activity|'all';year?:number;selection?:OrganizationSelection;onSelectionChange?:(next:OrganizationSelection)=>void;selectedModelId?:string;onModelChange?:(id:string)=>void}){
 const [localView,setView]=useState<View>({entry:'uos'});
 const view:View=selection?{entry:selection.level==='groups'||selection.level==='group'?'groups':selection.groupId?'groups':'uos',groupId:selection.groupId,uoId:selection.uoId}:localView;
 const [modelId,setModelId]=useState('');
 const model=models.find(x=>x.id===(selectedModelId??modelId))??models[0];
 const uos=[...new Set(data.records.filter(r=>r.scope.axis==='work').map(r=>r.scope.axis==='work'?r.scope.uoId:''))].filter(Boolean).sort((a,b)=>name(a).localeCompare(name(b),'sv'));
 const membership=(id:string)=>model?groupForUo(model,id)?.id??'unassigned':'unassigned';
 const groups=model?[...model.groups.map(g=>({id:g.id,label:g.name})),...(uos.some(id=>membership(id)==='unassigned')?[{id:'unassigned',label:'Ej grupperad'}]:[])]:[];
 const displayedUos=view.entry==='groups'&&view.groupId?uos.filter(id=>membership(id)===view.groupId):uos;
 const activityRows=(id:string)=>{
  try{return addActivitySplits(Object.values(uoActivityRows(data,state,metrics,year,id)))}catch{return null}
 };
 const metricValue=(id:string)=>{
  try{return analyzeCanonical(data,state,{axis:'work',metrics,activity,year,detailUoId:id}).total}
  catch{return null}
 };

 const show=(next:View)=>{setView(next);
  if(onSelectionChange)onSelectionChange(next.uoId?{level:'uo',uoId:next.uoId,groupId:next.groupId}:next.groupId?{level:'group',groupId:next.groupId}:next.entry==='groups'?{level:'groups'}:{level:'all-uos'});
 };
 return <section aria-label="Utforska UO" className="mapping-settings">
  <h3>Utforska organisationen</h3>
  <p>Välj UO-grupper eller Alla UO. Samma val av timmar, kostnader, aktivitet och år följer med ned till LO och UO Övergripande.</p>
  <div className="actions">
   <button type="button" className="secondary" aria-pressed={view.entry==='groups'} onClick={()=>show({entry:'groups'})}>UO-grupper</button>
   <button type="button" className="secondary" aria-pressed={view.entry==='uos'} onClick={()=>show({entry:'uos'})}>Alla UO</button>
  </div>
  {view.entry==='groups'&&<label>Gruppindelning<select aria-label="Gruppindelning för analys" value={model?.id??''} onChange={e=>{setModelId(e.target.value);onModelChange?.(e.target.value);show({entry:'groups'})}}>
   {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
  </select></label>}
  {view.entry==='groups'&&!model&&<p>Skapa en UO-gruppmodell under Grupper för att jämföra grupper. Du kan redan nu använda Alla UO.</p>}
  <nav aria-label="Analysnivå" className="actions">
   <button type="button" className="secondary" onClick={()=>show({entry:view.entry})}>{view.entry==='groups'?'UO-grupper':'Alla UO'}</button>
   {view.groupId&&<><span aria-hidden="true">›</span><button type="button" className="secondary" onClick={()=>show({entry:'groups',groupId:view.groupId})}>{groups.find(g=>g.id===view.groupId)?.label??'Grupp'}</button></>}
   {view.uoId&&<><span aria-hidden="true">›</span><strong>{name(view.uoId)}</strong></>}
  </nav>
  {view.uoId?<UoDetailBreakdown selectedUoId={view.uoId} data={data} state={state} metrics={metrics} activity={activity} year={year}/>:view.entry==='groups'&&!view.groupId&&model?
   <ComparisonResults title="UO-grupper i analys" totalLabel="Totalt grupper" unit={metrics.every(m=>m.endsWith('_hours'))?'h':'SEK'} rows={groups.map(g=>{
    const ids=uos.filter(id=>membership(id)===g.id);
    const values=ids.map(metricValue);
    const splits=ids.map(activityRows);return {key:g.id,label:g.label,value:values.every(v=>v!==null)?values.reduce<number>((sum,v)=>sum+(v??0),0):null,split:activity==='all'&&splits.every(v=>v!==null)?addActivitySplits(splits.filter((v):v is NonNullable<typeof v>=>v!==null)):undefined};
   })} openLabel="Visa UO" onOpen={id=>show({entry:'groups',groupId:id})}/>:
   <ComparisonResults title="UO i analys" totalLabel="Totalt UO" unit={metrics.every(m=>m.endsWith('_hours'))?'h':'SEK'} rows={displayedUos.map(id=>({key:id,label:name(id),value:metricValue(id),split:activity==='all'?activityRows(id)??undefined:undefined}))} openLabel="Visa LO" onOpen={id=>show({entry:view.entry,groupId:view.groupId,uoId:id})}/>}

 </section>;
}
