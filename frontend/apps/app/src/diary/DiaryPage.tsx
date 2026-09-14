// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn, SegmentedControl } from "@pyxie/ui";
import { BookHeart, Calendar, List } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHeader } from "@/lib/header.tsx";
import EntryCalendar from "./EntryCalendar";
import EntryList from "./EntryList";

type View = "list" | "calendar";

export default function DiaryPage() {
  const { t } = useTranslation("diary");
  useHeader({ title: t("title"), icon: BookHeart });
  const VIEWS: { key: View; label: string; icon: typeof List }[] = [
    { key: "calendar", label: t("views.calendar"), icon: Calendar },
    { key: "list", label: t("views.list"), icon: List },
  ];
  const [view, setView] = useState<View>("calendar");
  // Once shown, a view stays mounted (just hidden) so switching back doesn't re-fetch.
  const [visited, setVisited] = useState<Record<View, boolean>>({ list: false, calendar: true });

  const showView = (key: View) => {
    setView(key);
    setVisited((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 p-4">
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={showView}
        label={t("viewsLabel")}
        className="w-full max-w-48"
      />

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
