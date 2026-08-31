import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Composer from "./Composer";

describe("Composer", () => {
  it("disables the send button until there is non-whitespace input", async () => {
    const user = userEvent.setup();
    render(<Composer onSend={vi.fn()} disabled={false} />);

    const button = screen.getByRole("button", { name: "Send question" });
    expect(button).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText("Ask about a candidate…"),
      "   ",
    );
    expect(button).toBeDisabled();
  });

  it("calls onSend with the input value on button click and clears the field", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText("Ask about a candidate…");
    await user.type(input, "Who knows Rust?");
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(onSend).toHaveBeenCalledWith("Who knows Rust?");
    expect(input).toHaveValue("");
  });

  it("submits on Enter without inserting a newline", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText("Ask about a candidate…");
    await user.type(input, "Who knows Go?{Enter}");

    expect(onSend).toHaveBeenCalledWith("Who knows Go?");
    expect(input).toHaveValue("");
  });

  it("does not call onSend when disabled", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} disabled={true} />);

    const input = screen.getByPlaceholderText("Ask about a candidate…");
    await user.type(input, "Who knows Kotlin?");
    const button = screen.getByRole("button", { name: "Send question" });

    expect(button).toBeDisabled();
    await user.type(input, "{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend for whitespace-only input submitted via Enter", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Composer onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText("Ask about a candidate…");
    await user.type(input, "   {Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });
});
