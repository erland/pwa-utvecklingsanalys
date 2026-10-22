import {describe,it,expect} from 'vitest';
import {storesForReset} from './reset';
describe('local reset scope',()=>{
 it('preserves configuration when clearing project data',()=>{
  const names=Object.keys(storesForReset('data'));
  expect(names).toContain('utvecklingsanalys-semantic');
  expect(names).toContain('utvecklingsanalys-information-gaps');
  expect(names).not.toContain('utvecklingsanalys-configuration');
  expect(names).not.toContain('utvecklingsanalys-mappings');
 });
 it('preserves original data when restoring configuration defaults',()=>{
  const names=Object.keys(storesForReset('configuration'));
  expect(names).toContain('utvecklingsanalys-configuration');
  expect(names).toContain('utvecklingsanalys-mappings');
  expect(names).not.toContain('utvecklingsanalys-semantic');
  expect(names).not.toContain('utvecklingsanalys-imports');
 });
 it('resets all known data stores with no unrelated databases',()=>{
  const stores=storesForReset('all');
  expect(Object.keys(stores).sort()).toEqual([...new Set([...Object.keys(storesForReset('data')),...Object.keys(storesForReset('configuration'))])].sort());
  expect(Object.keys(stores).every(x=>x.startsWith('utvecklingsanalys'))).toBe(true);
  expect(stores['utvecklingsanalys-configuration']).toEqual(['current','history']);
 });
});
