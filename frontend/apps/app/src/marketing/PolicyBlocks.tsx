// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PolicyBlock } from "./policyContent.ts";

// Splits on (and keeps) URLs, emails and `[text](/in-app-path or https://url)` links so plain-text policy content can
// link out.
const LINK_PATTERN =
  /(\[[^\]]+\]\((?:\/|https?:\/\/)[^)]*\)|https?:\/\/\S+[^\s.,;:!?)]|[\w.+-]+@[\w-]+\.[a-zA-Z]{2,})/g;
const TEXT_LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;
const LINK_CLASS = "underline underline-offset-2 hover:text-foreground";

export function linkify(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(LINK_PATTERN);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const [, linkText, linkHref] = TEXT_LINK.exec(part) ?? [];
    if (linkHref?.startsWith("/")) {
      return (
        <Link key={`${keyPrefix}-${i}`} to={linkHref} className={LINK_CLASS}>
          {linkText}
        </Link>
      );
    }
    const externalHref = linkHref ?? (/^https?:\/\//.test(part) ? part : undefined);
    if (externalHref) {
      return (
        <a key={`${keyPrefix}-${i}`} href={externalHref} target="_blank" rel="noreferrer" className={LINK_CLASS}>
          {linkText ?? part}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/.test(part)) {
      return (
        <a key={`${keyPrefix}-${i}`} href={`mailto:${part}`} className={LINK_CLASS}>
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function PolicyBlocks({ blocks }: { blocks: PolicyBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === "p") {
          return (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {linkify(block.text, `p-${i}`)}
            </p>
          );
        }
        if (block.kind === "label") {
          return (
            <p key={i} className="text-sm font-medium">
              {block.text}
            </p>
          );
        }
        return (
          <ul key={i} className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {block.items.map((item, j) =>
              typeof item === "string" ? (
                <li key={j}>{linkify(item, `li-${i}-${j}`)}</li>
              ) : (
                <li key={j}>
                  {linkify(item.text, `li-${i}-${j}`)}
                  <ul className="mt-2 list-[circle] space-y-1 pl-5">
                    {item.sub.map((sub, k) => (
                      <li key={k}>{linkify(sub, `li-${i}-${j}-${k}`)}</li>
                    ))}
                  </ul>
                </li>
              ),
            )}
          </ul>
        );
      })}
    </>
  );
}
