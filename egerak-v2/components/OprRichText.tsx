import { Fragment, type ReactNode } from "react";

type TextBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function splitIntoBlocks(raw: string | null | undefined): TextBlock[] {
  const lines = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [];

  let cur: string[] = [];
  const flush = () => {
    if (cur.length === 0) return;
    const nonEmpty = cur.join("\n").trimEnd();
    if (!nonEmpty.trim()) {
      cur = [];
      return;
    }

    const bulletRe = /^\s*(?:-|\u2022)\s+/;
    const isAllBullets = cur.every((l) => !l.trim() || bulletRe.test(l));
    if (isAllBullets) {
      const items = cur
        .map((l) => l.replace(bulletRe, "").trim())
        .filter(Boolean);
      if (items.length) blocks.push({ kind: "ul", items });
    } else {
      blocks.push({ kind: "p", text: nonEmpty });
    }
    cur = [];
  };

  for (const l of lines) {
    if (l.trim() === "") {
      flush();
      continue;
    }
    cur.push(l);
  }
  flush();
  return blocks;
}

/** **bold** / __bold__ inline (Markdown subset for OPR). */
export function renderOprInlineMarkdown(text: string): ReactNode[] {
  const re = /\*\*(.+?)\*\*|__(.+?)__/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<Fragment key={`t-${key++}`}>{text.slice(last, m.index)}</Fragment>);
    }
    const inner = m[1] ?? m[2] ?? "";
    parts.push(<strong key={`b-${key++}`}>{inner}</strong>);
    last = re.lastIndex;
  }

  if (last < text.length) {
    parts.push(<Fragment key={`t-${key++}`}>{text.slice(last)}</Fragment>);
  }

  return parts.length > 0 ? parts : [text];
}

type Props = {
  value: string | null | undefined;
  className?: string;
};

/** OPR body: paragraphs, bullet lists, and inline Markdown bold. */
export default function OprRichText({ value, className = "opr-print-rich" }: Props) {
  const blocks = splitIntoBlocks(value);
  if (blocks.length === 0) return <span>—</span>;

  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        if (b.kind === "ul") {
          return (
            <ul key={`ul-${idx}`}>
              {b.items.map((it, i) => (
                <li key={`li-${idx}-${i}`}>{renderOprInlineMarkdown(it)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${idx}`} className="whitespace-pre-wrap">
            {renderOprInlineMarkdown(b.text)}
          </p>
        );
      })}
    </div>
  );
}
