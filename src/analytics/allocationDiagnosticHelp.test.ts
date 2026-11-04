import {describe,expect,it} from 'vitest';
import {allocationDiagnosticHelp,diagnosticMetricLabel} from './allocationDiagnosticHelp';

describe('UX-007: understandable allocation diagnostics',()=>{
 it.each([
  ['STALE_OR_INVALID_APPROVAL','En sparad LO-fördelning','Öppna Fördelningar'],
  ['AUTO_ALLOCATION_FAILED','Automatisk LO-fördelning','Kontrollera'],
  ['INCOMPLETE_IMPORTED_LO_ACTIVITY','Importerade LO-värden','källfilens'],
  ['MANUAL_REBALANCE_FAILED','Manuell UO-fördelning','låsta LO-värden']
 ] as const)('%s has Swedish guidance and an actionable next step',(code,title,action)=>{
  const help=allocationDiagnosticHelp(code);
  expect(help.title).toContain(title);
  expect(help.explanation.length).toBeGreaterThan(25);
  expect(help.action).toContain(action);
  expect(help.action).not.toMatch(/\b(?:UNKNOWN|INVALID|FAILED)\b/);
 });
 it('uses human-readable units and terms for each supported metric',()=>{
  expect(diagnosticMetricLabel('it_hours')).toBe('IT-timmar');
  expect(diagnosticMetricLabel('business_hours')).toBe('Verksamhetstimmar');
  expect(diagnosticMetricLabel('consultant_cost')).toBe('Konsultkostnader');
  expect(diagnosticMetricLabel('other_cost')).toBe('Övriga kostnader');
 });
});
