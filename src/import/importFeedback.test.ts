import {describe,expect,it} from 'vitest';
import {importBatchSummary,presentImportResult} from './importFeedback';
import type {DirectImportResult} from './directImport';

describe('UX-002 import outcome guidance',()=>{
 const ok:DirectImportResult={fileName:'budget.xlsx',status:'imported',facts:8,format:'UO Tot 2027-30',message:'Importerad'};
 const warning:DirectImportResult={...ok,fileName:'warning.xlsx',message:'Importerad med varningar i UO-fördelning: D5 saknar värde'};
 const rejected:DirectImportResult={fileName:'unknown.xlsx',status:'rejected',message:'Okänt Excel-format. Ingen import har gjorts.'};
 it('distinguishes imported, warning and rejected files without marking completed analysis',()=>{
  expect(importBatchSummary([ok,warning,rejected])).toEqual({imported:2,rejected:1,warnings:1});
  expect(presentImportResult(ok)).toEqual(expect.objectContaining({statusLabel:'Importerad',detail:expect.stringContaining('8 detaljvärden')}));
  expect(presentImportResult(ok).nextAction).toContain('kompletteringar');
  expect(presentImportResult(warning)).toEqual(expect.objectContaining({statusLabel:'Importerad med varningar',detail:expect.stringContaining('D5')}));
  expect(presentImportResult(rejected).statusLabel).toBe('Inte importerad');
  expect(presentImportResult(rejected).nextAction).toContain('Excel-format');
 });
 it('explains familiar failures with file correction actions and no false success',()=>{
  expect(presentImportResult({fileName:'wrong.txt',status:'rejected',message:'Endast XLSX-filer på högst 15 MB stöds.'}).nextAction).toContain('15 MB');
  expect(presentImportResult({fileName:'empty.xlsx',status:'rejected',message:'Inga importbara detaljvärden hittades.'}).nextAction).toContain('numeriska detaljvärden');
  expect(presentImportResult({fileName:'replaced.xlsx',status:'rejected',message:'Välj exakt en fil när en befintlig källa ska ersättas.'}).nextAction).toContain('en enda fil');
  expect(importBatchSummary([])).toEqual({imported:0,rejected:0,warnings:0});
 });
});
