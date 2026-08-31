import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPage from "./page";
import { chatFetcher } from "@/services/chat";

vi.mock("@/services/chat", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/chat")>(
      "@/services/chat",
    );
  return {
    ...actual,
    chatFetcher: vi.fn(),
  };
});

const mockedChatFetcher = vi.mocked(chatFetcher);

describe("ChatPage", () => {
  beforeEach(() => {
    mockedChatFetcher.mockReset();
  });

  it("renders the header and suggestion prompts when there are no messages", () => {
    render(<ChatPage />);

    expect(screen.getByText("CV Screener")).toBeInTheDocument();
    expect(
      screen.getByText("Who has the most backend experience?"),
    ).toBeInTheDocument();
  });

  it("sends a typed question and renders an empty-matches reply with its sources", async () => {
    const user = userEvent.setup();
    mockedChatFetcher.mockResolvedValueOnce({
      answer: JSON.stringify({ matches: [] }),
      matches: [],
      sources: [{ cvId: "1", name: "Jane Doe", file: "jane.pdf" }],
    });

    render(<ChatPage />);

    await user.type(
      screen.getByPlaceholderText("Ask about a candidate…"),
      "Who knows TypeScript?",
    );
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(screen.getByText("Who knows TypeScript?")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No matching candidates found.")).toBeInTheDocument();
    });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(mockedChatFetcher).toHaveBeenCalledWith(
      expect.any(String),
      { arg: { message: "Who knows TypeScript?", history: [] } },
    );
  });

  it("renders matched candidates returned by the assistant", async () => {
    const user = userEvent.setup();
    mockedChatFetcher.mockResolvedValueOnce({
      answer: JSON.stringify({
        matches: [
          { name: "Ada Lovelace", email: "ada@example.com", reason: "Strong backend experience" },
        ],
      }),
      matches: [
        { name: "Ada Lovelace", email: "ada@example.com", reason: "Strong backend experience" },
      ],
      sources: [],
    });

    render(<ChatPage />);
    await user.click(
      screen.getByText("Who has the most backend experience?"),
    );

    const match = await screen.findByText("Ada Lovelace");
    expect(match).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Strong backend experience")).toBeInTheDocument();
  });

  it("shows an error bubble when the request fails", async () => {
    const user = userEvent.setup();
    mockedChatFetcher.mockRejectedValueOnce(new Error("Request failed (500)"));

    render(<ChatPage />);
    await user.type(
      screen.getByPlaceholderText("Ask about a candidate…"),
      "Trigger a failure",
    );
    await user.click(screen.getByRole("button", { name: "Send question" }));

    const error = await screen.findByText("Request failed (500)");
    expect(error).toBeInTheDocument();
  });

  it("does not send empty or whitespace-only messages", async () => {
    const user = userEvent.setup();
    render(<ChatPage />);

    const sendButton = screen.getByRole("button", { name: "Send question" });
    expect(sendButton).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText("Ask about a candidate…"),
      "   ",
    );
    expect(sendButton).toBeDisabled();
    expect(mockedChatFetcher).not.toHaveBeenCalled();
  });

  it("includes prior turns as history on subsequent messages", async () => {
    const user = userEvent.setup();
    mockedChatFetcher
      .mockResolvedValueOnce({
        answer: JSON.stringify({ matches: [] }),
        matches: [],
        sources: [],
      })
      .mockResolvedValueOnce({
        answer: JSON.stringify({ matches: [] }),
        matches: [],
        sources: [],
      });

    render(<ChatPage />);
    const input = screen.getByPlaceholderText("Ask about a candidate…");
    const sendButton = screen.getByRole("button", { name: "Send question" });

    await user.type(input, "First question");
    await user.click(sendButton);
    await waitFor(() => expect(mockedChatFetcher).toHaveBeenCalledTimes(1));

    await user.type(input, "Second question");
    await user.click(sendButton);
    await waitFor(() => expect(mockedChatFetcher).toHaveBeenCalledTimes(2));

    expect(mockedChatFetcher).toHaveBeenLastCalledWith(
      expect.any(String),
      {
        arg: {
          message: "Second question",
          history: [
            { role: "user", content: "First question" },
            { role: "assistant", content: JSON.stringify({ matches: [] }) },
          ],
        },
      },
    );
  });

  it("gives each rendered message a unique id (no duplicate-key warnings)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    mockedChatFetcher.mockResolvedValue({
      answer: JSON.stringify({ matches: [] }),
      matches: [],
      sources: [],
    });

    render(<ChatPage />);
    const input = screen.getByPlaceholderText("Ask about a candidate…");
    const sendButton = screen.getByRole("button", { name: "Send question" });

    for (const question of ["one", "two", "three"]) {
      await user.type(input, question);
      await user.click(sendButton);
      await waitFor(() =>
        expect(screen.getAllByText(question).length).toBeGreaterThan(0),
      );
    }

    const duplicateKeyWarning = consoleError.mock.calls.some((call) =>
      String(call[0]).includes("same key"),
    );
    expect(duplicateKeyWarning).toBe(false);

    consoleError.mockRestore();
  });
});
