import {recognizeWorkbook} from './formats/registry';
import {approveBudgetSource,approveTabularSource,replaceImportedSource} from './sourceManagement';
import {importBudgetFacts} from '../domain/importAdapter';
import {importTableFacts} from './tabularAdapter';
import {loadSemantic} from '../domain/semanticStore';
import {tableIdentityIssues} from './tabularAdapter';
import type {ImportResult} from './uoBudget';
import type {Draft} from './drafts';

export type DirectImportResult={fileName:string;status:'imported'|'rejected';format?:string;facts?:number;message:string};

/** Validate before any persistent writes. Unknown formats are never interpreted heuristically. */
export async function prepareDirectImport(file:File):Promise<{result:ImportResult;draft:Draft;formatLabel:string}>{
 if(!/\.xlsx$/i.test(file.name)||file.size>15*1024*1024)throw new Error('Endast XLSX-filer på högst 15 MB stöds.');
 const bytes=await file.arrayBuffer();
 const format=await recognizeWorkbook(bytes);
 if(!format||format.kind!=='budget')throw new Error('Okänt Excel-format. Ingen import har gjorts.');
 const result=await format.parse(bytes);
 const errors=result.issues.filter(i=>i.severity==='error');
 if(errors.length)throw new Error(errors.slice(0,3).map(i=>i.message+(i.cell?' ('+i.cell+')':'')).join('; '));
 if(!result.uo.trim())throw new Error('UO-namn saknas i filen.');
 if(!result.facts.length)throw new Error('Inga importbara detaljvärden hittades.');
 if(result.matrix?.issues.length)throw new Error('Aktivitetsmatrisen innehåller ogiltiga värden: '+result.matrix.issues.slice(0,3).map(issue=>issue.cell+' '+issue.message).join('; '));
 const draft:Draft={id:crypto.randomUUID(),fileName:file.name,bytes,result,uoName:result.uo,status:'review',updatedAt:new Date().toISOString()};
 return {result,draft,formatLabel:format.label};
}

/** Sequential commits use the existing source-recovery journal; a bad file does not block subsequent files. */
export async function importFilesDirectly(files:readonly File[],onCommitted?:()=>Promise<void>|void,replaceId?:string|null):Promise<DirectImportResult[]>{
 if(replaceId&&files.length!==1)return files.map(file=>({fileName:file.name,status:'rejected',message:'Välj exakt en fil när en befintlig källa ska ersättas.'}));
 const results:DirectImportResult[]=[];
 for(const file of files){
  try{
   const bytes=await file.arrayBuffer();
   const format=await recognizeWorkbook(bytes);
   if(format?.kind==='table'){
    if(!/\.xlsx$/i.test(file.name)||file.size>15*1024*1024)throw new Error('Endast XLSX-filer på högst 15 MB stöds.');
    const result=await format.parse(bytes);
    const errors=result.issues.filter(i=>i.severity==='error');
    if(errors.length)throw new Error(errors.slice(0,3).map(i=>i.message+(i.row?' (rad '+i.row+')':'')).join('; '));
    const identities=tableIdentityIssues(await loadSemantic(),result);
    if(identities.length)throw new Error('Objektmatchning kräver granskning: '+identities.join('; '));
    if(replaceId){
     await replaceImportedSource(replaceId,before=>importTableFacts(before,result,replaceId,file.name,{}),{name:file.name,planningYear:result.facts[0].year,source:'excel',importedAt:new Date().toISOString()},undefined,{table:result,resolutions:{}});
    }else await approveTabularSource(result,crypto.randomUUID(),file.name,{});
    await onCommitted?.();
    results.push({fileName:file.name,status:'imported',format:format.label,facts:result.facts.length,message:replaceId?'Ersatt':'Importerad'});
   }else{
    const {result,draft,formatLabel}=await prepareDirectImport(file);
    const includeMatrix=Boolean(result.matrix?.facts.length);
    if(replaceId){
     await replaceImportedSource(replaceId,before=>importBudgetFacts(before,result,replaceId,file.name,includeMatrix),{name:result.uo,planningYear:2027,source:'excel',importedAt:new Date().toISOString()},draft,{result,includeMatrix});
    }else await approveBudgetSource(result,draft.id,file.name,includeMatrix,draft);
    await onCommitted?.();
    results.push({fileName:file.name,status:'imported',format:formatLabel,facts:result.facts.length,message:'Importerad'});
   }
  }catch(error){
   results.push({fileName:file.name,status:'rejected',message:error instanceof Error?error.message:'Okänt importfel'});
  }
 }
 return results;
}
