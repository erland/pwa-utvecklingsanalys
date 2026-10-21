import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {importUoBudget} from './uoBudget';
async function workbook(kind:'valid'|'missing'|'bad'='valid'){
 const w=new ExcelJS.Workbook(),s=w.addWorksheet(kind==='missing'?'Other':'UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=new Date(2027,0,1);s.getCell('Q11').value='ÅRSBEHOV 2028';
 s.getCell('B19').value='UO Övergripande';s.getCell('B25').value='LO 1';
 s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=kind==='bad'?'abc':100;
 s.getCell('Q26').value=230;s.getCell('P26').value={formula:'SUM(D26:O26)',result:100};s.getCell('C27').value='V timmar (h)';s.getCell('D27').value=50;
 s.getCell('C30').value='OMK (kr)- TOT';s.getCell('D30').value={formula:'SUM(D28:D29)',result:120};
 s.getCell('C13').value='IT timmar (h)';s.getCell('D13').value={formula:'SUM(D26)',result:100};
 const a=w.addWorksheet('Aktivering  2027-2030');a.getCell('D12').value=70;
 const bytes=await w.xlsx.writeBuffer();return bytes as ArrayBuffer;
}
describe('2027 UO budget import',()=>{
 it('reads leaf facts with provenance, excludes totals and activation subset',async()=>{const res=await importUoBudget(await workbook());expect(res.facts).toHaveLength(3);expect(res.facts[0]).toMatchObject({uo:'UO A',area:'LO 1',measure:'it_hours',value:100,period:{year:2027,month:1},source:{cell:'D26'}});expect(res.excludedSheets).toContain('Aktivering  2027-2030');expect(res.facts).toContainEqual(expect.objectContaining({value:230,period:{year:2028},source:{cell:'Q26'}}));expect(res.facts.some(f=>f.value===120||f.value===70)).toBe(false);});
 it('rejects an unsupported template',async()=>{const res=await importUoBudget(await workbook('missing'));expect(res.issues[0].code).toBe('PROFILE_NOT_MATCHED');expect(res.facts).toEqual([]);});
 it('flags invalid values instead of silently coercing them',async()=>{const res=await importUoBudget(await workbook('bad'));expect(res.facts).toHaveLength(2);expect(res.issues.some(i=>i.code==='NON_NUMERIC_INPUT'&&i.cell==='D26')).toBe(true);});
});
