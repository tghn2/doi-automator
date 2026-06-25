import { escapeXml } from './escape';

const VERSION = '5.4.0';
const NS = 'http://www.crossref.org/schema/5.4.0';
const SCHEMA = 'https://www.crossref.org/schemas/crossref5.4.0.xsd';

export function buildEnvelope(params: {
  batchId: string;
  timestamp: string;
  depositorName: string;
  emailAddress: string;
  registrant: string;
  body: string;
}): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<doi_batch xmlns="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1" version="${VERSION}" xsi:schemaLocation="${NS} ${SCHEMA}">`,
    '  <head>',
    `    <doi_batch_id>${escapeXml(params.batchId)}</doi_batch_id>`,
    `    <timestamp>${escapeXml(params.timestamp)}</timestamp>`,
    '    <depositor>',
    `      <depositor_name>${escapeXml(params.depositorName)}</depositor_name>`,
    `      <email_address>${escapeXml(params.emailAddress)}</email_address>`,
    '    </depositor>',
    `    <registrant>${escapeXml(params.registrant)}</registrant>`,
    '  </head>',
    params.body,
    '</doi_batch>',
  ].join('\n');
}
