import { Fragment, type ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      return (
        <img
          key={i}
          src={image[2]}
          alt={image[1]}
          loading="lazy"
          className="my-4 w-full rounded-xl border border-border object-cover"
        />
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushList = (key: number) => {
    if (list.length === 0) return;
    const items = list.map((item, idx) => <li key={idx}>{renderInline(item)}</li>);
    blocks.push(
      ordered ? (
        <ol key={`ol-${key}`} className="my-4 list-decimal space-y-2 pl-6 text-muted-foreground">
          {items}
        </ol>
      ) : (
        <ul key={`ul-${key}`} className="my-4 list-disc space-y-2 pl-6 text-muted-foreground">
          {items}
        </ul>
      ),
    );
    list = [];
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList(i);
      return;
    }
    const imageOnly = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageOnly) {
      flushList(i);
      blocks.push(
        <img
          key={i}
          src={imageOnly[2]}
          alt={imageOnly[1]}
          loading="lazy"
          className="my-5 w-full rounded-xl border border-border object-cover"
        />,
      );
      return;
    }
    if (line.startsWith("### ")) {
      flushList(i);
      blocks.push(
        <h3 key={i} className="mt-6 mb-2 text-xl font-semibold text-foreground">
          {renderInline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushList(i);
      blocks.push(
        <h2 key={i} className="mt-8 mb-3 text-2xl font-bold text-foreground">
          {renderInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushList(i);
      blocks.push(
        <h1 key={i} className="mt-8 mb-4 text-3xl font-bold text-foreground">
          {renderInline(line.slice(2))}
        </h1>,
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (ordered) flushList(i);
      ordered = false;
      list.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (!ordered) flushList(i);
      ordered = true;
      list.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else {
      flushList(i);
      blocks.push(
        <p key={i} className="my-3 leading-relaxed text-muted-foreground">
          {renderInline(line)}
        </p>,
      );
    }
  });
  flushList(lines.length);

  return <div>{blocks}</div>;
}
