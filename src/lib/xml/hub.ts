import { escapeXml } from './escape';
import { buildEnvelope } from './envelope';

export function buildHubXml(input: {
  batchId: string;
  timestamp: string;
  depositorName: string;
  emailAddress: string;
  registrant: string;
  title: string;
  year: string;
  month: string;
  day: string;
  doi: string;
  resourceUrl: string;
}): string {
  const body = [
    '  <body>',
    '    <book book_type="other">',
    '      <book_metadata>',
    '        <titles>',
    `          <title>${escapeXml(input.title)}</title>`,
    '        </titles>',
    '        <publication_date media_type="online">',
    `          <month>${escapeXml(input.month)}</month>`,
    `          <day>${escapeXml(input.day)}</day>`,
    `          <year>${escapeXml(input.year)}</year>`,
    '        </publication_date>',
    '        <noisbn reason="archive_volume"/>',
    '        <publisher><publisher_name>The Global Health Network</publisher_name></publisher>',
    '        <doi_data>',
    `          <doi>${escapeXml(input.doi)}</doi>`,
    `          <resource>${escapeXml(input.resourceUrl)}</resource>`,
    '        </doi_data>',
    '      </book_metadata>',
    '    </book>',
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
