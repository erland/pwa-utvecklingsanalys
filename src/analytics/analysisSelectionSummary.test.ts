import {describe,expect,it} from 'vitest';
import {analysisSelectionSummary} from './analysisSelectionSummary';

describe('UX-004 analysis selection labels',()=>{
 it('describes default UO hours filters and a selected year',()=>{
  expect(analysisSelectionSummary({axis:'work',unit:'hours',metrics:['it_hours','business_hours'],activity:'all',year:'all',organization:{level:'all-uos'}})).toEqual({
   organization:'Alla UO',measure:'Timmar · IT-timmar + Verksamhetstimmar',activity:'Utveckling och förvaltning',year:'Alla år'
  });
  expect(analysisSelectionSummary({axis:'work',unit:'hours',metrics:['it_hours'],activity:'development',year:'2028',organization:{level:'uo',uoId:'uo:UO%20A'}})).toEqual({
   organization:'UO: UO A',measure:'Timmar · IT-timmar',activity:'Utveckling',year:'2028'
  });
 });
 it('shows group and part context without changing the selected metric',()=>{
  const groupModel={id:'m1',name:'Indelning',groups:[{id:'g1',name:'Grupp Alfa',uoIds:['uo:UO%20A']}]};
  expect(analysisSelectionSummary({axis:'work',unit:'costs',metrics:['other_cost'],activity:'all',year:'2027',organization:{level:'group',groupId:'g1'},groupModel}).organization).toBe('UO-grupp: Grupp Alfa');
  expect(analysisSelectionSummary({axis:'work',unit:'hours',metrics:['it_hours'],activity:'maintenance',year:'all',organization:{level:'part',uoId:'uo:UO%20A',partId:'LO%201'}}).organization).toBe('UO: UO A · LO/del: LO 1');
 });
 it('never applies work activity text to department reporting',()=>{
  const summary=analysisSelectionSummary({axis:'department',unit:'hours',metrics:['business_hours'],activity:'all',year:'2029',organization:{level:'uo',uoId:'uo:A'}});
  expect(summary).toEqual({organization:'Avdelningar',measure:'Timmar · Verksamhetstimmar',activity:undefined,year:'2029'});
 });
});
