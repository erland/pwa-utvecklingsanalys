import type {GapState} from '../gaps/store';

/** Reject edits made from an out-of-date allocation screen.
 * Comparing only allocations permits unrelated GapState edits, while the
 * subsequent saveGapState(next,latest) protects the whole state atomically.
 */
export function assertBudgetAllocationSnapshot(current:GapState,latest:GapState):void{
 if(JSON.stringify(current.activityAllocationRules??[])!==JSON.stringify(latest.activityAllocationRules??[])||
    JSON.stringify(current.activityAllocationDecisions??[])!==JSON.stringify(latest.activityAllocationDecisions??[])){
  throw new Error('STALE_GAP_STATE');
 }
}
