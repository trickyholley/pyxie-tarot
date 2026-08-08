// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@pyxie/ui";
import { Calendar, List } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHeader } from "@/lib/header.tsx";
import EntryCalendar from "./EntryCalendar";
import EntryList from "./EntryList";

type View = "list" | "calendar";

export default function DiaryPage() {
  const { t } = useTranslation("diary");
  useHeader({ title: t("title") });
  const VIEWS: { key: View; label: string; icon: typeof List }[] = [
    { key: "calendar", label: t("views.calendar"), icon: Calendar },
    { key: "list", label: t("views.list"), icon: List },
  ];
  const [view, setView] = useState<View>("calendar");
  // Once a view has been shown, keep it mounted (just hidden) instead of unmounting it, so
  // switching back doesn't re-fetch. Each view still only loads lazily, on first activation.
  const [visited, setVisited] = useState<Record<View, boolean>>({ list: false, calendar: true });

  const showView = (key: View) => {
    setView(key);
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-36 overflow-hidden rounded-md border bg-card">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => showView(key)}
            aria-label={label}
            className={cn(
              "flex flex-1 items-center justify-center py-2",
              view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
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
