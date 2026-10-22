import {describe,it,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {findInformationGaps,gapKey,validateResolution,type InformationRequirement} from './model';
const req:InformationRequirement={id:'activity',name:'Aktivitet per LO',measureId:'it_hours',entityKind:'lo',years:[2027],activities:['development','maintenance'],required:true};
describe('information gaps',()=>{
 it('distinguishes missing, zero and existing source facts without mutating original data',()=>{
  const data=emptySemantic();
  data.entities.push({id:'lo:one',name:'LO AUL',kind:'lo',aliases:[]});
  data.observations.push({id:'source',entityId:'lo:one',measureId:'it_hours',period:{year:2027},activity:'development',value:0,planningVersion:'2027',scenario:'need',kind:'subset',quality:'reported',source:{datasetId:'source',fileName:'a.xlsx',sheet:'S',cell:'D5'}});
  const old=JSON.stringify(data);
  const gaps=findInformationGaps(data,[req],[]);
  expect(gaps.map(g=>g.activity)).toEqual(['maintenance']);
  expect(gaps[0].status).toBe('missing');
  expect(JSON.stringify(data)).toBe(old);
 });
 it('records manual zero, accepted exception and unknown as separate states',()=>{
  const data=emptySemantic();data.entities.push({id:'lo:one',name:'LO IA',kind:'lo',aliases:[]});
  const key=gapKey('activity','lo:one',2027,'development');
  const gaps=findInformationGaps(data,[req],[{key,status:'manual',value:0,reason:'Verifierat',updatedAt:'2026-10-22'}]);
  expect(gaps[0]).toMatchObject({status:'manual',value:0});
  expect(gaps[1].status).toBe('missing');
  expect(validateResolution({key,status:'not-applicable',reason:'',updatedAt:''})).toContain('Motivering krävs');
  expect(validateResolution({key,status:'manual',value:NaN,reason:'',updatedAt:''})).toContain('Ett ändligt värde krävs');
 });
});
