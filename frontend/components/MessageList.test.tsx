import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageList from "./MessageList";
import type { Message } from "@/app/page";

describe("MessageList", () => {
  it("shows suggestion prompts when there are no messages and nothing is loading", () => {
    render(
      <MessageList messages={[]} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(
      screen.getByText("Ask anything about the CVs in your database."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Who has the most backend experience?"),
    ).toBeInTheDocument();
  });

  it("calls onSuggestion with the prompt text when a suggestion is clicked", async () => {
    const user = userEvent.setup();
    const onSuggestion = vi.fn();
    render(
      <MessageList
        messages={[]}
        isLoading={false}
        onSuggestion={onSuggestion}
      />,
    );

    await user.click(
      screen.getByText("Which candidates know TypeScript?"),
    );

    expect(onSuggestion).toHaveBeenCalledWith(
      "Which candidates know TypeScript?",
    );
  });

  it("hides suggestion prompts while loading, even with no messages yet", () => {
    render(
      <MessageList messages={[]} isLoading={true} onSuggestion={vi.fn()} />,
    );

    expect(
      screen.queryByText("Ask anything about the CVs in your database."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Thinking")).toBeInTheDocument();
  });

  it("renders plain content for a message with no matches field", () => {
    const messages: Message[] = [
      { id: "m0", role: "user", content: "Who knows Python?" },
    ];
    render(
      <MessageList messages={messages} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(screen.getByText("Who knows Python?")).toBeInTheDocument();
  });

  it("renders an error message with its content", () => {
    const messages: Message[] = [
      {
        id: "m0",
        role: "assistant",
        content: "Something went wrong.",
        isError: true,
      },
    ];
    render(
      <MessageList messages={messages} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("renders 'No matching candidates found.' when matches is an empty array", () => {
    const messages: Message[] = [
      { id: "m0", role: "assistant", content: "{}", matches: [] },
    ];
    render(
      <MessageList messages={messages} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(
      screen.getByText("No matching candidates found."),
    ).toBeInTheDocument();
  });

  it("renders each match's name, email and reason", () => {
    const messages: Message[] = [
      {
        id: "m0",
        role: "assistant",
        content: "{}",
        matches: [
          { name: "Ada Lovelace", email: "ada@example.com", reason: "Strong backend experience" },
          { name: "Grace Hopper", email: "grace@example.com", reason: "Compiler expertise" },
        ],
      },
    ];
    render(
      <MessageList messages={messages} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Strong backend experience")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("renders a sources footer only when sources are present", () => {
    const messages: Message[] = [
      {
        id: "m0",
        role: "assistant",
        content: "Answer without sources",
        sources: [],
      },
      {
        id: "m1",
        role: "assistant",
        content: "Answer with a source",
        sources: [{ cvId: "1", name: "Jane Doe", file: "jane.pdf" }],
      },
    ];
    render(
      <MessageList messages={messages} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(screen.queryByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("falls back to the file name when a source has no candidate name", () => {
    const messages: Message[] = [
      {
        id: "m0",
        role: "assistant",
        content: "Answer",
        sources: [{ cvId: "1", name: null, file: "unnamed.pdf" }],
      },
    ];
    render(
      <MessageList messages={messages} isLoading={false} onSuggestion={vi.fn()} />,
    );

    expect(screen.getByText("unnamed.pdf")).toBeInTheDocument();
  });

  it("shows the thinking indicator while isLoading is true", () => {
    const messages: Message[] = [
      { id: "m0", role: "user", content: "Who knows Rust?" },
    ];
    render(
      <MessageList messages={messages} isLoading={true} onSuggestion={vi.fn()} />,
    );

    expect(screen.getByLabelText("Thinking")).toBeInTheDocument();
  });
});
