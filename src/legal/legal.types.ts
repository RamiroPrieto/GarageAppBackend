export const LEGAL_LANGUAGES = ['it', 'en', 'es'] as const;
export type LegalLanguage = (typeof LEGAL_LANGUAGES)[number];

export const LEGAL_PAGES = [
  'privacy',
  'terms',
  'delete-account',
  'support',
] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

// Who runs the service. Comes from the environment, see legal.identity.ts.
export interface LegalIdentity {
  name?: string;
  address?: string;
  vat?: string;
  email: string;
  euRepresentative?: string;
}

export interface LegalSection {
  heading?: string;
  // Plain text. A string is a paragraph and an array is a bullet list.
  body: Array<string | string[]>;
}

export interface LegalDocument {
  title: string;
  sections: LegalSection[];
}

export interface LegalContent {
  updated: string;
  // Shown, highlighted, where a detail has not been configured yet.
  missing: { name: string; address: string };
  pages: (identity: LegalIdentity) => Record<LegalPage, LegalDocument>;
}
