import { EntryCard, Spread, spreadsAPI } from "@pyxie/api-client";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@pyxie/ui";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { drawCards } from "./drawCards";

interface SpreadPickerProps {
  onDrawn: (spread: Spread, cards: EntryCard[]) => void;
}

function spreadLabel(spread: Spread) {
  return `${spread.name} (${spread.num_cards} card${spread.num_cards === 1 ? "" : "s"})`;
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

  const items = Object.fromEntries(spreads.map((spread) => [spread.id, spreadLabel(spread)]));

  return (
    <Card className="mt-[5.5rem] w-full max-w-sm">
      <CardContent className="flex flex-col gap-4">
        <Select items={items} value={selectedId} onValueChange={(value) => value !== null && setSelectedId(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a spread" />
          </SelectTrigger>
          <SelectContent>
            {spreads.map((spread) => (
              <SelectItem key={spread.id} value={spread.id}>
                {spreadLabel(spread)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" disabled={!selectedId} onClick={handleDraw}>
          Draw
        </Button>
      </CardContent>
    </Card>
  );
}
