// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Card, CardContent, Logo } from "@pyxie/ui";
import { Link } from "react-router-dom";
import {
  type PolicyBlock,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_SECTIONS,
} from "@/lib/privacyPolicyContent.ts";
import { AppRoute } from "@/lib/routes.ts";

// Splits on (and keeps) URLs/emails so plain-text policy content can link out - some targets (e.g.
// the /contact page) don't exist yet, but the address is still worth being clickable today.
const LINK_PATTERN = /(https?:\/\/\S+[^\s.,;:!?)]|[\w.+-]+@[\w-]+\.[a-zA-Z]{2,})/g;
const LINK_CLASS = "underline underline-offset-2 hover:text-foreground";

function linkify(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(LINK_PATTERN);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={`${keyPrefix}-${i}`} href={part} target="_blank" rel="noreferrer" className={LINK_CLASS}>
          {part}
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

function PolicyBlocks({ blocks }: { blocks: PolicyBlock[] }) {
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

export default function PrivacyPolicy() {
  return (
    <div className="flex h-dvh flex-col p-4">
      <div className="flex flex-col items-center gap-3 text-center mb-2">
        <Logo className="size-16" />
        <div>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: {PRIVACY_POLICY_EFFECTIVE_DATE}</p>
        </div>
        <div className="flex justify-center pb-4">
          <Link to={AppRoute.Home} className="text-sm text-muted-foreground underline underline-offset-4">
            Back to Home
          </Link>
        </div>
      </div>
      <Card className="mx-auto max-h-[75dvh] w-2xl max-w-19/20">
        <CardContent className="overflow-y-auto">
          <Accordion>
            {PRIVACY_POLICY_SECTIONS.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-3">
                  {section.blocks && <PolicyBlocks blocks={section.blocks} />}
                  {section.subsections?.map((sub) => (
                    <div key={sub.id} className="flex flex-col gap-3 pl-1">
                      <h3 className="text-base font-medium">{sub.title}</h3>
                      <PolicyBlocks blocks={sub.blocks} />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
