import { escapeXml } from './escape';
import type { Creator } from '../types';

export function buildContributors(creators: Creator[]): string {
  if (!creators.length) return '';

  const inner = creators
    .map((creator) => {
      const chunks = [
        `        <person_name sequence="${creator.sequence}" contributor_role="${creator.contributorRole}">`,
        `          <given_name>${escapeXml(creator.givenName)}</given_name>`,
        `          <surname>${escapeXml(creator.surname)}</surname>`,
        creator.affiliation
          ? `          <affiliations><institution><institution_name>${escapeXml(creator.affiliation)}</institution_name></institution></affiliations>`
          : '',
        creator.orcid ? `          <ORCID>https://orcid.org/${escapeXml(creator.orcid)}</ORCID>` : '',
        '        </person_name>',
      ].filter(Boolean);
      return chunks.join('\n');
    })
    .join('\n');

  return ['      <contributors>', inner, '      </contributors>'].join('\n');
}

export function buildRelationBlock(relations: Array<{ type: 'isPartOf' | 'isTranslationOf' | 'isRelatedMaterial'; doi: string; description?: string }>): string {
  if (!relations.length) return '';

  const inner = relations
    .map((relation) => {
      const tag = relation.type === 'isTranslationOf' ? 'intra_work_relation' : 'inter_work_relation';
      return [
        '        <related_item>',
        relation.description ? `          <description>${escapeXml(relation.description)}</description>` : '',
        `          <${tag} relationship-type="${relation.type}" identifier-type="doi">${escapeXml(relation.doi)}</${tag}>`,
        '        </related_item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return ['      <program xmlns="http://www.crossref.org/relations.xsd">', inner, '      </program>'].join('\n');
}
