import {CHART_COLORS} from './charts';
import {analyzeDepartmentDemand} from '../domain/departmentDemandAnalysis';
import type {DepartmentDemandObservation} from '../domain/semantic';

export default function DepartmentDemandTrend({records,metrics,selectedDepartment}:{records:readonly DepartmentDemandObservation[];metrics:readonly ('it_hours'|'business_hours')[];selectedDepartment?:string}){
 const years=[...new Set(records.filter(r=>metrics.includes(r.metric)).map(r=>r.year))].sort((a,b)=>a-b);
 if(years.length<2)return null;
 const perspective=selectedDepartment?'uo':'department';
 const data=years.map(year=>analyzeDepartmentDemand(selectedDepartment?records.filter(r=>(r.departmentCode||r.departmentName.trim().toLocaleLowerCase('sv-SE'))===selectedDepartment):records,{perspective,year,metrics}));
 const identities=new Map<string,string>();
 for(const d of data)for(const r of d.rows)identities.set(r.id,r.label);
 const series=[...identities].map(([id,label])=>({id,label,values:data.map(d=>d.rows.find(r=>r.id===id)?.total??null)}));
 if(!series.length)return null;
 const fmt=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 const width=560,height=240,left=56,right=16,top=20,bottom=40;
 const max=Math.max(1,...series.flatMap(s=>s.values.filter((v):v is number=>v!==null)));
 const x=(i:number)=>left+i*(width-left-right)/(years.length-1);
 const y=(v:number)=>height-bottom-v/max*(height-top-bottom);
 const path=(values:(number|null)[])=>{let started=false;return values.map((v,i)=>{if(v===null){started=false;return ''}const command=(started?'L':'M')+x(i)+' '+y(v);started=true;return command}).join(' ')};
 return <section className="panel" aria-label="Utveckling av avdelningsbehov">
  <h3>{selectedDepartment?'Utveckling av efterfrågan per UO och projekt':'Utveckling per avdelning'}</h3>
  <p>Årsvis efterfrågade timmar för valda timtyper. Saknade observationer visas som luckor och inte som noll.</p>
  <svg className="annual-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Linjediagram för avdelningsbehov">
   <line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} stroke="#8295a2"/>
   <line x1={left} y1={top} x2={left} y2={height-bottom} stroke="#8295a2"/>
   <text x={left-6} y={top+4} textAnchor="end" fill="currentColor" fontSize="11">{fmt(max)}</text>
   {years.map((year,i)=><text key={year} x={x(i)} y={height-12} textAnchor="middle" fill="currentColor" fontSize="12">{year}</text>)}
   {series.map((line,i)=><path key={line.id} d={path(line.values)} fill="none" stroke={CHART_COLORS[i%CHART_COLORS.length]} strokeWidth="2.5"/>)}
  </svg>
  <ul className="pie-legend" aria-label="Diagramförklaring">{series.map((line,i)=><li key={line.id}><span className="pie-swatch" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} aria-hidden="true"/>{line.label}</li>)}</ul>
  <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Avdelningsbehov per år"><thead><tr><th>{selectedDepartment?'UO / projekt':'Avdelning'}</th>{years.map(year=><th key={year}>{year}</th>)}</tr></thead><tbody>
   {series.map(line=><tr key={line.id}><th scope="row">{line.label}</th>{line.values.map((value,i)=><td key={years[i]}>{value===null?'–':fmt(value)+' h'}</td>)}</tr>)}
  </tbody><tfoot><tr><th scope="row">Totalt</th>{data.map((d,i)=><td key={years[i]}>{fmt(d.total)} h</td>)}</tr></tfoot></table></div>
 </section>;
}
