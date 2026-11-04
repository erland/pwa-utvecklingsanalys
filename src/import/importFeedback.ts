import type {DirectImportResult} from './directImport';

export type PresentedImportResult={
 statusLabel:'Importerad'|'Importerad med varningar'|'Inte importerad';
 detail:string;
 nextAction:string;
};
export function presentImportResult(result:DirectImportResult):PresentedImportResult{
 if(result.status==='imported'){
  const warning=/varningar/i.test(result.message);
  return {
   statusLabel:warning?'Importerad med varningar':'Importerad',
   detail:`${result.facts??0} detaljvärden · ${result.format??'Identifierat Excel-format'}${warning?' · '+result.message:''}`,
   nextAction:warning?'Kontrollera varningarna och komplettera eventuella saknade UO-värden nedan.':'Kontrollera eventuella kompletteringar nedan. Du kan sedan justera fördelningar eller gå till analysen.'
  };
 }
 const message=result.message;
 const action=/15 MB|Endast XLSX/i.test(message)?'Välj en XLSX-fil som är högst 15 MB.':
  /Okänt Excel-format/i.test(message)?'Kontrollera att filen följer ett av de Excel-format som appen stöder.':
  /Objektmatchning/i.test(message)?'Kontrollera UO- och objektbeteckningarna i filen innan du importerar på nytt.':
  /Inga importbara detaljvärden|UO-namn saknas/i.test(message)?'Kontrollera att filen innehåller UO-namn och numeriska detaljvärden.':
  /Välj exakt en fil/i.test(message)?'Välj en enda fil när du ersätter en befintlig källa.':
  'Kontrollera filen och felbeskrivningen innan du försöker igen.';
 return {statusLabel:'Inte importerad',detail:message,nextAction:action+' Ingen data från denna fil har importerats.'};
}

export function importBatchSummary(results:readonly DirectImportResult[]){
 const imported=results.filter(r=>r.status==='imported').length;
 const rejected=results.length-imported;
 const warnings=results.filter(r=>r.status==='imported'&&/varningar/i.test(r.message)).length;
 return {imported,rejected,warnings};
}
