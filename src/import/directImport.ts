import {recognizeWorkbook} from './formats/registry';
import {approveBudgetSource} from './sourceManagement';
import type {ImportResult} from './uoBudget';
import type {Draft} from './drafts';

export type DirectImportResult={fileName:string;status:'imported'|'rejected';format?:string;facts?:number;message:string};

/** Validate before any persistent writes. Unknown formats are never interpreted heuristically. */
export async function prepareDirectImport(file:File):Promise<{result:ImportResult;draft:Draft;formatLabel:string}>{
 if(!/\.xlsx$/i.test(file.name)||file.size>15*1024*1024)throw new Error('Endast XLSX-filer på högst 15 MB stöds.');
 const bytes=await file.arrayBuffer();
 const format=await recognizeWorkbook(bytes);
 if(!format)throw new Error('Okänt Excel-format. Ingen import har gjorts.');
 const result=await format.parse(bytes);
 const errors=result.issues.filter(i=>i.severity==='error');
 if(errors.length)throw new Error(errors.slice(0,3).map(i=>i.message+(i.cell?' ('+i.cell+')':'')).join('; '));
 if(!result.uo.trim())throw new Error('UO-namn saknas i filen.');
 if(!result.facts.length)throw new Error('Inga importbara detaljvärden hittades.');
 const draft:Draft={id:crypto.randomUUID(),fileName:file.name,bytes,result,uoName:result.uo,status:'review',updatedAt:new Date().toISOString()};
 return {result,draft,formatLabel:format.label};
}

/** Sequential commits use the existing source-recovery journal; a bad file does not block subsequent files. */
export async function importFilesDirectly(files:readonly File[],onCommitted?:()=>Promise<void>|void):Promise<DirectImportResult[]>{
 const results:DirectImportResult[]=[];
 for(const file of files){
  try{
   const {result,draft,formatLabel}=await prepareDirectImport(file);
   await approveBudgetSource(result,draft.id,file.name,false,draft);
   await onCommitted?.();
   results.push({fileName:file.name,status:'imported',format:formatLabel,facts:result.facts.length,message:'Importerad'});
  }catch(error){
   results.push({fileName:file.name,status:'rejected',message:error instanceof Error?error.message:'Okänt importfel'});
  }
 }
 return results;
}
