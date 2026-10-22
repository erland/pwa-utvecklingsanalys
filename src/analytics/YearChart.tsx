import type {YearSeries} from './yearSeries';
import {CHART_COLORS} from './charts';
export type YearMode='total'|'grouped'|'trend';
const fmt=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
export default function YearChart({series,mode}:{series:YearSeries;mode:Exclude<YearMode,'total'>}){
 const max=Math.max(0,...series.rows.flatMap(r=>r.values));
 const min=Math.min(0,...series.rows.flatMap(r=>r.values));
 const range=max-min||1;
 if(mode==='grouped')return <div aria-label="Grupperade årsstaplar">{series.rows.map((row,i)=><section key={row.key} className="year-category"><h3>{row.label}</h3>{series.years.map((year,j)=><div className="bar-row" key={year}><div className="bar-label"><span>{year}</span><b>{fmt(row.values[j])} {series.unit}</b></div><div className="bar-track"><div className="bar-fill" style={{width:(100*Math.abs(row.values[j])/Math.max(Math.abs(max),Math.abs(min),1))+'%',backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}}/></div></div>)}</section>)}</div>;
 return <div className="year-trends" aria-label="Årlig trend"><svg role="img" aria-label="Trendlinjer per grupp och år" viewBox="0 0 760 320" preserveAspectRatio="xMidYMid meet">
 {series.rows.map((row,i)=>{const pts=row.values.map((value,j)=>({x:55+(series.years.length===1?325:j*650/(series.years.length-1)),y:265-210*(value-min)/range}));return <g key={row.key}><polyline fill="none" stroke={CHART_COLORS[i%CHART_COLORS.length]} strokeWidth="3" points={pts.map(p=>p.x+','+p.y).join(' ')}/>{pts.map((p,j)=><circle key={j} cx={p.x} cy={p.y} r="4" fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</g>})}
 {series.years.map((year,j)=><text key={year} x={55+(series.years.length===1?325:j*650/(series.years.length-1))} y="300" fontSize="15" textAnchor="middle" fill="currentColor">{year}</text>)}
 </svg><ul className="pie-legend">{series.rows.map((row,i)=><li key={row.key}><span className="pie-swatch" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} aria-hidden="true"/>{row.label}</li>)}</ul></div>;
}
