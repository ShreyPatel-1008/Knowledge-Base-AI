import { useEffect, useRef } from "react";
import { LogoIcon, FileTextIcon } from "./Icons.jsx";

export default function MessageList({
  messages,
  streamingMessage,
  isAsking,
  onSelectSource,
}) {
  const bottomRef = useRef(null);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage, isAsking]);

  const hasNoMessages = messages.length === 0 && !streamingMessage;

  if (hasNoMessages) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        <div className="w-16 h-16 rounded-3xl bg-ivory border border-border flex items-center justify-center mb-4 shadow-sm text-refined">
          <LogoIcon className="w-8 h-8 text-refined" />
        </div>
        <h2 className="text-base font-display font-bold text-refined">Ask your Knowledge Base</h2>
        <p className="text-xs text-mineral max-w-sm mt-1.5 leading-relaxed">
          Upload PDF, Word (DOCX), Text, or Markdown files from the sidebar. Ask questions and get answers with exact source citations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
      {/* Historical & Completed messages */}
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg._id || idx}
          message={msg}
          onSelectSource={onSelectSource}
        />
      ))}

      {/* Streaming assistant message in progress */}
      {streamingMessage && (
        <MessageBubble
          message={{
            role: "assistant",
            content: streamingMessage.content,
            sources: streamingMessage.sources,
          }}
          isStreaming={true}
          onSelectSource={onSelectSource}
        />
      )}

      {/* Thinking state before tokens arrive */}
      {isAsking && !streamingMessage && (
        <div className="flex gap-3 animate-fade-in-up">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-ivory border border-border flex items-center justify-center text-refined shadow-2xs">
            <LogoIcon className="w-4 h-4 text-refined" />
          </div>
          <div className="bg-ivory border border-border rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-refined animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-refined animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-refined animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-xs text-mineral ml-2">Searching knowledge base…</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

/* ── Individual Message Bubble ────────────────────── */
function MessageBubble({ message, isStreaming, onSelectSource }) {
  const { role, content, sources } = message;

  if (role === "user") {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[85%] md:max-w-[70%] bg-refined text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 shrink-0 rounded-xl bg-ivory border border-border flex items-center justify-center text-refined shadow-2xs">
        <LogoIcon className="w-4 h-4 text-refined" />
      </div>
      <div className="max-w-[90%] md:max-w-[80%] space-y-3">
        {/* Message body */}
        <div className="bg-canvas border border-border rounded-2xl rounded-tl-xs px-5 py-4 text-sm text-refined leading-relaxed shadow-2xs">
          <div className="whitespace-pre-wrap font-sans">
            {renderMarkdown(content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-refined animate-pulse align-middle" />
            )}
          </div>
        </div>

        {/* Clickable Source Citation Chips */}
        {sources && sources.length > 0 && (
          <div className="space-y-1.5 pl-1">
            <span className="text-[10px] font-semibold text-mineral tracking-wider uppercase">
              Citations ({sources.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {sources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => onSelectSource(src)}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ivory hover:bg-mallow/50 border border-border hover:border-mineral-light text-[11px] text-refined transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                >
                  <FileTextIcon className="w-3.5 h-3.5 text-refined" />
                  <span className="font-medium max-w-[130px] truncate">{src.filename}</span>
                  <span className="text-mineral">p.{src.page || 1}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-mallow text-refined font-bold border border-border">
                    {Math.round((src.score || 0) * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Lightweight formatting for bold, lists, and code in markdown
 */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    // Bold parsing
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const parsedLine = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-refined">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    return (
      <span key={idx} className="block min-h-[1.25rem]">
        {parsedLine}
      </span>
    );
  });
}
