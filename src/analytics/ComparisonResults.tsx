import {useState} from 'react';

export type ComparisonRow={key:string;label:string;value:number|null};
export default function ComparisonResults({rows,unit,title,totalLabel,onOpen,openLabel}:{rows:ComparisonRow[];unit:'h'|'SEK';title:string;totalLabel:string;onOpen?:(key:string)=>void;openLabel?:string}){
 const [display,setDisplay]=useState<'table'|'bars'>('table');
 const values=rows.map(row=>row.value).filter((v):v is number=>v!==null);
 const total=values.length===rows.length?values.reduce((sum,n)=>sum+n,0):null;
 const max=Math.max(1,...values);
 const format=(n:number|null)=>n===null?'Ej beräkningsbar':n.toLocaleString('sv-SE',{maximumFractionDigits:2})+' '+unit;
 return <section aria-label={title}>
  <div className="actions"><h3>{title}</h3><label>Presentation<select aria-label={'Presentation för '+title} value={display} onChange={e=>setDisplay(e.target.value as 'table'|'bars')}><option value="table">Tabell</option><option value="bars">Stapeldiagram</option></select></label></div>
  {display==='table'?<div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={title}>
   <thead><tr><th>Delområde</th><th>Värde</th><th>Andel</th>{onOpen&&<th>Fördjupning</th>}</tr></thead>
   <tbody>{rows.map(row=><tr key={row.key}><th scope="row">{row.label}</th><td>{format(row.value)}</td><td>{total!==null&&total>0&&row.value!==null?(100*row.value/total).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'–'}</td>{onOpen&&<td><button type="button" className="secondary" onClick={()=>onOpen(row.key)}>{openLabel??'Visa detaljer'}</button></td>}</tr>)}</tbody>
   <tfoot><tr><th scope="row">{totalLabel}</th><td>{format(total)}</td><td>{total!==null&&total>0?'100 %':'–'}</td>{onOpen&&<td/>}</tr></tfoot>
  </table></div>:<div className="canonical-trend" role="group" aria-label={'Stapeldiagram: '+title}>{rows.map(row=><div className="canonical-trend-row" key={row.key}><span>{row.label}</span><div className="canonical-trend-track"><div className="canonical-trend-fill" style={{width:row.value===null?'0%':100*row.value/max+'%'}}/></div><strong>{format(row.value)}</strong>{onOpen&&<button type="button" className="secondary" onClick={()=>onOpen(row.key)}>{openLabel??'Visa detaljer'}</button>}</div>)}</div>}
  {!rows.length&&<p>Inga delområden att visa för aktuellt urval.</p>}
 </section>;
}
