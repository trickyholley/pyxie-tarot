// SPDX-License-Identifier: AGPL-3.0-or-later

export type PolicyBlock =
  | { kind: "p"; text: string }
  | { kind: "label"; text: string }
  | { kind: "ul"; items: (string | { text: string; sub: string[] })[] };

export interface PolicySubsection {
  id: string;
  title: string;
  blocks: PolicyBlock[];
}

export interface PolicySection {
  id: string;
  title: string;
  blocks?: PolicyBlock[];
  subsections?: PolicySubsection[];
}

export const PRIVACY_POLICY_EFFECTIVE_DATE = "17 August 2026";
export const TERMS_OF_SERVICE_EFFECTIVE_DATE = "29 September 2026";
