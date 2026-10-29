import type {GroupYearMatrix} from './canonicalGroupYears';
import {CHART_COLORS} from './charts';

/** Visualize exactly the same organization/year cells as the detailed matrix.
 * Missing observations break lines instead of being interpolated as zero. */
export default function OrganizationYearLines({matrix}:{matrix:GroupYearMatrix|null}){
 if(!matrix||!matrix.years.length||!matrix.rows.length)return null;
 const {years,rows,unit}=matrix;
 const width=560,height=240,left=56,right=16,top=20,bottom=40;
 const x=(index:number)=>left+(years.length===1?(width-left-right)/2:index*(width-left-right)/(years.length-1));
 const values=rows.flatMap(row=>row.values).filter((v):v is number=>v!==null&&Number.isFinite(v));
 const max=Math.max(1,...values);
 const y=(value:number)=>height-bottom-(value/max)*(height-top-bottom);
 const format=(value:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(value);
 const segments=(values:(number|null)[])=>{
  let path='',started=false;
  for(const [index,value] of values.entries()){
   if(value===null||!Number.isFinite(value)){started=false;continue}
   path+=(started?' L ':' M ')+x(index)+' '+y(value);
   started=true;
  }
  return path.trim();
 };
 return <section aria-label="Årsvis utveckling per organisationsdel">
  <h3>Utveckling per organisationsdel</h3>
  <p>En linje per organisationsdel på vald nivå. Saknade år visas som avbrott, inte som noll. Tabellen med samma värden finns under Visa detaljerad organisation per år.</p>
  <svg className="annual-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Linjediagram för utveckling per organisationsdel">
   <line x1={left} y1={height-bottom} x2={width-right} y2={height-bottom} stroke="#8295a2"/>
   <line x1={left} y1={top} x2={left} y2={height-bottom} stroke="#8295a2"/>
   <text x={left-6} y={top+4} textAnchor="end" fontSize="11" fill="currentColor">{format(max)}</text>
   <text x={left-6} y={height-bottom+4} textAnchor="end" fontSize="11" fill="currentColor">0</text>
   {years.map((year,i)=><text key={year} x={x(i)} y={height-12} textAnchor="middle" fontSize="12" fill="currentColor">{year}</text>)}
   {rows.map((row,index)=>{
    const color=CHART_COLORS[index%CHART_COLORS.length];
    return <g key={row.key}>
     <path d={segments(row.values)} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
     {row.values.map((value,i)=>value===null?null:<circle key={years[i]} cx={x(i)} cy={y(value)} r="3.5" fill={color}><title>{row.label}, {years[i]}: {format(value)} {unit}</title></circle>)}
    </g>
   })}
  </svg>
  <ul className="pie-legend" aria-label="Diagramförklaring">{rows.map((row,index)=><li key={row.key}><span className="pie-swatch" aria-hidden="true" style={{backgroundColor:CHART_COLORS[index%CHART_COLORS.length]}}/>{row.label}</li>)}</ul>
 </section>;
}
