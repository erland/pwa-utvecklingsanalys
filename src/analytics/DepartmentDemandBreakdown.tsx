import {CHART_COLORS} from './charts';
import type {DepartmentDemandRow} from '../domain/departmentDemandAnalysis';

export default function DepartmentDemandBreakdown({title,rows,onSelect,showPlanningType=false}:{title:string;rows:DepartmentDemandRow[];onSelect?:(id:string)=>void;showPlanningType?:boolean}){
 const total=rows.reduce((sum,row)=>sum+row.total,0);
 const format=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 let offset=0;
 const stops=rows.filter(row=>row.total>0).map((row,i)=>{
  const start=offset;offset+=100*row.total/total;
  return {color:CHART_COLORS[i%CHART_COLORS.length],start,end:offset};
 });
 return <section aria-label={title}>
  <h4>{title}</h4>
  {total>0&&<div className="pie-layout" role="group" aria-label={'Cirkeldiagram: '+title}>
   <div className="pie-chart" role="img" aria-label={'Totalt '+format(total)+' timmar'} style={{background:'conic-gradient('+stops.map(s=>s.color+' '+s.start+'% '+s.end+'%').join(', ')+')'}}/>
   <ul className="pie-legend">{rows.filter(row=>row.total>0).map((row,i)=><li key={row.id}><span className="pie-swatch" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} aria-hidden="true"/>{onSelect?<button type="button" className="analysis-drilldown-label" onClick={()=>onSelect(row.id)}>{row.label}</button>:row.label}: {format(row.total)} h</li>)}</ul>
  </div>}
  <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={title}><thead><tr><th>{onSelect?'Organisation / avdelning':'Avdelning'}</th>{showPlanningType&&<th>Typ</th>}<th>Timmar</th><th>Andel</th></tr></thead><tbody>
  {rows.map(row=><tr key={row.id}><th scope="row">{onSelect?<button type="button" className="analysis-drilldown-label" onClick={()=>onSelect(row.id)}>{row.label}</button>:row.label}</th>{showPlanningType&&<td>{row.id.startsWith('project:')?'Projekt':'UO'}</td>}<td>{format(row.total)} h</td><td>{total>0?(100*row.total/total).toLocaleString('sv-SE',{maximumFractionDigits:1})+' %':'–'}</td></tr>)}
  </tbody><tfoot><tr><th scope="row">Totalt</th>{showPlanningType&&<td/>}<td>{format(total)} h</td><td>{total>0?'100 %':'–'}</td></tr></tfoot></table></div>
  {!rows.length&&<p>Inga avdelningstimmar för valt urval.</p>}
 </section>;
}
