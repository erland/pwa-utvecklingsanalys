import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {uoAllocationEligibility} from '../allocations/uoAllocationEligibility';
import {activeUoImportCompletions,completionKey,saveUoImportCompletion,type UoImportCompletion} from './uoImportCompletions';

export type CompletionRow=ReturnType<typeof uoAllocationEligibility>[number];
export type CompletionValues={development:string;maintenance:string};
/** Only the import form displays UO other costs in Mnkr. Persist SEK unchanged. */
export function completionDisplayValues(metric:string,values:CompletionValues):CompletionValues{
 const display=(value:string)=>metric==='other_cost'&&value.trim()!==''?String(Number(value)/1_000_000):value;
 return {development:display(values.development),maintenance:display(values.maintenance)};
}
export function completionStoredValues(metric:string,values:CompletionValues):CompletionValues{
 const stored=(value:string)=>metric==='other_cost'&&value.trim()!==''?String(Number(value)*1_000_000):value;
 return {development:stored(values.development),maintenance:stored(values.maintenance)};
}

export function completionCandidates(data:CanonicalDataset):CompletionRow[]{
 return uoAllocationEligibility(data).filter(row=>row.status==='manual-allowed'&&
  ['it_hours','business_hours','other_cost'].includes(row.metric));
}

export function groupCompletionRows(rows:readonly CompletionRow[]):Map<string,CompletionRow[]>{
 const groups=new Map<string,CompletionRow[]>();
 for(const row of rows)groups.set(row.uoId,[...(groups.get(row.uoId)??[]),row]);
 return groups;
}

export function importedCompletionParts(data:CanonicalDataset,row:CompletionRow){
 return data.records.filter(record=>record.scope.axis==='work'&&record.scope.uoId===row.uoId&&
  record.metric===row.metric&&record.year===row.year&&record.authority==='original'&&
  record.workPart==='uo-activity-matrix');
}

/** Imported values win over saved completions; unsaved edits win over both. */
export function completionValues(data:CanonicalDataset,row:CompletionRow,
 current:readonly UoImportCompletion[],inputs:Readonly<Record<string,CompletionValues>>):CompletionValues{
 const key=completionKey(row);
 const existing=current.find(item=>completionKey(item)===key);
 const imported=importedCompletionParts(data,row);
 return inputs[key]??{
  development:String(imported.find(record=>record.activity==='development'&&!record.assumedZero)?.value??existing?.development??imported.find(record=>record.activity==='development')?.value??''),
  maintenance:String(imported.find(record=>record.activity==='maintenance'&&!record.assumedZero)?.value??existing?.maintenance??imported.find(record=>record.activity==='maintenance')?.value??'')
 };
}

export function validCompletionValues(values:CompletionValues):boolean{
 return values.development.trim()!==''&&values.maintenance.trim()!==''&&
  Number.isFinite(Number(values.development))&&Number.isFinite(Number(values.maintenance))&&
  Number(values.development)>=0&&Number(values.maintenance)>=0&&
  Number(values.development)+Number(values.maintenance)>0;
}

/** Pure batch calculation. The caller owns loading, concurrency checks and persistence. */
export function buildUoCompletionState(data:CanonicalDataset,latest:GapState,rows:readonly CompletionRow[],
 valuesFor:(row:CompletionRow)=>CompletionValues):GapState{
 if(rows.some(row=>!validCompletionValues(valuesFor(row))))throw new Error('INVALID_UO_COMPLETION_VALUES');
 let uoImportCompletions=latest.uoImportCompletions??[];
 for(const row of rows){
  const values=valuesFor(row);
  uoImportCompletions=saveUoImportCompletion(data,uoImportCompletions,{
   uoId:row.uoId,year:row.year,metric:row.metric,
   development:Number(values.development),maintenance:Number(values.maintenance)
  });
 }
 const keys=new Set(rows.map(completionKey));
 return {
  ...latest,
  uoImportCompletions,
  manualUoSplits:(latest.manualUoSplits??[]).filter(item=>!keys.has(completionKey(item)))
 };
}

export function activeCompletionRows(data:CanonicalDataset,state:GapState):UoImportCompletion[]{
 return activeUoImportCompletions(data,state.uoImportCompletions??[]);
}
