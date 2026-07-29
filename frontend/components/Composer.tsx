"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function Composer({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (disabled || !value.trim()) return;
    onSend(value);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-slate-900/10 px-6 pt-3.5 pb-5">
      <form
        className="flex items-end gap-2.5 rounded-[18px] border border-slate-900/10 bg-white/70 p-2 pl-2 dark:bg-white/5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          className="max-h-40 flex-1 resize-none px-2 py-2.5 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          value={value}
          rows={1}
          placeholder="Ask about a candidate…"
          onChange={(event) => {
            setValue(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          className="grid size-[38px] shrink-0 place-items-center rounded-[12px] border border-slate-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-20"
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send question"
        >
          <ArrowRight className="size-[19px]" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
