import {describe,expect,it} from 'vitest';
import ExcelJS from 'exceljs';
import {importUoBudget} from './uoBudget';
import {canonicalFromBudget} from '../domain/canonicalImport';
import {emptyCanonical} from '../domain/canonical';
import {completionCandidates,completionValues,buildUoCompletionState} from './uoImportCompletionForm';
import {activeUoImportCompletions,withCompletedUoMatrices} from './uoImportCompletions';

async function partialSource(provided:'development'|'maintenance'){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: Klarering';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO A';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=100;
 sheet.getCell('D4').value='Utv. 27';
 sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';
 sheet.getCell(provided==='development'?'D5':'E5').value=0.06;
 const parsed=await importUoBudget(await wb.xlsx.writeBuffer());
 return {...emptyCanonical(),records:canonicalFromBudget(parsed,'source',true)};
}

describe('partial UO development and maintenance import',()=>{
 for(const provided of ['development','maintenance'] as const){
  it('retains imported '+provided+' and requires only the missing half',async()=>{
   const data=await partialSource(provided);
   const imported=data.records.filter(r=>r.workPart==='uo-activity-matrix');
   expect(imported).toHaveLength(1);
   expect(imported[0]).toMatchObject({activity:provided,value:60});
   const candidates=completionCandidates(data);
   expect(candidates).toHaveLength(1);
   const row=candidates[0];
   const shown=completionValues(data,row,[],{});
   expect(shown[provided]).toBe('60');
   const missing=provided==='development'?'maintenance':'development';
   expect(shown[missing]).toBe('');
   const updated=buildUoCompletionState(data,{requirements:[],resolutions:[]},candidates,()=>({...shown,[missing]:'40'}));
   const active=activeUoImportCompletions(data,updated.uoImportCompletions??[]);
   expect(active).toHaveLength(1);
   const completed=withCompletedUoMatrices(data,active);
   expect(completed.records.filter(r=>r.workPart==='uo-activity-matrix').map(r=>[r.activity,r.value]).sort())
    .toEqual([['development',provided==='development'?60:40],['maintenance',provided==='maintenance'?60:40]]);
   expect(()=>buildUoCompletionState(data,{requirements:[],resolutions:[]},candidates,()=>({...shown,[provided]:'70',[missing]:'30'})))
    .toThrow('IMPORTED_ACTIVITY_MUST_BE_PRESERVED');
  });
 }
});
