import { useEffect, useMemo, useState } from 'react';
import type { Creator, Mode, RecordBase, WorkbookImport, WorkbookSheet } from './lib/types';
import { buildHubXml } from './lib/xml/hub';
import { buildResourceXml } from './lib/xml/resource';
import { buildTranslationXml } from './lib/xml/translation';
import { buildAppendixXml } from './lib/xml/appendix';
import { buildExportMeta, DEFAULT_NEXT_DOI_SUFFIX, type ExportMeta } from './lib/export';
import { classifySheet, extractControlSettings, parseWorkbookFile, parseWorkbookRecord } from './lib/workbook';

const STORAGE_KEY = 'doi-automator-next-doi-suffix';
const FALLBACK_DEPOSITOR_NAME = 'tghn:tghn';
const FALLBACK_EMAIL = 'samuel.driver@ndm.ox.ac.uk';
const FALLBACK_REGISTRANT = 'The Global Health Network';

function getStoredNextDoiSuffix(): number {
  if (typeof window === 'undefined') return DEFAULT_NEXT_DOI_SUFFIX;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_NEXT_DOI_SUFFIX;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NEXT_DOI_SUFFIX;
}

function persistNextDoiSuffix(value: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(value));
}

function defaultRecord(): RecordBase {
  return {
    title: 'Title',
    abstract:
      'Abstract',
    year: '2026',
    month: '01',
    day: '01',
    resourceUrl:
      'https://####.###',
    language: 'en',
    publicationType: 'full_text',
    referenceDoi: '',
    relatedDoi: '',
  };
}

function blankCreator(mode: Mode, sequence: 'first' | 'additional' = 'first'): Creator {
  return {
    sequence,
    contributorRole: mode === 'translation' ? 'translator' : 'author',
    givenName: '',
    surname: '',
    affiliation: '',
    orcid: '',
  };
}

function defaultCreators(mode: Mode): Creator[] {
  return [blankCreator(mode, 'first')];
}

function normalizeCreatorSequences(items: Creator[]): Creator[] {
  return items.map((creator, index) => ({
    ...creator,
    sequence: index === 0 ? 'first' : 'additional',
  }));
}

function buildXml(mode: Mode, record: RecordBase, creators: Creator[], meta: ExportMeta) {
  switch (mode) {
    case 'hub':
      return buildHubXml({
        batchId: meta.batchId,
        timestamp: meta.timestamp,
        depositorName: FALLBACK_DEPOSITOR_NAME,
        emailAddress: FALLBACK_EMAIL,
        registrant: FALLBACK_REGISTRANT,
        title: record.title || 'Knowledge Hub',
        year: record.year,
        month: record.month,
        day: record.day,
        doi: meta.assignedDoi,
        resourceUrl: record.resourceUrl || 'https://example.org/hub/',
      });
    case 'resource':
      return buildResourceXml({
        batchId: meta.batchId,
        timestamp: meta.timestamp,
        depositorName: FALLBACK_DEPOSITOR_NAME,
        emailAddress: FALLBACK_EMAIL,
        registrant: FALLBACK_REGISTRANT,
        title: record.title,
        abstract: record.abstract,
        year: record.year,
        month: record.month,
        day: record.day,
        doi: meta.assignedDoi,
        resourceUrl: record.resourceUrl,
        language: record.language,
        publicationType: record.publicationType,
        creators,
        parentDoi: record.referenceDoi || '10.48060/tghn.187',
      });
    case 'translation':
      return buildTranslationXml({
        batchId: meta.batchId,
        timestamp: meta.timestamp,
        depositorName: FALLBACK_DEPOSITOR_NAME,
        emailAddress: FALLBACK_EMAIL,
        registrant: FALLBACK_REGISTRANT,
        title: record.title || 'Translated title here',
        originalTitle: record.originalTitle || 'Original title here',
        originalLanguage: 'en',
        abstract: record.abstract || 'Translated abstract here.',
        year: record.year,
        month: record.month,
        day: record.day,
        doi: meta.assignedDoi,
        resourceUrl: record.resourceUrl || 'https://example.org/translated-resource.pdf',
        language: record.language || 'es',
        publicationType: record.publicationType,
        translators: creators,
        hubDoi: record.referenceDoi || '10.48060/tghn.187',
        originalDoi: record.relatedDoi || record.referenceDoi,
      });
    case 'appendix':
      return buildAppendixXml({
        batchId: meta.batchId,
        timestamp: meta.timestamp,
        depositorName: FALLBACK_DEPOSITOR_NAME,
        emailAddress: FALLBACK_EMAIL,
        registrant: FALLBACK_REGISTRANT,
        title: `${record.title}: Appendices`,
        abstract: record.abstract,
        year: record.year,
        month: record.month,
        day: record.day,
        doi: meta.assignedDoi,
        resourceUrl: record.resourceUrl,
        language: record.language,
        publicationType: record.publicationType,
        creators,
        hubDoi: record.referenceDoi || '10.48060/tghn.187',
        relatedResourceDoi: record.relatedDoi || record.referenceDoi,
      });
  }
}

