export const MAX_COMPRESSED_BYTES=150*1024*1024;
export const MAX_JSON_BYTES=300*1024*1024;
/** Browser-native gzip avoids shipping a compression dependency. */
export async function gzipBackup(json:string):Promise<Blob>{
 if(!('CompressionStream' in globalThis))throw new Error('GZIP_UNSUPPORTED');
 const data=new Blob([json],{type:'application/json'});
 if(data.size>MAX_JSON_BYTES)throw new Error('ARCHIVE_TOO_LARGE');
 const stream=data.stream().pipeThrough(new CompressionStream('gzip'));
 const output=await new Response(stream).blob();
 if(output.size>MAX_COMPRESSED_BYTES)throw new Error('ARCHIVE_TOO_LARGE');
 return output;
}
export async function readBackupFile(file:File):Promise<unknown>{
 if(file.size>MAX_COMPRESSED_BYTES)throw new Error('ARCHIVE_TOO_LARGE');
 const zipped=file.name.toLowerCase().endsWith('.gz');
 if(zipped&&!('DecompressionStream' in globalThis))throw new Error('GZIP_UNSUPPORTED');
 const stream=zipped?file.stream().pipeThrough(new DecompressionStream('gzip')):file.stream();
 const blob=await new Response(stream).blob();
 if(blob.size>MAX_JSON_BYTES)throw new Error('ARCHIVE_TOO_LARGE');
 return JSON.parse(await blob.text()) as unknown;
}
