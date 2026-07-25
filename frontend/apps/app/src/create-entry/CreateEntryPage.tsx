import { EntryCard, Spread } from "@pyxie/api-client";
import { Button } from "@pyxie/ui";
import { useState } from "react";
import EntryReview from "./EntryReview";
import SpreadPicker from "./SpreadPicker";

type Step = "pick" | "review" | "done";

export default function CreateEntryPage() {
  const [step, setStep] = useState<Step>("pick");
  const [spread, setSpread] = useState<Spread | null>(null);
  const [cards, setCards] = useState<EntryCard[]>([]);

  const startNewEntry = () => {
    setSpread(null);
    setCards([]);
    setStep("pick");
  };

  if (step === "pick") {
    return (
      <SpreadPicker
        onDrawn={(drawnSpread, drawnCards) => {
          setSpread(drawnSpread);
          setCards(drawnCards);
          setStep("review");
        }}
      />
    );
  }

  if (step === "review" && spread) {
    return <EntryReview spread={spread} cards={cards} onSubmitted={() => setStep("done")} />;
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <p>Entry saved.</p>
      <Button type="button" onClick={startNewEntry}>
        New entry
      </Button>
    </div>
  );
}
