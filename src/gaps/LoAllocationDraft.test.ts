import {describe,expect,it} from 'vitest';
import {allocationLabel} from './LoAllocationDraft';

describe('allocation display labels',()=>{
 it('shows UO Overhead as a human-readable row',()=>{
  expect(allocationLabel('uo-overhead:uo:Brottsbek%C3%A4mpning%20och%20utredning')).toBe('UO Övergripande');
 });
 it('decodes LO names without changing persisted identifiers',()=>{
  const id='lo:Brottsbek%C3%A4mpning:LO%20Utredningsst%C3%B6d';
  expect(allocationLabel(id)).toBe('LO Utredningsstöd');
  expect(id).toContain('lo:');
 });
});
