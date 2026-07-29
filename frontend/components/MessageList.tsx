"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/app/page";
import { Bot } from "lucide-react";

const SUGGESTIONS = [
  "Who has the most backend experience?",
  "Which candidates know TypeScript?",
  "Summarise the strongest candidate for a data engineer role.",
];

function AssistantMark() {
  return (
    <div className="mb-0.5 grid size-[40px] shrink-0 place-items-center rounded-[10px] border border-slate-900/10 p-1.5">
      <Bot />
    </div>
  );
}

interface Props {
  messages: Message[];
  isLoading: boolean;
  onSuggestion: (text: string) => void;
}

export default function MessageList({
  messages,
  isLoading,
  onSuggestion,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const scrollArea = "flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6";

  if (messages.length === 0 && !isLoading) {
    return (
      <main className={`${scrollArea} items-center justify-center`}>
        <div className="p-3 text-center">
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Ask anything about the CVs in your database.
          </p>
          <div className="flex flex-col items-center gap-2.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="cursor-pointer rounded-full border border-slate-900/10 bg-white/70 px-4 py-2.5 text-sm hover:border-gray-300 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                onClick={() => onSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={scrollArea}>
      {messages.map((message) => (
        <article
          key={message.id}
          className={[
            "flex max-w-[84%] items-end gap-2.5",
            message.role === "user"
              ? "flex-row-reverse self-end"
              : "self-start",
          ].join(" ")}
        >
          {message.role === "assistant" && <AssistantMark />}

          <div
            className={`rounded-[18px] px-4 py-3 whitespace-pre-wrap [overflow-wrap:anywhere] ${
              message.isError
                ? "rounded-bl-[5px] border border-red-300/70 bg-red-50/90 text-red-700 dark:border-red-400/30 dark:bg-red-950/50 dark:text-red-300"
                : message.role === "user"
                  ? "rounded-br-[5px] bg-slate-500 text-white dark:bg-slate-700"
                  : "rounded-bl-[5px] border border-slate-900/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
            }`}
          >
            {message.matches ? (
              message.matches.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {message.matches.map((match) => (
                    <li
                      key={match.email}
                      className="rounded-[12px] border border-slate-900/10 p-2.5 dark:border-white/10"
                    >
                      <p className="font-semibold">{match.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {match.email}
                      </p>
                      <p className="mt-1 text-sm">{match.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>No matching candidates found.</div>
              )
            ) : (
              <div>{message.content}</div>
            )}

            {message.sources && message.sources.length > 0 && (
              <footer className="mt-3 border-t border-dashed border-slate-900/10 pt-3 dark:border-white/10">
                <span className="mb-1.5 block text-[0.66rem] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Sources
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {message.sources.map((source) => (
                    <span
                      key={source.cvId}
                      className="rounded-full border border-slate-900/10 bg-white/60 px-2.5 py-0.5 text-[0.73rem] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                    >
                      {source.name || source.file}
                    </span>
                  ))}
                </div>
              </footer>
            )}
          </div>
        </article>
      ))}

      {isLoading && (
        <article className="flex max-w-[84%] items-end gap-2.5 self-start">
          <AssistantMark />
          <div className="rounded-[18px] rounded-bl-[5px] border border-slate-900/10 bg-white/70 px-4 py-3 whitespace-pre-wrap [overflow-wrap:anywhere] dark:border-white/10 dark:bg-white/5">
            <div
              className="flex gap-1.5 px-0.5 py-1"
              aria-label="Thinking"
            ></div>
          </div>
        </article>
      )}

      <div ref={bottomRef} />
    </main>
  );
}
