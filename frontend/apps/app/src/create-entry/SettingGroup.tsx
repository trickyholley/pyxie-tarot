// SPDX-License-Identifier: AGPL-3.0-or-later
import { Label } from "@pyxie/ui";
import { type ReactNode } from "react";

interface SettingGroupProps {
  label: string;
  blurb?: string;
  extra?: ReactNode;
  children: ReactNode;
}

// Shared Label + control + blurb layout for the type toggle, canvas type, and card selection mode
// settings - `extra` covers a setting's own conditional message (e.g. the photo licence note).
export default function SettingGroup({ label, blurb, extra, children }: SettingGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {blurb && <p className="text-sm text-muted-foreground">{blurb}</p>}
      {extra && <span className="italic">{extra}</span>}
    </div>
  );
}
