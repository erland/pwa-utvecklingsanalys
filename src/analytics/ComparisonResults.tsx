import {useState} from 'react';
import type {ActivitySplit} from './activityBreakdown';

export type ComparisonRow={key:string;label:string;value:number|null;split?:ActivitySplit};
export default function ComparisonResults({rows,unit,title,totalLabel,onOpen,openLabel}:{rows:ComparisonRow[];unit:'h'|'SEK';title:string;totalLabel:string;onOpen?:(key:string)=>void;openLabel?:string}){
 const [display,setDisplay]=useState<'table'|'bars'|'distribution'>('table');
 const [activityOrder,setActivityOrder]=useState<'original'|'development'|'maintenance'>('original');
 const orderedRows=display==='distribution'&&activityOrder!=='original'?[...rows].sort((a,b)=>{const difference=(b.split?.[activityOrder]??-1)-(a.split?.[activityOrder]??-1);return difference||a.label.localeCompare(b.label,'sv')}):rows;
 const values=rows.map(row=>row.value).filter((v):v is number=>v!==null);
 const total=values.length===rows.length?values.reduce((sum,n)=>sum+n,0):null;
 const max=Math.max(1,...values);
 const splitRows=rows.filter(row=>row.split!==undefined);
 const completeSplits=splitRows.length===rows.length&&rows.length>0;
 const sumSplit=(key:'development'|'maintenance'|'unallocated')=>splitRows.reduce((sum,row)=>sum+(row.split?.[key]??0),0);
 const developmentSum=sumSplit('development'),maintenanceSum=sumSplit('maintenance'),unallocatedSum=sumSplit('unallocated');

 const format=(n:number|null)=>n===null?'Ej beräkningsbar':n.toLocaleString('sv-SE',{maximumFractionDigits:2})+' '+unit;
 return <section aria-label={title}>
  <div className="actions"><h3>{title}</h3><label>Presentation<select aria-label={'Presentation för '+title} value={display} onChange={e=>setDisplay(e.target.value as 'table'|'bars'|'distribution')}><option value="table">Tabell</option><option value="bars">Stapeldiagram</option>{rows.some(row=>row.split)&&<option value="distribution">Utveckling / Förvaltning</option>}</select></label></div>
  {display==='distribution'?<div className="canonical-trend" role="group" aria-label={'Fördelning: '+title}>
   <p>Utveckling, förvaltning och ej fördelad aktivitet. Ej fördelat innebär att fördelningen saknas eller inte är godkänd.</p>
   {completeSplits&&<p role="status">Sammanlagt för visade delområden: utveckling {format(developmentSum)}, förvaltning {format(maintenanceSum)}{unallocatedSum>0?', ej fördelat '+format(unallocatedSum):''}. Jämför respektive delområdes bidrag nedan.</p>}
   {!completeSplits&&<p role="status">Alla delområden har inte en beräkningsbar aktivitetsfördelning. Någon fullständig sammanställning visas därför inte.</p>}
   <label>Sortera delområden<select aria-label={'Sortera fördelning: '+title} value={activityOrder} onChange={e=>setActivityOrder(e.target.value as 'original'|'development'|'maintenance')}><option value="original">Ursprunglig ordning</option><option value="development">Störst utvecklingsbidrag först</option><option value="maintenance">Störst förvaltningsbidrag först</option></select></label>
   {orderedRows.map(row=>{const v=row.split;const pct=(n:number)=>v&&v.total>0?100*n/v.total:0;return <div className="canonical-trend-row" key={row.key}>
    <span>{row.label}</span>
    {v?<div className="canonical-trend-track" role="img" aria-label={row.label+': utveckling '+format(v.development)+', förvaltning '+format(v.maintenance)+', ej fördelat '+format(v.unallocated)} style={{display:'flex',overflow:'hidden'}}>
     <div style={{width:pct(v.development)+'%',background:'#26768c',minHeight:16}}/>
     <div style={{width:pct(v.maintenance)+'%',background:'#c66d26',minHeight:16}}/>
     <div style={{width:pct(v.unallocated)+'%',background:'#9ca3af',minHeight:16}}/>
    </div>:<span>Fördelning saknas</span>}
    <div><strong>{format(row.value)}</strong>{v&&<small style={{display:'block'}}>Utveckling {pct(v.development).toLocaleString('sv-SE',{maximumFractionDigits:1})} % · Förvaltning {pct(v.maintenance).toLocaleString('sv-SE',{maximumFractionDigits:1})} %{v.unallocated>0?' · Ej fördelat '+pct(v.unallocated).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':''}</small>}</div>{onOpen&&<button type="button" className="secondary" onClick={()=>onOpen(row.key)}>{openLabel??'Visa detaljer'}</button>}
   </div>})}
   <p>Blå: utveckling · Orange: förvaltning · Grå: ej fördelat</p>
  </div>:display==='table'?<div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={title}>
   <thead><tr><th>Delområde</th><th>Värde</th><th>Andel</th>{onOpen&&<th>Fördjupning</th>}</tr></thead>
   <tbody>{rows.map(row=><tr key={row.key}><th scope="row">{row.label}</th><td>{format(row.value)}</td><td>{total!==null&&total>0&&row.value!==null?(100*row.value/total).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'–'}</td>{onOpen&&<td><button type="button" className="secondary" onClick={()=>onOpen(row.key)}>{openLabel??'Visa detaljer'}</button></td>}</tr>)}</tbody>
   <tfoot><tr><th scope="row">{totalLabel}</th><td>{format(total)}</td><td>{total!==null&&total>0?'100 %':'–'}</td>{onOpen&&<td/>}</tr></tfoot>
  </table></div>:<div className="canonical-trend" role="group" aria-label={'Stapeldiagram: '+title}>{rows.map(row=><div className="canonical-trend-row" key={row.key}><span>{row.label}</span><div className="canonical-trend-track"><div className="canonical-trend-fill" style={{width:row.value===null?'0%':100*row.value/max+'%'}}/></div><strong>{format(row.value)}</strong>{onOpen&&<button type="button" className="secondary" onClick={()=>onOpen(row.key)}>{openLabel??'Visa detaljer'}</button>}</div>)}</div>}
  {!rows.length&&<p>Inga delområden att visa för aktuellt urval.</p>}
 </section>;
}
