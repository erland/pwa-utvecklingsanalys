import {describe,expect,it} from 'vitest';
import {backupSelectionError} from './backupSelectionError';

describe('UX-008 backup error guidance',()=>{
 it.each([
  ['ARCHIVE_TOO_LARGE','för stor'],
  ['GZIP_UNSUPPORTED','GZIP'],
  ['UNSUPPORTED_BACKUP_VERSION','backupformatet'],
  ['INVALID_PROJECT','ofullständig'],
  ['INCOMPLETE_PROJECT_ARCHIVE','ofullständig'],
  ['MISSING_CANONICAL_SOURCE','ofullständig']
 ])('explains %s in Swedish and retains technical details',(code,phrase)=>{
  const result=backupSelectionError(new Error(code));
  expect(result.message).toContain('Filen avvisades');
  expect(result.message).toContain(phrase);
  expect(result.technical).toBe(code);
  expect(result.message).not.toContain(code);
 });
 it('recognizes malformed JSON without exposing parser messages first',()=>{
  const original=new SyntaxError('Unexpected token x at position 2');
  const result=backupSelectionError(original);
  expect(result.message).toContain('inte giltig JSON');
  expect(result.technical).toBe(original.message);
 });
 it('handles unknown failures without implying data was restored',()=>{
  const result=backupSelectionError(new Error('Unexpected stream error'));
  expect(result.message).toContain('kunde inte läsas');
  expect(result.message).not.toContain('återställt');
  expect(result.technical).toBe('Unexpected stream error');
 });
});
