import type {AnalysisRecord,CanonicalDataset,Metric} from './canonical';
import type {LockedLoActivity} from '../import/formats/uoBudgetCompletion';

export type ImportedLoLocks={locks:LockedLoActivity[];incompleteLoIds:string[]};
/** Read only original, reported annual LO activity rows for the exact import scope.
 * A complete development/maintenance pair is immutable. An incomplete or
 * ambiguous pair must never be inferred, overwritten or silently treated as zero.
 */
export function importedLoActivityLocks(
 data:CanonicalDataset,scope:{datasetId:string;uoId:string;metric:Metric;year:number}
):ImportedLoLocks{
 const byLo=new Map<string,AnalysisRecord[]>();
 for(const record of data.records){
  if(record.authority!=='original'||record.approval!=='reported'||
   record.source?.datasetId!==scope.datasetId||record.metric!==scope.metric||
   record.year!==scope.year||record.month!==undefined||
   record.granularity!=='activity-part'||record.scope.axis!=='work'||
   record.scope.uoId!==scope.uoId)continue;
  const loId=record.scope.loId??(record.workPart==='uo-overhead'?'uo-overhead:'+scope.uoId:null);
  if(!loId)continue; // UO matrix is not an LO lock.
  byLo.set(loId,[...(byLo.get(loId)??[]),record]);
 }
 const locks:LockedLoActivity[]=[],incompleteLoIds:string[]=[];
 for(const [loId,rows] of byLo){
  const dev=rows.filter(r=>r.activity==='development');
  const maint=rows.filter(r=>r.activity==='maintenance');
  if(rows.length!==2||dev.length!==1||maint.length!==1||
   !Number.isFinite(dev[0].value)||!Number.isFinite(maint[0].value)||
   dev[0].value<0||maint[0].value<0){
   incompleteLoIds.push(loId);continue;
  }
  locks.push({loId,development:dev[0].value,maintenance:maint[0].value});
 }
 return {locks:locks.sort((a,b)=>a.loId.localeCompare(b.loId)),incompleteLoIds:incompleteLoIds.sort()};
}
