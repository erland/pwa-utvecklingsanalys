import {useState} from 'react';
import type {CanonicalDataset,Metric,Activity} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import type {OptionalAllocations} from './optionalModel';
import type {OrganizationSelection} from '../analytics/organizationContext';
import {organizationScope} from '../analytics/organizationContext';
import type {UoGroupModel} from '../analytics/groupModels';
import {analyzeOptionalAllocation} from './optionalAnalysis';

export default function OptionalAllocationAnalysis({data,state,config,metrics,activity,year,organization,groupModel}:{data:CanonicalDataset;state:GapState;config:OptionalAllocations;metrics:Metric[];activity:Activity|'all'|'allocated';year?:number;organization:OrganizationSelection;groupModel?:UoGroupModel}){
 const [mode,setMode]=useState<'pie'|'table'>('pie');
 const [active,setActive]=useState('');
 const scope=organizationScope(data,organization,groupModel);
 const visible:{id:string;name:string;categories:{name:string;value:number}[];total:number;unallocated:number;unit:string;coverage:string;unknownCount:number}[]=[];
 let error='';
 try{
  for(const dimension of config.dimensions){
   const result=analyzeOptionalAllocation(data,state,config,dimension.id,{year,metrics,activity,uoIds:scope.uoIds.length?scope.uoIds:['uo:__none__'],...(organization.level==='part'&&organization.partId?{partId:organization.partId}:{})});
   if(!result.visible)continue;
   visible.push({id:dimension.id,name:dimension.name,categories:dimension.categories.map(category=>({name:category.name,value:result.amounts[category.id]??0})),total:result.total,unallocated:result.unallocated,unit:result.unit,coverage:result.coverage,unknownCount:result.unknownCount});
  }
 }catch(e){error=String(e)}
 if(error)return <p role="alert">Kunde inte beräkna valfria fördelningar: {error}</p>;
 if(visible.length===0)return null;
 const current=visible.find(x=>x.id===active)??visible[0];
 const values=[...current.categories,...(current.unallocated>0?[{name:'Ofördelat',value:current.unallocated}]:[])];
 const colors=['#2563eb','#0d9488','#b45309','#9333ea','#be123c','#64748b'];
 let cumulative=0;
 const slices=values.map((item,i)=>{const from=cumulative;cumulative+=current.total>0?item.value/current.total*100:0;return {item,color:colors[i%colors.length],from,to:cumulative}});
 const format=(value:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(value);
 return <section aria-label="Valfria fördelningar i analysen" className="panel">
  <h3>Valfria fördelningar</h3><p>Fördelningen avser samma urval av år, organisation, mått och aktivitet som analysen ovan. Timmar och kronor räknas aldrig samman.</p>
  <div className="mapping-grid">
   <label>Fördelningstyp<select aria-label="Analysera fördelningstyp" value={current.id} onChange={e=>setActive(e.target.value)}>{visible.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   <label>Presentation<select aria-label="Presentera fördelning" value={mode} onChange={e=>setMode(e.target.value as 'pie'|'table')}><option value="pie">Cirkeldiagram och tabell</option><option value="table">Endast tabell</option></select></label>
  </div>
  <p><strong>Totalt: {format(current.total)} {current.unit}</strong>. Ofördelat: {format(current.unallocated)} {current.unit}.</p>
  {mode==='pie'&&current.total>0&&<div style={{display:'flex',flexWrap:'wrap',gap:24,alignItems:'center'}}>
   <div role="img" aria-label={current.name+': '+values.map(v=>v.name+' '+format(v.value)+' '+current.unit).join(', ')} style={{width:'min(200px,100%)',aspectRatio:'1',borderRadius:'50%',flexShrink:0,background:'conic-gradient('+slices.map(s=>s.color+' '+s.from+'% '+s.to+'%').join(', ')+')'}}/>
   <div>{slices.map(s=><p key={s.item.name} style={{margin:'4px 0'}}><span aria-hidden="true" style={{display:'inline-block',width:12,height:12,marginRight:8,background:s.color}}/>{s.item.name}: {format(s.item.value)} {current.unit}</p>)}</div>
  </div>}
  <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={'Fördelning '+current.name}><thead><tr><th>Kategori</th><th>Värde</th><th>Andel</th></tr></thead><tbody>{values.map(v=><tr key={v.name}><th scope="row">{v.name}</th><td>{format(v.value)} {current.unit}</td><td>{format(current.total?v.value/current.total*100:0)} %</td></tr>)}</tbody><tfoot><tr><th>Totalt</th><td>{format(current.total)} {current.unit}</td><td>100 %</td></tr></tfoot></table></div>
  {current.unknownCount>0&&<p role="status" className="notice">Ofullständig aktivitetstäckning: {current.coverage}</p>}
 </section>;
}
