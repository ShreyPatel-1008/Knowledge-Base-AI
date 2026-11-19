import { useEffect, useRef } from "react";
import { LogoIcon, FileTextIcon } from "./Icons.jsx";

export default function MessageList({
  hasReadyDocuments,
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
        <h2 className="text-3xl font-display font-bold text-refined">{hasReadyDocuments ? "Ask your documents" : "Build your document library"}</h2>
        <p className="text-xs text-mineral max-w-sm mt-1.5 leading-relaxed">
          {hasReadyDocuments ? "Choose a source below or ask across your library." : "Upload a file or add a link in the document library to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 space-y-6 [&>*]:max-w-4xl [&>*]:mx-auto">
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
          <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 shrink-0 rounded-xl bg-ivory border border-border flex items-center justify-center text-refined shadow-2xs">
        <LogoIcon className="w-4 h-4 text-refined" />
      </div>
      <div className="min-w-0 max-w-full md:max-w-[80%] [overflow-wrap:anywhere] space-y-3">
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
              Retrieved passages ({sources.length})
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
                  <span className="text-mineral">chunk #{src.chunkIndex}</span>

                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function inlineText(text) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(text) {
  const blocks = [];
  let bullets = [];
  let code = null;

  function flushBullets() {
    if (!bullets.length) return;
    blocks.push(<ul key={blocks.length} className="my-2 list-disc space-y-1 pl-5">{bullets}</ul>);
    bullets = [];
  }

  function flushCode() {
    blocks.push(<pre key={blocks.length} className="my-2 overflow-x-auto rounded bg-ivory p-3"><code>{code.join("\n")}</code></pre>);
    code = null;
  }

  for (const raw of (text || "").split(/\r?\n/)) {
    if (/^\s*```/.test(raw)) {
      flushBullets();
      if (code === null) code = [];
      else flushCode();
      continue;
    }
    if (code !== null) {
      code.push(raw);
      continue;
    }
    if (raw.trim() === "\\") continue;
    // Some stored replies contain an escaped heading and several bullets on one line.
    const normalized = raw.replace(/^\s*\\(#{1,6}\s)/, "$1")
      .replace(/\\\*([ \t]+)(?=\*\*)/g, "\n* ")
      .replace(/^\s*\\\*([ \t]+)/, "* ")
      .replace(/&#x20;\s*$/i, "");
    for (const line of normalized.split("\n")) {
      const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
      if (bullet) {
        bullets.push(<li key={bullets.length}>{inlineText(bullet[1])}</li>);
        continue;
      }
      flushBullets();
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const Heading = "h" + heading[1].length;
        blocks.push(<Heading key={blocks.length} className="mb-1 mt-3 font-semibold first:mt-0">{inlineText(heading[2])}</Heading>);
      } else if (line.trim()) {
        blocks.push(<p key={blocks.length} className="mb-1">{inlineText(line)}</p>);
      }
    }
  }
  flushBullets();
  if (code !== null) flushCode();
  return blocks;
}
