"use client";

import { useCallback, useState } from "react";
import useSWRMutation from "swr/mutation";
import Composer from "@/components/Composer";
import MessageList from "@/components/MessageList";
import {
  CHAT_ENDPOINT,
  chatFetcher,
  type ChatTurn,
  type Match,
  type Source,
} from "@/services/chat";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  matches?: Match[];
  sources?: Source[];
  isError?: boolean;
}

let nextId = 0;
const createId = () => `m${nextId++}`;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  const { trigger, isMutating } = useSWRMutation(CHAT_ENDPOINT, chatFetcher);

  const handleSend = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || isMutating) return;

      const history: ChatTurn[] = messages
        .filter((message) => !message.isError)
        .map((message) => ({ role: message.role, content: message.content }));

      setMessages((prev) => [
        ...prev,
        { id: createId(), role: "user", content: question },
      ]);

      try {
        const result = await trigger({ message: question, history });

        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: result?.answer ?? "",
            matches: result?.matches ?? [],
            sources: result?.sources ?? [],
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content:
              error instanceof Error ? error.message : "Something went wrong.",
            isError: true,
          },
        ]);
      }
    },
    [messages, trigger, isMutating],
  );

  return (
    <div className="relative mx-auto h-screen max-w-[860px] p-7">
      <div className="flex h-full flex-col overflow-hidden border-slate-900/10 bg-white/70 backdrop-blur-2xl rounded-[28px] border dark:border-white/10 dark:bg-slate-900/60">
        <header className="flex items-center gap-3.5 border-b border-slate-900/10 px-6 py-5 dark:border-white/10">
          <div>
            <h1 className="font-semibold">CV Screener</h1>
            <p className="mt-1 text-s text-slate-500">
              Ask questions about the candidates in your database
            </p>
          </div>
        </header>

        <MessageList
          messages={messages}
          isLoading={isMutating}
          onSuggestion={handleSend}
        />

        <Composer onSend={handleSend} disabled={isMutating} />
      </div>
    </div>
  );
}
