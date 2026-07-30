// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@pyxie/ui";
import { useState } from "react";
import EntryCalendar from "./EntryCalendar";
import EntryList from "./EntryList";

type View = "list" | "calendar";

const VIEWS: { key: View; label: string }[] = [
  { key: "list", label: "List" },
  { key: "calendar", label: "Calendar" },
];

export default function DiaryPage() {
  const [view, setView] = useState<View>("list");
  // Once a view has been shown, keep it mounted (just hidden) instead of unmounting it, so
  // switching back doesn't re-fetch. Each view still only loads lazily, on first activation.
  const [visited, setVisited] = useState<Record<View, boolean>>({ list: true, calendar: false });

  const showView = (key: View) => {
    setView(key);
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-xs overflow-hidden rounded-md border bg-card">
        {VIEWS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => showView(key)}
            className={cn(
              "flex-1 py-2 text-xs",
              view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visited.list && (
        <div className={cn("w-full", view !== "list" && "hidden")}>
          <EntryList />
        </div>
      )}
      {visited.calendar && (
        <div className={cn("flex w-full justify-center", view !== "calendar" && "hidden")}>
          <EntryCalendar />
        </div>
      )}
    </div>
  );
}
