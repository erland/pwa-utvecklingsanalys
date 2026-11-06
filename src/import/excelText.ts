import ExcelJS from 'exceljs';

/** Read an Excel label independently of how its characters were styled.
 * Never use cached formula results as text: formulas are handled explicitly
 * by individual import formats where safe.
 */
export function excelText(value:ExcelJS.CellValue):string{
 if(typeof value==='string')return value.trim();
 if(typeof value==='number')return String(value);
 if(value&&typeof value==='object'){
  if('richText'in value)return value.richText.map(part=>part.text).join('').trim();
  if('text'in value&&typeof value.text==='string')return value.text.trim();
 }
 return '';
}
