import {openDB} from 'idb';
import {notifyWorkspaceChange} from '../storage/workspaceEvents';
import type {UoImportCompletion} from '../import/uoImportCompletions';
import type {ManualUoSplit} from '../allocations/manualUoAllocation';
import type {ProjectActivitySplit} from '../allocations/projectActivityAllocation';
import type {ActivityAllocationRule,ActivityAllocationDecision} from '../domain/activityAllocation';
import type {ReconciliationRule,ReconciliationDecision} from '../reconciliation/model';
import type {ManualApproval} from './manualApproval';
import type {ApprovedDistribution} from './approved';
import type {DistributionRule} from './distribution';
import type {InformationRequirement,GapResolution} from './model';
const DB='utvecklingsanalys-information-gaps';
export type GapState={requirements:InformationRequirement[];resolutions:GapResolution[];manualUoSplits?:ManualUoSplit[];projectActivitySplits?:ProjectActivitySplit[];uoImportCompletions?:UoImportCompletion[];rules?:DistributionRule[];approvals?:ApprovedDistribution[];manualApprovals?:ManualApproval[];reconciliations?:ReconciliationRule[];reconciliationDecisions?:ReconciliationDecision[];activityAllocationRules?:ActivityAllocationRule[];activityAllocationDecisions?:ActivityAllocationDecision[]};
const empty=():GapState=>({requirements:[],resolutions:[]});
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore('state')}})}
export async function loadGapState():Promise<GapState>{return await (await db()).get('state','active')??empty()}
/** Compare-and-swap within a single IndexedDB readwrite transaction.
 * Existing callers without an expected snapshot keep legacy behavior until migrated.
 * A stale writer must never commit its full-state replacement.
 */
export async function saveGapState(state:GapState,expected?:GapState):Promise<void>{
 const database=await db();
 if(!expected){await database.put('state',state,'active');notifyWorkspaceChange('gap-state-changed');return}
 const tx=database.transaction('state','readwrite');
 const current=await tx.store.get('active') as GapState|undefined;
 if(JSON.stringify(current??empty())!==JSON.stringify(expected)){
  await tx.done;
  throw new Error('STALE_GAP_STATE');
 }
 await tx.store.put(state,'active');
 await tx.done;
 notifyWorkspaceChange('gap-state-changed');
}
