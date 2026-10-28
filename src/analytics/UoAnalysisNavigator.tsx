import {useState} from 'react';
import type {CanonicalDataset,Metric,Activity} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import type {UoGroupModel} from './groupModels';
import {groupForUo} from './groupModels';
import {analyzeCanonical} from './canonicalQuery';
import UoDetailBreakdown from './UoDetailBreakdown';

type Entry='groups'|'uos';
type View={entry:Entry;groupId?:string;uoId?:string};
const name=(id:string)=>decodeURIComponent(id.startsWith('uo:')?id.slice(3):id);
export default function UoAnalysisNavigator({data,state,models,metrics,activity,year}:{data:CanonicalDataset;state:GapState;models:UoGroupModel[];metrics:Metric[];activity:Activity|'all';year?:number}){
 const [view,setView]=useState<View>({entry:'uos'});
 const [modelId,setModelId]=useState('');
 const model=models.find(x=>x.id===modelId)??models[0];
 const uos=[...new Set(data.records.filter(r=>r.scope.axis==='work').map(r=>r.scope.axis==='work'?r.scope.uoId:''))].filter(Boolean).sort((a,b)=>name(a).localeCompare(name(b),'sv'));
 const membership=(id:string)=>model?groupForUo(model,id)?.id??'unassigned':'unassigned';
 const groups=model?[...model.groups.map(g=>({id:g.id,label:g.name})),...(uos.some(id=>membership(id)==='unassigned')?[{id:'unassigned',label:'Ej grupperad'}]:[])]:[];
 const displayedUos=view.entry==='groups'&&view.groupId?uos.filter(id=>membership(id)===view.groupId):uos;
 const metricValue=(id:string)=>{
  try{return analyzeCanonical(data,state,{axis:'work',metrics,activity,year,detailUoId:id}).total}
  catch{return null}
 };
 const format=(v:number|null)=>v===null?'Ej beräkningsbar':v.toLocaleString('sv-SE',{maximumFractionDigits:2});
 const show=(next:View)=>setView(next);
 return <section aria-label="Utforska UO" className="mapping-settings">
  <h3>Utforska organisationen</h3>
  <p>Välj UO-grupper eller Alla UO. Samma val av timmar, kostnader, aktivitet och år följer med ned till LO och UO Övergripande.</p>
  <div className="actions">
   <button type="button" className="secondary" aria-pressed={view.entry==='groups'} onClick={()=>show({entry:'groups'})}>UO-grupper</button>
   <button type="button" className="secondary" aria-pressed={view.entry==='uos'} onClick={()=>show({entry:'uos'})}>Alla UO</button>
  </div>
  {view.entry==='groups'&&<label>Gruppindelning<select aria-label="Gruppindelning för analys" value={model?.id??''} onChange={e=>{setModelId(e.target.value);show({entry:'groups'})}}>
   {models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
  </select></label>}
  {view.entry==='groups'&&!model&&<p>Skapa en UO-gruppmodell under Grupper för att jämföra grupper. Du kan redan nu använda Alla UO.</p>}
  <nav aria-label="Analysnivå" className="actions">
   <button type="button" className="secondary" onClick={()=>show({entry:view.entry})}>{view.entry==='groups'?'UO-grupper':'Alla UO'}</button>
   {view.groupId&&<><span aria-hidden="true">›</span><button type="button" className="secondary" onClick={()=>show({entry:'groups',groupId:view.groupId})}>{groups.find(g=>g.id===view.groupId)?.label??'Grupp'}</button></>}
   {view.uoId&&<><span aria-hidden="true">›</span><strong>{name(view.uoId)}</strong></>}
  </nav>
  {view.uoId?<UoDetailBreakdown selectedUoId={view.uoId} data={data} state={state} metrics={metrics} activity={activity} year={year}/>:view.entry==='groups'&&!view.groupId&&model?
   <table className="canonical-table" aria-label="UO-grupper i analys"><thead><tr><th>UO-grupp</th><th>Värde</th><th>Öppna</th></tr></thead><tbody>
    {groups.map(g=>{const ids=uos.filter(id=>membership(id)===g.id);const values=ids.map(metricValue);const total=values.every(v=>v!==null)?values.reduce<number>((sum,v)=>sum+(v??0),0):null;return <tr key={g.id}><th scope="row">{g.label}</th><td>{format(total)}</td><td><button type="button" className="secondary" onClick={()=>show({entry:'groups',groupId:g.id})}>Visa UO</button></td></tr>})}
   </tbody></table>:
   <table className="canonical-table" aria-label="UO i analys"><thead><tr><th>UO</th><th>Värde</th><th>Öppna</th></tr></thead><tbody>
    {displayedUos.map(id=><tr key={id}><th scope="row">{name(id)}</th><td>{format(metricValue(id))}</td><td><button type="button" className="secondary" onClick={()=>show({entry:view.entry,groupId:view.groupId,uoId:id})}>Visa LO</button></td></tr>)}
   </tbody></table>}
 </section>;
}
