import {useState} from 'react';
import type {CanonicalDataset,Metric,Activity} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import type {OptionalAllocations} from './optionalModel';
import type {OrganizationSelection} from '../analytics/organizationContext';
import {organizationScope} from '../analytics/organizationContext';
import type {UoGroupModel} from '../analytics/groupModels';
import {analyzeOptionalAllocation} from './optionalAnalysis';
import {analyzeCanonical} from '../analytics/canonicalQuery';

export default function OptionalAllocationAnalysis({data,state,config,metrics,activity,year,organization,groupModel}:{data:CanonicalDataset;state:GapState;config:OptionalAllocations;metrics:Metric[];activity:Activity|'all'|'allocated';year?:number;organization:OrganizationSelection;groupModel?:UoGroupModel}){
 const [active,setActive]=useState('resources');
 const isHours=metrics.every(m=>m.endsWith('_hours'));
 const isCosts=metrics.every(m=>m.endsWith('_cost'));
 const scope=organizationScope(data,organization,groupModel);
 const visible:{id:string;name:string;categories:{name:string;value:number}[];total:number;unallocated:number;unit:string;coverage:string;unknownCount:number}[]=[];
 const scopedUos=scope.uoIds.length?scope.uoIds:['uo:__none__'];
 const part=organization.level==='part'?organization.partId:undefined;
 const scoped=(selectedMetrics:Metric[],selectedActivity:Activity|'all'|'allocated')=>{
  let total=0,unknownCount=0;
  for(const uoId of scopedUos){
   const r=analyzeCanonical(data,state,{axis:'work',metrics:selectedMetrics,activity:selectedActivity,year,detailUoId:uoId,...(part?{detailPartId:part}:{})});
   total+=r.total;unknownCount+=r.unknownCount;
  }
  return {total,unknownCount};
 };
 let error='';
 try{
  if(isHours){
   const resourceCategories=[{name:'IT-timmar',value:metrics.includes('it_hours')?scoped(['it_hours'],activity).total:0},{name:'Verksamhetstimmar',value:metrics.includes('business_hours')?scoped(['business_hours'],activity).total:0}].filter(x=>x.value>0);
   visible.push({id:'resources',name:'IT-timmar / Verksamhetstimmar',categories:resourceCategories,total:resourceCategories.reduce((n,x)=>n+x.value,0),unallocated:0,unit:'h',coverage:'',unknownCount:0});
  }
  if(isHours||isCosts){
   const selectedMetrics=metrics;
   const id=isHours?'activities-hours':'activities-costs';
   const name=isHours?'Utveckling / Förvaltning – timmar':'Utveckling / Förvaltning – kronor';
   const dev=scoped(selectedMetrics,'development');
   const maint=scoped(selectedMetrics,'maintenance');
   const all=scoped(selectedMetrics,'all');
   const allocated=dev.total+maint.total;
   visible.push({id,name,categories:[{name:'Utveckling',value:dev.total},{name:'Förvaltning',value:maint.total}].filter(x=>x.value>0),total:all.total,unallocated:Math.max(0,all.total-allocated),unit:isHours?'h':'SEK',coverage:'',unknownCount:Math.max(dev.unknownCount,maint.unknownCount)});
  }
  for(const dimension of config.dimensions){
   if(!dimension.appliesTo.metrics.some(m=>metrics.includes(m)))continue;
   const result=analyzeOptionalAllocation(data,state,config,dimension.id,{year,metrics,activity,uoIds:scope.uoIds.length?scope.uoIds:['uo:__none__'],...(organization.level==='part'&&organization.partId?{partId:organization.partId}:{})});
   if(!result.visible)continue;
   visible.push({id:dimension.id,name:dimension.name,categories:dimension.categories.map(category=>({name:category.name,value:result.amounts[category.id]??0})),total:result.total,unallocated:result.unallocated,unit:result.unit,coverage:result.coverage,unknownCount:result.unknownCount});
  }
 }catch(e){error=String(e)}
 if(error)return <p role="alert">Kunde inte beräkna valfria fördelningar: {error}</p>;
 if(visible.length===0)return null;
 const current=visible.find(x=>x.id===active)??visible[0];
 const values=[...current.categories,...(current.unallocated>0.000001?[{name:'Ofördelat',value:current.unallocated}]:[])];
 const colors=['#2563eb','#0d9488','#b45309','#9333ea','#be123c','#64748b'];
 let cumulative=0;
 const slices=values.map((item,i)=>{const from=cumulative;cumulative+=current.total>0?item.value/current.total*100:0;return {item,color:colors[i%colors.length],from,to:cumulative}});
 const format=(value:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(value);
 return <section aria-label="Fördelningsanalys" className="panel">
  <h3>Fördelningsanalys</h3><p>Jämför standardfördelningar eller egna fördelningstyper med samma år, organisation, mått och aktivitet som i analysen.</p>
  <div className="mapping-grid">
   <label>Visa fördelning<select aria-label="Analysera fördelningstyp" value={current.id} onChange={e=>setActive(e.target.value)}>{visible.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  </div>
  <p><strong>Totalt: {format(current.total)} {current.unit}</strong>{current.unallocated>0.000001?'. Ofördelat: '+format(current.unallocated)+' '+current.unit+'.':''}</p>
  {current.total>0&&<div style={{display:'flex',flexWrap:'wrap',gap:24,alignItems:'center'}}>
   <div role="img" aria-label={current.name+': '+values.map(v=>v.name+' '+format(v.value)+' '+current.unit).join(', ')} style={{width:'min(200px,100%)',aspectRatio:'1',borderRadius:'50%',flexShrink:0,background:'conic-gradient('+slices.map(s=>s.color+' '+s.from+'% '+s.to+'%').join(', ')+')'}}/>
   <div>{slices.map(s=><p key={s.item.name} style={{margin:'4px 0'}}><span aria-hidden="true" style={{display:'inline-block',width:12,height:12,marginRight:8,background:s.color}}/>{s.item.name}: {format(s.item.value)} {current.unit}</p>)}</div>
  </div>}
  <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={'Fördelning '+current.name}><thead><tr><th>Kategori</th><th>Värde</th><th>Andel</th></tr></thead><tbody>{values.map(v=><tr key={v.name}><th scope="row">{v.name}</th><td>{format(v.value)} {current.unit}</td><td>{format(current.total?v.value/current.total*100:0)} %</td></tr>)}</tbody><tfoot><tr><th>Totalt</th><td>{format(current.total)} {current.unit}</td><td>{current.total>0?'100 %':'–'}</td></tr></tfoot></table></div>
  {current.unknownCount>0&&<p role="status" className="notice">Ofullständig aktivitetstäckning: {current.coverage}</p>}
 </section>;
}
