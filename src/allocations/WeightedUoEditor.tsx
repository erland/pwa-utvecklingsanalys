import {useMemo,useRef,useState} from 'react';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import type {OptionalAllocations,OptionalAllocationDimension,OptionalAllocationScope} from './optionalModel';
import {percentagesFor} from './weightedSync';
import {applyProportionalScope} from './proportionalScope';

const name=(id:string)=>decodeURIComponent(id.split(':').at(-1)??id);
const format=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n);
const partScope=(uoId:string,key:string):OptionalAllocationScope=>key===uoId||key==='uo-overhead:'+uoId?{kind:'uo-overhead',uoId}:{kind:'lo',uoId,loId:key};
const activity=(dimension:OptionalAllocationDimension)=>dimension.appliesTo.activities==='all'||dimension.appliesTo.activities.length===2?'all' as const:dimension.appliesTo.activities[0];
type Props={data:CanonicalDataset;gaps:GapState;config:OptionalAllocations;dimension:OptionalAllocationDimension;uoId:string;onSave:(next:OptionalAllocations)=>Promise<void>};

function PeriodSlider({data,gaps,config,dimension,uoId,scope,years,onSave}:{data:CanonicalDataset;gaps:GapState;config:OptionalAllocations;dimension:OptionalAllocationDimension;uoId:string;scope:OptionalAllocationScope;years:number[];onSave:Props['onSave']}){
 const [selected,setSelected]=useState(0),[pending,setPending]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pendingRef=useRef<number|null>(null),saving=useRef(false);
 const first=dimension.categories[0].id;
 const isUo=scope.kind==='uo';
 const displayName=isUo?'UO '+name(uoId):scope.kind==='uo-overhead'?'UO Övergripande':name(scope.loId);
 const detail=useMemo(()=>{
  let hours=0,allocated=0;
  for(const y of selected===0?years:[selected]){
   const result=analyzeCanonical(data,gaps,{axis:'work',metrics:dimension.appliesTo.metrics,activity:activity(dimension),year:y,detailUoId:uoId});
   for(const row of result.rows){
    if(!isUo&&(scope.kind==='lo'?row.key!==scope.loId:row.key!==uoId&&row.key!=='uo-overhead:'+uoId))continue;
    if(row.value<=0)continue;
    const current=percentagesFor(config,dimension.id,y,partScope(uoId,row.key),dimension.categories.map(c=>c.id));
    hours+=row.value;allocated+=row.value*(current[first]??0)/100;
   }
  }
  return {hours,percent:hours?allocated/hours*100:0};
 },[data,gaps,config,dimension,uoId,scope,selected,years,first,isUo]);
 const value=pending??detail.percent;
 const select=(y:number)=>{if(busy)return;pendingRef.current=null;setPending(null);setError('');setSelected(y)};
 const save=async()=>{
  const target=pendingRef.current;
  if(target===null||saving.current)return;
  saving.current=true;setBusy(true);setError('');
  try{
   await onSave(applyProportionalScope(data,gaps,config,dimension,{uoId,year:selected,...(scope.kind==='lo'?{loId:scope.loId}:scope.kind==='uo-overhead'?{overhead:true}:{})},target));
   pendingRef.current=null;setPending(null);
  }catch(e){setError('Kunde inte spara: '+String(e))}
  finally{saving.current=false;setBusy(false)}
 };
 const sliderLabel=selected===0?displayName+' – Fördelningsreglage':isUo?'UO årsfördelning '+selected: 'Årsfördelning '+selected;
 return <section aria-label={'Fördelning '+displayName} className="panel" style={{marginTop:8,padding:12,minWidth:0}}>
  <strong>{displayName}</strong>
  <div className="actions" aria-label={'Period '+displayName} style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:8,marginBottom:8}}>
   {[0,...years].map(y=><button type="button" key={y} className={selected===y?'primary':'secondary'} aria-pressed={selected===y} disabled={busy} onClick={()=>select(y)} style={{padding:'6px 10px',minWidth:42}}>{y===0?'Alla':y}</button>)}
  </div>
  <label>{dimension.categories[0].name}: {format(value)} % · {dimension.categories[1].name}: {format(100-value)} %
   <input type="range" min="0" max="100" step="0.1" aria-label={sliderLabel} value={value} disabled={busy||detail.hours<=0} onChange={e=>{const next=Number(e.target.value);pendingRef.current=next;setPending(next)}} onPointerUp={()=>void save()} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))void save()}} onBlur={()=>void save()} style={{display:'block',width:'100%'}}/>
  </label>
  <small>{format(detail.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} · {selected===0?'Samtliga år':selected}</small>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
export default function WeightedUoEditor({data,gaps,config,dimension,uoId,onSave}:Props & {year:number}){
 const years=useMemo(()=>[...new Set(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===uoId).map(r=>r.year))].sort(),[data,uoId]);
 const parts=useMemo(()=>{
  const keys=new Set<string>();
  for(const y of years){
   const detail=analyzeCanonical(data,gaps,{axis:'work',metrics:dimension.appliesTo.metrics,activity:activity(dimension),year:y,detailUoId:uoId});
   for(const row of detail.rows)if(row.value>0)keys.add(row.key);
  }
  return [...keys];
 },[data,gaps,dimension,uoId,years]);
 return <section className="panel" aria-label={'Timviktad fördelning '+name(uoId)} style={{minWidth:0,marginTop:12}}>
  <h4>{name(uoId)} – LO-översikt</h4>
  <PeriodSlider key={'uo-'+uoId} data={data} gaps={gaps} config={config} dimension={dimension} uoId={uoId} scope={{kind:'uo',uoId}} years={years} onSave={onSave}/>
  <div aria-label="LO-översikt">{parts.map(key=><PeriodSlider key={key} data={data} gaps={gaps} config={config} dimension={dimension} uoId={uoId} scope={partScope(uoId,key)} years={years} onSave={onSave}/>)}</div>
 </section>;
}
