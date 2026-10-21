import type {SemanticDataset} from '../domain/semantic';
import type {Basis} from './model';
/** One direct LO observation per source cell; never add subtotals or mix units. */
export function weightsFromSemantic(data:SemanticDataset,basis:Basis,year:number,loIds:string[]):Record<string,number>{
 if(basis==='manual')return {};
 const results:Record<string,number>={};const wanted=new Set(loIds),used=new Set<string>();
 for(const o of data.observations){
  if(!wanted.has(o.entityId)||o.measureId!==basis||o.period.year!==year||o.kind!=='detail')continue;
  const key=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');
  if(used.has(key))continue;used.add(key);
  if(!Number.isFinite(o.value)||o.value<0)throw new Error('INVALID_WEIGHT_SOURCE');
  if(basis==='fte'||basis==='headcount'){
    if(results[o.entityId]!==undefined)throw new Error('AMBIGUOUS_SNAPSHOT_SOURCES');
    results[o.entityId]=o.value;
  }else results[o.entityId]=(results[o.entityId]??0)+o.value;
 }
 return results;
}
