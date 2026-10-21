import {expect,test} from 'vitest';
import {canApprove,type Draft} from './drafts';
const base:Draft={id:'draft',fileName:'sample.xlsx',bytes:new ArrayBuffer(0),uoName:'UO A',status:'review',updatedAt:'2026-10-21',result:{profile:'uo-budget-2027-v1',uo:'UO A',facts:[{uo:'UO A',area:'LO 1',measure:'it_hours',period:{year:2027},value:12,unit:'h',source:{sheet:'UO Tot 2027-30',cell:'D26'}}],issues:[],excludedSheets:[]}};
test('valid reviewed import can be approved',()=>expect(canApprove(base)).toBe(true));
test('unknown profiles and missing names cannot be approved',()=>{
 expect(canApprove({...base,uoName:' '})).toBe(false);
 expect(canApprove({...base,result:{...base.result,issues:[{code:'PROFILE_NOT_MATCHED',severity:'error',message:'Unknown'}]}})).toBe(false);
 expect(canApprove({...base,result:{...base.result,facts:[]}})).toBe(false);
});
