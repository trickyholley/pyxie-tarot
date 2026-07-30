// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from "@pyxie/ui";
import { useState } from "react";
import EntryCalendar from "./EntryCalendar";
import EntryList from "./EntryList";

type View = "list" | "calendar";

export default function HistoryPage() {
  const [view, setView] = useState<View>("list");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-4 pt-[5.5rem]">
      <div className="flex gap-2">
        <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
          List
        </Button>
        <Button variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>
          Calendar
        </Button>
      </div>

      {view === "list" ? <EntryList /> : <EntryCalendar />}
    </div>
  );
}
