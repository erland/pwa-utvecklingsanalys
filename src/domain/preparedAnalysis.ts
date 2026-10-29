import {approvedActivityParts} from './activityAllocation';
import type {AnalysisRecord,CanonicalDataset} from './canonical';
import type {GapState} from '../gaps/store';

/** Import/completion boundary. Resolve approved activity parts once before any analysis query.
 * Original imports and approvals are never overwritten.
 */
export type PreparedAnalysis={dataset:CanonicalDataset;staleApprovals:number;excludedMatrix:number};
export function prepareAnalysisDataset(source:CanonicalDataset,state:GapState):PreparedAnalysis{
 const approvalSource=(source as CanonicalDataset & {allocationSourceRecords?:AnalysisRecord[]}).allocationSourceRecords;
 const original:CanonicalDataset=approvalSource?{...source,records:approvalSource}:source;
 const calculated:AnalysisRecord[]=[];
 let staleApprovals=0;
 for(const rule of state.activityAllocationRules??[]){
  const decision=state.activityAllocationDecisions?.find(d=>d.ruleId===rule.id);
  if(!decision)continue;
  const parts=approvedActivityParts(original,rule,decision);
  if(parts.length)calculated.push(...parts);
  else staleApprovals++;
 }
 // The UO summary matrix is never volume. Older source records can omit workPart.
 const isMatrix=(r:AnalysisRecord)=>r.scope.axis==='work'&&!r.scope.loId&&r.granularity==='activity-part'&&(r.workPart==='uo-activity-matrix'||r.authority==='original');
 const excludedMatrix=source.records.filter(isMatrix).length;
 return {dataset:{schemaVersion:2,records:[...source.records.filter(r=>!isMatrix(r)),...calculated]},staleApprovals,excludedMatrix};
}
