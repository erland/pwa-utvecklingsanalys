import type {ActivitySplit} from './activityBreakdown';
import {CHART_COLORS} from './charts';

export type ComparisonRow={key:string;label:string;value:number|null;split?:ActivitySplit};
export default function ComparisonResults({rows,unit,title,totalLabel,onOpen}:{rows:ComparisonRow[];unit:'h'|'SEK';title:string;totalLabel:string;onOpen?:(key:string)=>void}){
 const values=rows.map(row=>row.value).filter((v):v is number=>v!==null);
 const total=values.length===rows.length?values.reduce((sum,n)=>sum+n,0):null;
 const pieEligible=rows.length>1&&total!==null&&total>0&&rows.every(r=>r.value!==null&&Number.isFinite(r.value)&&r.value>=0);
 const pieRows=pieEligible?rows.map((row,i)=>({row,color:CHART_COLORS[i%CHART_COLORS.length],percent:100*(row.value??0)/total!})):[];
 let pieOffset=0;
 const pieGradient=pieRows.map(x=>{const start=pieOffset;pieOffset+=x.percent;return `${x.color} ${start}% ${pieOffset}%`}).join(', ');
 const clickableLabel=(row:ComparisonRow)=>onOpen?<button type="button" className="analysis-drilldown-label" style={{appearance:"none",background:"transparent",border:0,padding:0,color:"inherit",font:"inherit",fontWeight:600,textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer",textAlign:"left"}} onClick={()=>onOpen(row.key)}>{row.label}</button>:row.label;
 const format=(n:number|null)=>n===null?'Ej beräkningsbar':n.toLocaleString('sv-SE',{maximumFractionDigits:2})+' '+unit;
 return <section aria-label={title}>
  <h3>{title}</h3>
  {pieEligible?<div className="pie-layout" role="group" aria-label={'Cirkeldiagram: '+title}><div className="pie-chart" role="img" aria-label={'Andelar av totalt '+format(total)} style={{background:'conic-gradient('+pieGradient+')'}}/><ul className="pie-legend">{pieRows.map(({row,color,percent})=><li key={row.key}><span className="pie-swatch" style={{backgroundColor:color}} aria-hidden="true"/><span>{clickableLabel(row)}: {format(row.value)} ({percent.toLocaleString('sv-SE',{maximumFractionDigits:1})} %)</span></li>)}</ul></div>:<div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={title}>
   <thead><tr><th>Delområde</th><th>Värde</th><th>Andel</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.key}><th scope="row">{clickableLabel(row)}</th><td>{format(row.value)}</td><td>{total!==null&&total>0&&row.value!==null?(100*row.value/total).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'–'}</td></tr>)}</tbody>
   <tfoot><tr><th scope="row">{totalLabel}</th><td>{format(total)}</td><td>{total!==null&&total>0?'100 %':'–'}</td></tr></tfoot>
  </table></div>}
  {!rows.length&&<p>Inga delområden att visa för aktuellt urval.</p>}
 </section>;
}
