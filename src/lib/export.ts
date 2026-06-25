export type ExportMode = 'hub' | 'resource' | 'translation' | 'appendix';

export type ExportMeta = {
  batchId: string;
  timestamp: string;
  assignedDoiSuffix: number;
  assignedDoi: string;
  assignedDoiUrl: string;
  nextDoiSuffix: number;
};

export const DOI_PREFIX = '10.48060/tghn.';
export const BATCH_PREFIX='tghn_kh_';
export const DOI_URL_PREFIX = 'https://doi.org/';
export const DEFAULT_NEXT_DOI_SUFFIX = 196;

export function generateBatchId(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${BATCH_PREFIX}${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

export function generateTimestamp(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${ss}000`;
}

export function formatDoi(suffix: number): string {
  return `${DOI_PREFIX}${suffix}`;
}

export function formatDoiUrl(suffix: number): string {
  return `${DOI_URL_PREFIX}${formatDoi(suffix)}`;
}

export function buildExportMeta(_mode: ExportMode, nextDoiSuffix: number): ExportMeta {
  const assignedDoiSuffix = nextDoiSuffix;

  return {
    batchId: generateBatchId(),
    timestamp: generateTimestamp(),
    assignedDoiSuffix,
    assignedDoi: formatDoi(assignedDoiSuffix),
    assignedDoiUrl: formatDoiUrl(assignedDoiSuffix),
    nextDoiSuffix: nextDoiSuffix + 1,
  };
}
