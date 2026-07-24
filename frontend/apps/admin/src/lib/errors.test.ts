import { ApiError } from "@pyxie/api-client";
import { describe, expect, it } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns the detail from an ApiError with an object body containing a string detail", () => {
    const err = new ApiError(400, { detail: "invalid input" });

    expect(errorMessage(err, "fallback")).toBe("invalid input");
  });

  it("returns the fallback for a non-ApiError", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });

  it("returns the fallback for an ApiError with no body", () => {
    const err = new ApiError(500, null);

    expect(errorMessage(err, "fallback")).toBe("fallback");
  });

  it("returns the fallback when detail isn't a string", () => {
    const err = new ApiError(400, { detail: { nested: true } });

    expect(errorMessage(err, "fallback")).toBe("fallback");
  });
});
