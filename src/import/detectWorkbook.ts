import {recognizeWorkbook} from './formats/registry';
export type WorkbookKind='budget'|'tabular';
/** Transitional fallback: known formats use the registry, unknown files retain tabular review. */
export async function detectWorkbookKind(bytes:ArrayBuffer):Promise<WorkbookKind>{
 return (await recognizeWorkbook(bytes))?.kind==='budget'?'budget':'tabular';
}
