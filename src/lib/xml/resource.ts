import { escapeXml } from './escape';
import { buildEnvelope } from './envelope';
import { buildContributors, buildRelationBlock } from './shared';
import type { Creator } from '../types';

export function buildResourceXml(input: {
  batchId: string;
  timestamp: string;
  depositorName: string;
  emailAddress: string;
  registrant: string;
  title: string;
  abstract: string;
  year: string;
  month: string;
  day: string;
  doi: string;
  resourceUrl: string;
  language: string;
  publicationType: 'full_text' | 'abstract_only' | 'bibliographic_record';
  creators: Creator[];
  parentDoi: string;
}): string {
  const body = [
    '  <body>',
    `    <report-paper publication_type="${escapeXml(input.publicationType)}" language="${escapeXml(input.language)}">`,
    `      <report-paper_metadata language="${escapeXml(input.language)}">`,
    buildContributors(input.creators),
    '        <titles>',
    `          <title>${escapeXml(input.title)}</title>`,
    '        </titles>',
    `        <jats:abstract xml:lang="${escapeXml(input.language)}">`,
    `          <jats:p>${escapeXml(input.abstract)}</jats:p>`,
    '        </jats:abstract>',
    '        <publication_date media_type="online">',
    `          <month>${escapeXml(input.month)}</month>`,
    `          <day>${escapeXml(input.day)}</day>`,
    `          <year>${escapeXml(input.year)}</year>`,
    '        </publication_date>',
    '        <publisher><publisher_name>The Global Health Network</publisher_name></publisher>',
    buildRelationBlock([{ type: 'isPartOf', doi: input.parentDoi }]),
    '        <doi_data>',
    `          <doi>${escapeXml(input.doi)}</doi>`,
    `          <resource>${escapeXml(input.resourceUrl)}</resource>`,
    '        </doi_data>',
    '      </report-paper_metadata>',
    '    </report-paper>',
    '  </body>',
  ].join('\n');

  return buildEnvelope({
    batchId: input.batchId,
    timestamp: input.timestamp,
    depositorName: input.depositorName,
    emailAddress: input.emailAddress,
    registrant: input.registrant,
    body,
  });
}
