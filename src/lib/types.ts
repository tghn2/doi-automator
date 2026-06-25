export type Mode = 'hub' | 'resource' | 'translation' | 'appendix';

export type Creator = {
  sequence: 'first' | 'additional';
  contributorRole: 'author' | 'translator';
  givenName: string;
  surname: string;
  affiliation?: string;
  orcid?: string;
  organization?: string;
};

export type RecordBase = {
  title: string;
  abstract: string;
  year: string;
  month: string;
  day: string;
  resourceUrl: string;
  language: string;
  publicationType: 'full_text' | 'abstract_only' | 'bibliographic_record';
  referenceDoi: string;
  relatedDoi: string;
  originalTitle?: string;
};

export type WorkbookSheetKind = 'record' | 'control' | 'lists' | 'other';

export type WorkbookSheet = {
  name: string;
  kind: WorkbookSheetKind;
  rows: Record<string, string>[];
};

export type WorkbookImport = {
  fileName: string;
  importedAt: string;
  sheets: WorkbookSheet[];
};

export type WorkbookControlState = Record<string, string>;
