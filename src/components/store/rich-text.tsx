/**
 * Renders owner-edited plain text safely: blank lines separate paragraphs, a short
 * line on its own becomes a heading. No HTML is interpreted (XSS-safe by design).
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className ?? "prose-floral text-[16px]"}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.length === 1 && block.length < 60 && !/[.!?:]$/.test(block)) {
          return (
            <h2 key={i} className="!mt-8 font-display text-2xl text-ink first:!mt-0">
              {block}
            </h2>
          );
        }
        if (lines.length > 1 && lines[0].length < 60 && !/[.!?]$/.test(lines[0])) {
          return (
            <div key={i} className="!mt-8 first:!mt-0">
              <h2 className="font-display text-2xl text-ink">{lines[0]}</h2>
              <p className="mt-2">{lines.slice(1).join(" ")}</p>
            </div>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
