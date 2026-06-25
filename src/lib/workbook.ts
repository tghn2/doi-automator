import readExcelFile from 'read-excel-file/browser';
import type { Creator, Mode, RecordBase, WorkbookControlState, WorkbookImport, WorkbookSheet, WorkbookSheetKind } from './types';

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value).trim();
}

function rowArrayToObject(headers: string[], values: unknown[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    const cleanHeader = cellToText(header);
    if (!cleanHeader) return;
    row[cleanHeader] = cellToText(values[index]);
  });
  return row;
}

export async function parseWorkbookFile(file: File): Promise<WorkbookImport> {
  const sheets = await readExcelFile(file);

  const workbookSheets: WorkbookSheet[] = sheets.map((sheet) => {
    const rows = sheet.data ?? [];
    const headerRow = rows[0] ?? [];
    const headers = headerRow.map((value) => cellToText(value));
    const objects = rows.slice(1).map((rowValues) => rowArrayToObject(headers, rowValues));

    return {
      name: sheet.sheet,
      rows: objects,
      kind: classifySheet(sheet.sheet),
    };
  });

  return {
    fileName: file.name,
    importedAt: new Date().toISOString(),
    sheets: workbookSheets,
  };
}

export function classifySheet(name: string): WorkbookSheetKind {
  const normalized = normalizeHeader(name);
  if (normalized.includes('control')) return 'control';
  if (normalized.includes('list')) return 'lists';
  if (normalized.includes('hub') || normalized.includes('resource') || normalized.includes('translation') || normalized.includes('appendix')) {
    return 'record';
  }
  return 'other';
}

export function detectModeFromSheetName(name: string): Mode | null {
  const normalized = normalizeHeader(name);
  if (normalized.includes('hub')) return 'hub';
  if (normalized.includes('resource')) return 'resource';
  if (normalized.includes('translation')) return 'translation';
  if (normalized.includes('appendix')) return 'appendix';
  return null;
}

function lookupValue(row: Record<string, string>, candidates: string[]): string {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const exact = normalizedEntries.find(([key]) => key === normalizedCandidate)?.[1];
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const partial = normalizedEntries.find(([key]) => key.includes(normalizedCandidate) || normalizedCandidate.includes(key))?.[1];
    if (partial) return partial;
  }

  return '';
}

export function parseRecordFromRow(row: Record<string, string>, fallbackMode: Mode): RecordBase {
  const mode = (lookupValue(row, ['record_type', 'mode']) as Mode) || fallbackMode;
  const titleCandidates =
    mode === 'hub'
      ? ['hub_title', 'knowledge_hub_title', 'title']
      : mode === 'translation'
        ? ['translation_title', 'title', 'resource_title']
        : mode === 'appendix'
          ? ['appendix_title', 'title', 'resource_title']
          : ['resource_title', 'title', 'name'];

  const abstractCandidates = ['abstract', 'summary', 'description', 'introductory_text'];
  const yearCandidates = ['year', 'publication_year', 'date_year'];
  const monthCandidates = ['month', 'publication_month', 'date_month'];
  const dayCandidates = ['day', 'publication_day', 'date_day'];
  const urlCandidates = mode === 'hub' ? ['hub_url', 'resource_url', 'url'] : ['resource_url', 'url', 'landing_page_url'];
  const languageCandidates = ['language', 'resource_language', 'xml_lang'];
  const publicationTypeCandidates = ['publication_type', 'content_type'];
  const referenceDoiCandidates = ['reference_doi', 'hub_doi', 'original_doi', 'parent_doi'];
  const relatedDoiCandidates = ['related_doi', 'related_resource_doi', 'translated_resource_doi', 'original_resource_doi'];
  const originalTitleCandidates = ['original_title', 'original language title', 'original_language_title'];

  return {
    title: lookupValue(row, titleCandidates),
    abstract: lookupValue(row, abstractCandidates),
    year: lookupValue(row, yearCandidates),
    month: lookupValue(row, monthCandidates),
    day: lookupValue(row, dayCandidates),
    resourceUrl: lookupValue(row, urlCandidates),
    language: lookupValue(row, languageCandidates) || 'en',
    publicationType: (lookupValue(row, publicationTypeCandidates) as RecordBase['publicationType']) || 'full_text',
    referenceDoi: lookupValue(row, referenceDoiCandidates),
    relatedDoi: lookupValue(row, relatedDoiCandidates),
    originalTitle: lookupValue(row, originalTitleCandidates),
  };
}

