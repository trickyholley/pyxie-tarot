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
  const title = type === "daily" ? "Daily Spread" : type === "free" ? "Free Spread" : "Draw a spread";
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
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-lg font-medium">{title}</h1>

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
