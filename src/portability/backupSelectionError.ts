/** Presentation of backup inspection failures; never changes validation or persistence. */
export function backupSelectionError(error:unknown):{message:string;technical:string}{
 const technical=error instanceof Error?error.message:String(error);
 const reason=technical;
 let message:string;
 if(/ARCHIVE_TOO_LARGE/.test(reason))message='Filen avvisades: säkerhetskopian är för stor. Välj en mindre projektbackup eller skapa en ny export.';
 else if(/GZIP_UNSUPPORTED/.test(reason))message='Filen avvisades: webbläsaren kan inte läsa den komprimerade backupen. Använd en JSON-backup eller prova en webbläsare med stöd för GZIP.';
 else if(/UNSUPPORTED_BACKUP_VERSION/.test(reason))message='Filen avvisades: backupformatet känns inte igen. Välj en projektbackup skapad av Utvecklingsanalys.';
 else if(/SyntaxError|JSON|Unexpected token|Unexpected end of JSON/i.test(reason))message='Filen avvisades: innehållet är inte giltig JSON. Kontrollera att du valt en hel projektbackup, inte en annan fil.';
 else if(/INVALID_|INCOMPLETE_|MISSING_|REQUIRE_V3/.test(reason))message='Filen avvisades: säkerhetskopian är ofullständig eller innehåller ogiltiga projektuppgifter. Skapa om backupen från ursprungsprojektet om möjligt.';
 else message='Filen avvisades: säkerhetskopian kunde inte läsas eller kontrolleras. Välj en annan projektbackup och försök igen.';
 return {message,technical};
}
