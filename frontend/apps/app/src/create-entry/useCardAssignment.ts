// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { pinPointFor } from "@pyxie/ui";
import { useEffect, useMemo, useState } from "react";

interface UseCardAssignmentOptions {
  cards: EntryCard[];
  isManual: boolean;
  isPhoto: boolean;
  nextPosition: SpreadPosition | undefined;
  onAssigned: () => void;
}

/** Manual/photo card assignment: which card sits at which position, and (photo canvas only) a placed
 * pin's live coordinate while it awaits a card. No-ops when `isManual` is false. */
export function useCardAssignment({ cards, isManual, isPhoto, nextPosition, onAssigned }: UseCardAssignmentOptions) {
  // Seeded from `cards` once, at mount, so a resumed draft's (skipReveal) saved picks aren't dropped.
  const [manualCards, setManualCards] = useState<EntryCard[]>(cards);
  // A placed-but-unassigned pin's live coordinate, keyed by position index - an assigned pin's
  // coordinate lives on its EntryCard's pin_x/pin_y instead (see handlePinDrag).
  const [pinPositions, setPinPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [reassignIndex, setReassignIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const knownCards = isManual ? manualCards : cards;
  const cardsByIndex = useMemo(() => new Map(knownCards.map((card) => [card.position_index, card])), [knownCards]);

  const openPicker = (positionIndex: number | undefined) => {
    setReassignIndex(positionIndex ?? null);
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setReassignIndex(null);
  };

  const handlePicked = ({ card, reversed }: { card: string; reversed: boolean }) => {
    if (reassignIndex === null) return;
    const pin = pinPointFor(cardsByIndex, pinPositions, reassignIndex);
    const cardEntry: EntryCard = {
      position_index: reassignIndex,
      card,
      reversed,
      ...(pin ? { pin_x: pin.x, pin_y: pin.y } : {}),
    };
    const alreadyAssigned = manualCards.some((existing) => existing.position_index === reassignIndex);
    setManualCards((prev) =>
      alreadyAssigned
        ? prev.map((existing) => (existing.position_index === reassignIndex ? cardEntry : existing))
        : [...prev, cardEntry],
    );
    if (!alreadyAssigned) onAssigned();
    // Now covered by the card's own pin_x/pin_y instead - see handlePinDrag.
    setPinPositions((prev) => {
      if (!prev.has(reassignIndex)) return prev;
      const next = new Map(prev);
      next.delete(reassignIndex);
      return next;
    });
    closePicker();
  };

  // Opens the picker for an unassigned pin, or reopens it to reassign an already-picked one.
  const handlePinTap = (positionIndex: number) => openPicker(positionIndex);

  const handlePinDrag = (positionIndex: number, x: number, y: number) => {
    if (cardsByIndex.has(positionIndex)) {
      setManualCards((prev) =>
        prev.map((card) => (card.position_index === positionIndex ? { ...card, pin_x: x, pin_y: y } : card)),
      );
      return;
    }
    setPinPositions((prev) => new Map(prev).set(positionIndex, { x, y }));
  };

  // The photo canvas has no pre-authored slot to tap - each pin drops at the spread's authored x/y
  // (a starting point only) the moment it becomes active, and the user drags it into place.
  useEffect(() => {
    if (!isPhoto || !nextPosition || cardsByIndex.has(nextPosition.index)) return;
    setPinPositions((prev) =>
      prev.has(nextPosition.index)
        ? prev
        : new Map(prev).set(nextPosition.index, { x: nextPosition.x, y: nextPosition.y }),
    );
  }, [isPhoto, nextPosition, cardsByIndex]);

  return {
    cards: knownCards,
    cardsByIndex,
    pinPositions,
    reassignIndex,
    pickerOpen,
    openPicker,
    closePicker,
    handlePicked,
    handlePinTap,
    handlePinDrag,
  };
}
