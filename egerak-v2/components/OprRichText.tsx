type TextBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

/** Gemini / paste kadang guna asterisk bukan ASCII U+002A. */
function normalizeOprMarkdown(text: string): string {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D]/g, "")
    .replace(/[\uFF0A\u2217\u2731\u2055]/g, "*")
    .replace(/\\\*/g, "*");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tukar **bold** / __bold__ kepada <strong> (HTML selamat). */
export function oprMarkdownToHtml(text: string): string {
  const normalized = normalizeOprMarkdown(text);
  const re = /\*\*([^*]+?)\*\*|__([^_]+?)__/g;
  const chunks: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(normalized)) !== null) {
    if (m.index > last) {
      chunks.push(escapeHtml(normalized.slice(last, m.index)));
    }
    const inner = (m[1] ?? m[2] ?? "").trim();
    chunks.push(`<strong>${escapeHtml(inner)}</strong>`);
    last = re.lastIndex;
  }

  if (last < normalized.length) {
    chunks.push(escapeHtml(normalized.slice(last)));
  }

  return chunks.join("");
}

function splitIntoBlocks(raw: string | null | undefined): TextBlock[] {
  const lines = normalizeOprMarkdown(raw ?? "").replace(/\r\n/g, "\n").split("\n");
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
    const numberedRe = /^\s*\d+[.)]\s+/;
    const isAllBullets = cur.every((l) => !l.trim() || bulletRe.test(l));
    const isAllNumbered = cur.every((l) => !l.trim() || numberedRe.test(l));

    if (isAllBullets) {
      const items = cur
        .map((l) => l.replace(bulletRe, "").trim())
        .filter(Boolean);
      if (items.length) blocks.push({ kind: "ul", items });
    } else if (isAllNumbered) {
      const items = cur
        .map((l) => l.replace(numberedRe, "").trim())
        .filter(Boolean);
      if (items.length) blocks.push({ kind: "ol", items });
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

type Props = {
  value: string | null | undefined;
  className?: string;
};

/** OPR body: paragraphs, lists, inline Markdown bold → HTML. */
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
                <li
                  key={`li-${idx}-${i}`}
                  dangerouslySetInnerHTML={{ __html: oprMarkdownToHtml(it) }}
                />
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={`ol-${idx}`} className="list-decimal">
              {b.items.map((it, i) => (
                <li
                  key={`oli-${idx}-${i}`}
                  dangerouslySetInnerHTML={{ __html: oprMarkdownToHtml(it) }}
                />
              ))}
            </ol>
          );
        }
        return (
          <p
            key={`p-${idx}`}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: oprMarkdownToHtml(b.text) }}
          />
        );
      })}
    </div>
  );
}