function useNextDoiSuffix() {
  const [nextDoiSuffix, setNextDoiSuffix] = useState<number>(getStoredNextDoiSuffix);

  useEffect(() => {
    persistNextDoiSuffix(nextDoiSuffix);
  }, [nextDoiSuffix]);

  return [nextDoiSuffix, setNextDoiSuffix] as const;
}

function formatCell(value: string): string {
  return value === '' ? '—' : value;
}

export default function App() {
  const [mode, setMode] = useState<Mode>('hub');
  const [record, setRecord] = useState<RecordBase>(defaultRecord());
  const [creators, setCreators] = useState<Creator[]>(defaultCreators('hub'));
  const [nextDoiSuffix, setNextDoiSuffix] = useNextDoiSuffix();
  const [exportMeta, setExportMeta] = useState<ExportMeta>(() =>
    buildExportMeta('hub', getStoredNextDoiSuffix()),
  );
  const [workbook, setWorkbook] = useState<WorkbookImport | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const [workbookNotice, setWorkbookNotice] = useState<string>('');

  useEffect(() => {
    setExportMeta(buildExportMeta(mode, nextDoiSuffix));
  }, [mode, nextDoiSuffix]);

  const controlSettings = useMemo(() => {
    if (!workbook) return {} as Record<string, string>;
    return extractControlSettings(workbook);
  }, [workbook]);

  useEffect(() => {
    const controlSuffix = controlSettings.nextdoisuffix || controlSettings.nextdoi || controlSettings.nextdoiid;
    if (controlSuffix) {
      const parsed = Number.parseInt(controlSuffix, 10);
      if (Number.isFinite(parsed) && parsed > 0) setNextDoiSuffix(parsed);
    }
  }, [controlSettings, setNextDoiSuffix]);

  const normalizedCreators = useMemo(() => normalizeCreatorSequences(creators), [creators]);
  const xml = useMemo(() => buildXml(mode, record, normalizedCreators, exportMeta), [mode, record, normalizedCreators, exportMeta]);

  const assignedDoiUrl = exportMeta.assignedDoiUrl;
  const currentSheet = workbook?.sheets.find((sheet) => sheet.name === activeSheetName) ?? null;
  const recordSheets = workbook?.sheets.filter((sheet) => classifySheet(sheet.name) === 'record') ?? [];
  const controlSheets = workbook?.sheets.filter((sheet) => classifySheet(sheet.name) === 'control' || classifySheet(sheet.name) === 'lists') ?? [];

  const updateCreator = (index: number, patch: Partial<Creator>) => {
    setCreators((prev) => normalizeCreatorSequences(prev.map((creator, i) => (i === index ? { ...creator, ...patch } : creator))));
  };

  const addCreator = () => {
    setCreators((prev) => normalizeCreatorSequences([...prev, blankCreator(mode, 'additional')]));
  };

  const removeCreator = (index: number) => {
    setCreators((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return [blankCreator(mode, 'first')];
      return normalizeCreatorSequences(next);
    });
  };

  async function handleWorkbookUpload(file: File) {
    try {
      const parsed = await parseWorkbookFile(file);
      setWorkbook(parsed);
      setWorkbookNotice(`Loaded ${parsed.fileName} with ${parsed.sheets.length} sheet(s).`);

      const firstRecordSheet = parsed.sheets.find((sheet) => classifySheet(sheet.name) === 'record') ?? parsed.sheets[0] ?? null;
      if (firstRecordSheet) {
        setActiveSheetName(firstRecordSheet.name);
        setActiveRowIndex(0);
        if (firstRecordSheet.rows.length > 0) {
          const selected = parseWorkbookRecord(parsed, firstRecordSheet.name, 0);
          setMode(selected.mode);
          setRecord(selected.record);
          setCreators(
            selected.creators.length > 0 ? normalizeCreatorSequences(selected.creators) : defaultCreators(selected.mode),
          );
        }
      }

      const importedDefaults = extractControlSettings(parsed);
      const nextSuffix = importedDefaults.nextdoisuffix;
      if (nextSuffix) {
        const parsedSuffix = Number.parseInt(nextSuffix, 10);
        if (Number.isFinite(parsedSuffix) && parsedSuffix > 0) setNextDoiSuffix(parsedSuffix);
      }
    } catch (error) {
      console.error(error);
      setWorkbookNotice('Could not read the workbook. Make sure it is a valid .xlsx file.');
    }
  }

  function loadSelectedRow() {
    if (!workbook || !currentSheet) return;
    if (currentSheet.rows.length === 0) return;

    const safeIndex = Math.min(Math.max(activeRowIndex, 0), currentSheet.rows.length - 1);
    const selected = parseWorkbookRecord(workbook, currentSheet.name, safeIndex);
    setMode(selected.mode);
    setRecord(selected.record);
    setCreators(selected.creators.length > 0 ? normalizeCreatorSequences(selected.creators) : defaultCreators(selected.mode));
    setWorkbookNotice(`Loaded row ${safeIndex + 1} from ${currentSheet.name}.`);
  }

  function clearWorkbook() {
    window.location.reload();
  }

  function selectSheet(sheet: WorkbookSheet) {
    setActiveSheetName(sheet.name);
    setActiveRowIndex(0);
    if (sheet.kind === 'record' && sheet.rows.length > 0) {
      const selected = parseWorkbookRecord(workbook!, sheet.name, 0);
      setMode(selected.mode);
      setRecord(selected.record);
      setCreators(selected.creators.length > 0 ? normalizeCreatorSequences(selected.creators) : defaultCreators(selected.mode));
    }
  }

  const exportXml = async (action: 'copy' | 'download') => {
    if (mode === 'translation' && (!record.referenceDoi.trim() || !record.relatedDoi.trim())) {
      alert('Please enter both the hub DOI and translated resource DOI before exporting this record.');
      return;
    }
    if (mode === 'appendix' && (!record.referenceDoi.trim() || !record.relatedDoi.trim())) {
      alert('Please enter both the hub DOI and related resource DOI before exporting this record.');
      return;
    }

    const output = xml;

    if (action === 'copy') {
      await navigator.clipboard.writeText(output);
    } else {
      const blob = new Blob([output], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mode}-${exportMeta.assignedDoiSuffix}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setNextDoiSuffix((prev) => prev + 1);
  };

  function renderSheetPreview(sheet: WorkbookSheet) {
    if (sheet.rows.length === 0) {
      return <div className="muted">No rows in this sheet.</div>;
    }

    const headers = Object.keys(sheet.rows[0] ?? {}).slice(0, 8);
    const rows = sheet.rows.slice(0, 8);

    return (
      <div className="sheet-preview">
        <div className="sheet-meta muted">
          {sheet.rows.length} row(s) • {sheet.kind}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header) => (
                    <td key={header}>{formatCell(row[header] || '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>DOI Automator</h1>
          <small>Client-side XML generator for Fleming Fund-style Crossref deposits.</small>
        </div>
        <div className="muted">Netlify-ready Vite app</div>
      </div>

      <div className="import-bar card" style={{ marginBottom: 18 }}>
        <div className="row two import-row">
          <div>
            <label>Import workbook (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleWorkbookUpload(file);
              }}
            />
          </div>
          <div>
            <label>Workbook status</label>
            <input value={workbookNotice || 'No workbook loaded.'} readOnly />
          </div>
        </div>
        <div className="actions">          
          <button className="secondary" onClick={clearWorkbook}>
            Reset app
          </button>
        </div>
      </div>

      {workbook && (
        <div className="card workbook-panel" style={{ marginBottom: 18 }}>
          <div className="row two">
            <div>
              <label>Workbook sheets</label>
              <div className="tabs tabs-wrap">
                {workbook.sheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    className={`tab ${activeSheetName === sheet.name ? 'active' : ''}`}
                    onClick={() => selectSheet(sheet)}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Control sheets</label>
              <div className="sheet-stack">
                {controlSheets.length === 0 ? (
                  <div className="muted">No control/list sheets found.</div>
                ) : (
                  controlSheets.map((sheet) => (
                    <div key={sheet.name} className="sheet-chip">
                      <strong>{sheet.name}</strong>
                      <span>{sheet.rows.length} row(s)</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {currentSheet && currentSheet.kind === 'record' && (
            <div className="row two" style={{ marginTop: 14 }}>
              <div>
                <label>Choose row</label>
                <select value={activeRowIndex} onChange={(e) => setActiveRowIndex(Number.parseInt(e.target.value, 10))}>
                  {currentSheet.rows.map((_, index) => (
                    <option key={index} value={index}>
                      Row {index + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="actions">
                <button className="secondary" onClick={loadSelectedRow} disabled={!workbook || !currentSheet}>
                  Load selected row
                </button>                
              </div>
            </div>
          )}

          {currentSheet && (
            <div style={{ marginTop: 16 }}>{renderSheetPreview(currentSheet)}</div>
          )}
        </div>
      )}

      <div className="grid">
        <div className="card">
          <div className="fields">
            <div className="row two">
              <div>
                <label>Batch ID</label>
                <input value={exportMeta.batchId} readOnly />
              </div>
              <div>
                <label>Timestamp</label>
                <input value={exportMeta.timestamp} readOnly />
              </div>
            </div>

            <div className="row two">
              <div>
                <label>Next DOI suffix</label>
                <input
                  value={nextDoiSuffix}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(parsed) && parsed > 0) setNextDoiSuffix(parsed);
                  }}
                />
              </div>
              <div>
                <label>Assigned DOI</label>
                <input value={assignedDoiUrl} readOnly />
              </div>
            </div>

            <div className="row two">
              <div>
                <label>Title</label>
                <input value={record.title} onChange={(e) => setRecord({ ...record, title: e.target.value })} />
              </div>
              <div>
                {mode === 'hub' ? (
                  <div>
                    <label>Hub URL</label>
                    <input
                      value={record.resourceUrl}
                      onChange={(e) => setRecord({ ...record, resourceUrl: e.target.value })}
                      placeholder="https://example.org/hub/"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label>{mode === 'translation' ? 'Original DOI' : 'Hub DOI'}</label>
                      <input
                        value={record.referenceDoi}
                        onChange={(e) => setRecord({ ...record, referenceDoi: e.target.value })}
                        placeholder="10.48060/tghn.187"
                      />
                    </div>
                    {mode === 'appendix' && (
                      <div style={{ marginTop: 12 }}>
                        <label>Related resource DOI</label>
                        <input
                          value={record.relatedDoi}
                          onChange={(e) => setRecord({ ...record, relatedDoi: e.target.value })}
                          placeholder="10.48060/tghn.196"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <label>Abstract</label>
              <textarea value={record.abstract} onChange={(e) => setRecord({ ...record, abstract: e.target.value })} />
            </div>

            <div className="row three">
              <div>
                <label>Year</label>
                <input value={record.year} onChange={(e) => setRecord({ ...record, year: e.target.value })} />
              </div>
              <div>
                <label>Month</label>
                <input value={record.month} onChange={(e) => setRecord({ ...record, month: e.target.value })} />
              </div>
              <div>
                <label>Day</label>
                <input value={record.day} onChange={(e) => setRecord({ ...record, day: e.target.value })} />
              </div>
            </div>

            <div className="row two">
              <div>
                <label>{mode === 'hub' ? 'Hub URL' : 'Resource URL'}</label>
                <input value={record.resourceUrl} onChange={(e) => setRecord({ ...record, resourceUrl: e.target.value })} />
              </div>
              <div>
                <label>Language</label>
                <input value={record.language} onChange={(e) => setRecord({ ...record, language: e.target.value })} />
              </div>
            </div>

            <div className="row two">
              <div>
                <label>Mode</label>
                <input value={mode} readOnly />
              </div>
              <div />
            </div>

            <div>
              <div className="row two" style={{ alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Creators</h3>
                <div className="actions" style={{ justifyContent: 'flex-end', margin: 0 }}>
                  <button className="secondary" onClick={addCreator}>
                    Add creator
                  </button>
                </div>
              </div>
              {creators.map((creator, index) => (
                <div className="creator" key={index} style={{ marginTop: 10 }}>
                  <div className="row two">
                    <div>
                      <label>Sequence</label>
                      <input value={creator.sequence} readOnly />
                    </div>
                    <div>
                      <label>Role</label>
                      <input
                        value={creator.contributorRole}
                        onChange={(e) =>
                          updateCreator(index, { contributorRole: e.target.value as Creator['contributorRole'] })
                        }
                      />
                    </div>
                  </div>
                  <div className="row two">
                    <div>
                      <label>Given name</label>
                      <input value={creator.givenName} onChange={(e) => updateCreator(index, { givenName: e.target.value })} />
                    </div>
                    <div>
                      <label>Surname</label>
                      <input value={creator.surname} onChange={(e) => updateCreator(index, { surname: e.target.value })} />
                    </div>
                  </div>
                  <div className="row two">
                    <div>
                      <label>Affiliation</label>
                      <input value={creator.affiliation ?? ''} onChange={(e) => updateCreator(index, { affiliation: e.target.value })} />
                    </div>
                    <div>
                      <label>ORCID</label>
                      <input value={creator.orcid ?? ''} onChange={(e) => updateCreator(index, { orcid: e.target.value })} />
                    </div>
                  </div>
                  <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 0 }}>
                    <button className="secondary" onClick={() => removeCreator(index)} disabled={creators.length === 1}>
                      Remove creator
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="actions">
            <button className="primary" onClick={() => exportXml('copy')}>
              Copy XML and reserve DOI
            </button>
            <button className="secondary" onClick={() => exportXml('download')}>
              Download XML and reserve DOI
            </button>
          </div>
          <div className="muted" style={{ marginBottom: 12 }}>
            DOI allocation increments by 1 for every export, including hubs.
          </div>
          <textarea className="code" readOnly value={xml} />
        </div>
      </div>
    </div>
  );
}
