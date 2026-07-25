import { EntryCard, Spread, spreadsAPI } from "@pyxie/api-client";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { drawCards } from "./drawCards";

interface SpreadPickerProps {
  onDrawn: (spread: Spread, cards: EntryCard[]) => void;
}

export default function SpreadPicker({ onDrawn }: SpreadPickerProps) {
  const [spreads, setSpreads] = useState<Spread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    spreadsAPI
      .listSpreads()
      .then((result) => {
        setSpreads(result);
        setSelectedId(result[0]?.id ?? null);
      })
      .catch((err) => toast.error(errorMessage(err, "Failed to load spreads")));
  }, []);

  const handleDraw = () => {
    const spread = spreads.find((s) => s.id === selectedId);
    if (!spread) return;
    onDrawn(spread, drawCards(spread));
  };

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedId} onValueChange={(value) => value !== null && setSelectedId(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a spread" />
        </SelectTrigger>
        <SelectContent>
          {spreads.map((spread) => (
            <SelectItem key={spread.id} value={spread.id}>
              {spread.name} ({spread.num_cards} card{spread.num_cards === 1 ? "" : "s"})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" disabled={!selectedId} onClick={handleDraw}>
        Draw
      </Button>
    </div>
  );
}