function guessContributionRole(row: Record<string, string>, index: number, mode: Mode): Creator['contributorRole'] {
  const explicit = lookupValue(row, [`role_${index}`, `role contributor ${index}`, `contributor role ${index}`, `role (contributor ${index})`]);
  if (explicit === 'translator' || explicit === 'author') return explicit;
  return mode === 'translation' ? 'translator' : 'author';
}

function findCreatorField(row: Record<string, string>, index: number, fieldTokens: string[]): string {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);
  const idxToken = `contributor${index}`;
  const altIdxToken = `creator${index}`;

  for (const [key, value] of normalizedEntries) {
    const hasIndex = key.includes(idxToken) || key.includes(altIdxToken) || key.includes(`author${index}`) || key.includes(`translator${index}`);
    if (!hasIndex) continue;
    if (fieldTokens.some((token) => key.includes(token))) return value;
  }

  return '';
}

function parseInlineCreators(row: Record<string, string>, mode: Mode): Creator[] {
  const creators: Creator[] = [];

  for (let index = 1; index <= 20; index += 1) {
    const givenName =
      findCreatorField(row, index, ['givenname']) ||
      lookupValue(row, [`given_name_${index}`, `given name contributor ${index}`, `given name (contributor ${index})`]);
    const surname =
      findCreatorField(row, index, ['surname']) ||
      lookupValue(row, [`surname_${index}`, `surname contributor ${index}`, `surname (contributor ${index})`]);
    const affiliation =
      findCreatorField(row, index, ['organisation', 'organization']) ||
      lookupValue(row, [`organisation_${index}`, `organization_${index}`, `organisation contributor ${index}`, `organization contributor ${index}`]);
    const orcid = findCreatorField(row, index, ['orcid']) || lookupValue(row, [`orcid_${index}`, `orcid contributor ${index}`]);
    const contributorRole = guessContributionRole(row, index, mode);
    const sequence = index === 1 ? 'first' : 'additional';

    if (!givenName && !surname && !affiliation && !orcid) continue;

    creators.push({
      sequence,
      contributorRole,
      givenName,
      surname,
      affiliation,
      orcid,
    });
  }

  return creators;
}

function parseCreatorsSheet(sheetRows: Record<string, string>[], recordId: string, mode: Mode): Creator[] {
  const creators: Creator[] = [];

  for (const row of sheetRows) {
    const rowRecordId = lookupValue(row, ['record_id', 'parent_id', 'doi_record_id']);
    if (rowRecordId !== recordId) continue;

    creators.push({
      sequence: creators.length === 0 ? 'first' : 'additional',
      contributorRole: (lookupValue(row, ['contributor_role', 'role']) as Creator['contributorRole']) || (mode === 'translation' ? 'translator' : 'author'),
      givenName: lookupValue(row, ['given_name', 'given name']),
      surname: lookupValue(row, ['surname', 'family_name', 'last_name']),
      affiliation: lookupValue(row, ['organisation', 'organization', 'affiliation']),
      orcid: lookupValue(row, ['orcid']),
    });
  }

  return creators.filter((creator) => creator.givenName || creator.surname || creator.affiliation || creator.orcid);
}

export function parseWorkbookRecord(workbook: WorkbookImport, sheetName: string, rowIndex: number): { mode: Mode; recordId: string; record: RecordBase; creators: Creator[] } {
  const sheet = workbook.sheets.find((entry) => entry.name === sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);

  const row = sheet.rows[rowIndex];
  if (!row) throw new Error(`Row not found in ${sheetName}: ${rowIndex + 1}`);

  const mode = detectModeFromSheetName(sheetName) || (lookupValue(row, ['record_type', 'mode']) as Mode) || 'resource';
  const recordId = lookupValue(row, ['record_id', 'id', 'recordid']) || `${sheetName}-${rowIndex + 1}`;
  const record = parseRecordFromRow(row, mode);

  const creatorsSheet = workbook.sheets.find((entry) => normalizeHeader(entry.name).includes('creator'));
  const creatorsFromSheet = creatorsSheet ? parseCreatorsSheet(creatorsSheet.rows, recordId, mode) : [];
  const creators = creatorsFromSheet.length > 0 ? creatorsFromSheet : parseInlineCreators(row, mode);

  return { mode, recordId, record, creators };
}

export function extractControlSettings(workbook: WorkbookImport): WorkbookControlState {
  const controlSheet = workbook.sheets.find((sheet) => classifySheet(sheet.name) === 'control');
  if (!controlSheet) return {};

  const settings: WorkbookControlState = {};

  for (const row of controlSheet.rows) {
    const key = row['key'] || row['Key'] || '';
    const value = row['value'] || row['Value'] || '';
    if (key) settings[normalizeHeader(key)] = value;
  }

  return settings;
}
