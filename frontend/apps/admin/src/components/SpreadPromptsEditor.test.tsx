import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpreadPromptsEditor from "./SpreadPromptsEditor";

describe("SpreadPromptsEditor", () => {
  it("renders one input per prompt", () => {
    render(
      <SpreadPromptsEditor
        prompts={["What draws you?", "What holds you back?"]}
        onUpdatePrompt={vi.fn()}
        onRemovePrompt={vi.fn()}
        onAddPrompt={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("What draws you?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("What holds you back?")).toBeInTheDocument();
  });

  it("calls onAddPrompt when the add button is clicked", async () => {
    const user = userEvent.setup();
    const onAddPrompt = vi.fn();
    render(
      <SpreadPromptsEditor prompts={[]} onUpdatePrompt={vi.fn()} onRemovePrompt={vi.fn()} onAddPrompt={onAddPrompt} />,
    );

    await user.click(screen.getByRole("button", { name: "Add prompt" }));
    expect(onAddPrompt).toHaveBeenCalled();
  });

  it("disables the add button once there are 10 prompts", () => {
    render(
      <SpreadPromptsEditor
        prompts={Array.from({ length: 10 }, (_, i) => `Prompt ${i}`)}
        onUpdatePrompt={vi.fn()}
        onRemovePrompt={vi.fn()}
        onAddPrompt={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add prompt" })).toBeDisabled();
  });

  it("calls onUpdatePrompt with the index and new value when a prompt is edited", async () => {
    const user = userEvent.setup();
    const onUpdatePrompt = vi.fn();
    render(
      <SpreadPromptsEditor
        prompts={["What draws you?"]}
        onUpdatePrompt={onUpdatePrompt}
        onRemovePrompt={vi.fn()}
        onAddPrompt={vi.fn()}
      />,
    );

    await user.type(screen.getByDisplayValue("What draws you?"), "!");
    expect(onUpdatePrompt).toHaveBeenCalledWith(0, "What draws you?!");
  });

  it("calls onRemovePrompt with the index when a prompt's remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemovePrompt = vi.fn();
    render(
      <SpreadPromptsEditor
        prompts={["What draws you?", "What holds you back?"]}
        onUpdatePrompt={vi.fn()}
        onRemovePrompt={onRemovePrompt}
        onAddPrompt={vi.fn()}
      />,
    );

    const [, secondRemoveButton] = screen.getAllByRole("button").slice(1);
    await user.click(secondRemoveButton);
    expect(onRemovePrompt).toHaveBeenCalledWith(1);
  });
});
