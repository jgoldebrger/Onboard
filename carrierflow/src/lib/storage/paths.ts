export function buildStoragePath(
  applicationId: string,
  segment: string,
  fileName: string,
): string {
  const safeSegment = segment.replace(/[/\\]/g, "_");
  const safeFileName = fileName.replace(/[/\\]/g, "_");
  return `${applicationId}/${safeSegment}/${safeFileName}`;
}
