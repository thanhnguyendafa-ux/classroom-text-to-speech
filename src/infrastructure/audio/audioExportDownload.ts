export function buildAudioExportFilename(input: { range: string; engine: 'browser' | 'premium'; date: Date }): string {
  const date = input.date.toLocaleDateString('vi-VN').replace(/\//g, '-'); const range = input.range === 'all' ? 'FULL' : `Set-${input.range}`; const extension = input.engine === 'premium' ? 'wav' : 'mp3'; return `am-thanh-luyen-nghe-${range}-${date}.${extension}`;
}
export function downloadObjectUrl(url: string, filename: string, documentRef: Document = document): void { const link = documentRef.createElement('a'); link.href = url; link.download = filename; documentRef.body.appendChild(link); link.click(); link.remove(); }
