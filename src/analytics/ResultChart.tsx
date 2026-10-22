import type {Result} from './query';
import {CHART_COLORS,pieEligibility,pieSlices,type ChartType} from './charts';
const fmt=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
export default function ResultChart({result,type}:{result:Result;type:ChartType}){
 if(type==='table')return null;
 if(type==='pie'){
  const problem=pieEligibility(result);
  if(problem)return <p role="status" className="notice">{problem} Välj stapeldiagram eller tabell.</p>;
  const slices=pieSlices(result);
  const gradient=slices.map((s,i)=>CHART_COLORS[i%CHART_COLORS.length]+' '+s.start+'% '+s.end+'%').join(', ');
  return <div className="pie-layout"><div className="pie-chart" role="img" aria-label={'Cirkeldiagram, total '+fmt(result.total)+' '+result.unit} style={{background:'conic-gradient('+gradient+')'}}/>
   <ul className="pie-legend">{slices.map((s,i)=><li key={s.row.key}><span className="pie-swatch" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} aria-hidden="true"/><span>{s.row.label}: {fmt(s.row.value)} {result.unit} ({fmt(s.percentage)} %)</span></li>)}</ul></div>;
 }
 const max=Math.max(0,...result.rows.map(r=>r.value));
 return <div aria-label="Stapeldiagram">{result.rows.map(r=><div key={r.key} className="bar-row"><div className="bar-label"><span>{r.label}</span><b>{fmt(r.value)} {result.unit}</b></div><div className="bar-track"><div className="bar-fill" style={{width:(max>0?100*Math.max(0,r.value)/max:0)+'%'}}/></div></div>)}</div>;
}
