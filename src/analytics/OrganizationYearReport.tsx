import type {GroupYearMatrix} from './canonicalGroupYears';
import OrganizationYearLines from './OrganizationYearLines';

/** Presentation only: the parent owns filters, prepared data and annual calculations. */
export default function OrganizationYearReport({matrix}:{matrix:GroupYearMatrix|null}){
 const format=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 return <section className="organization-year-details" aria-label="Utveckling per organisationsdel och tabell">
  <OrganizationYearLines matrix={matrix}/>
  <p>Årsvärden för samma organisationsurval som linjediagrammet. Streck betyder saknat värde, inte noll.</p>
  {matrix&&matrix.years.length>0?<div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Organisation per år">
   <thead><tr><th>Organisation</th>{matrix.years.map(y=><th key={y}>{y}</th>)}<th>Totalt</th></tr></thead>
   <tbody>{matrix.rows.map(row=><tr key={row.key}><th scope="row">{row.label}</th>{row.values.map((value,i)=><td key={matrix.years[i]}>{value===null?'–':format(value)+' '+matrix.unit}</td>)}<td>{format(row.total)} {matrix.unit}</td></tr>)}</tbody>
   <tfoot><tr><th scope="row">Totalt</th>{matrix.yearTotals.map((value,i)=><td key={matrix.years[i]}>{format(value)} {matrix.unit}</td>)}<td>{format(matrix.total)} {matrix.unit}</td></tr></tfoot>
  </table></div>:<p>Inga årsvärden för aktuellt urval.</p>}
 </section>;
}
