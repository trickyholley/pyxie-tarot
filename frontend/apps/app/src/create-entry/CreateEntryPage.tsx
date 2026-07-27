// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, Spread } from "@pyxie/api-client";
import { Button } from "@pyxie/ui";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import EntryReview from "./EntryReview";
import SpreadPicker from "./SpreadPicker";

type Step = "pick" | "review" | "done";

export default function CreateEntryPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const saveToDiary = type !== "free";

  const [step, setStep] = useState<Step>("pick");
  const [spread, setSpread] = useState<Spread | null>(null);
  const [cards, setCards] = useState<EntryCard[]>([]);

  const startNewEntry = () => {
    setSpread(null);
    setCards([]);
    setStep("pick");
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {step === "pick" && (
        <SpreadPicker
          onDrawn={(drawnSpread, drawnCards) => {
            setSpread(drawnSpread);
            setCards(drawnCards);
            setStep("review");
          }}
        />
      )}

      {step === "review" && spread && (
        <EntryReview spread={spread} cards={cards} saveToDiary={saveToDiary} onSubmitted={() => setStep("done")} />
      )}

      {step === "done" && (
        <>
          <p>{saveToDiary ? "Entry saved." : "Reading complete."}</p>
          <Button type="button" onClick={startNewEntry}>
            New entry
          </Button>
        </>
      )}
    </div>
  );
}
