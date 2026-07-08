import { Fragment, type ReactNode } from "react";

/** Parse the attributes of a raw <img ...> tag into a props object. */
function parseImgTag(
  tag: string,
): { src: string; alt: string; width?: number; height?: number } | null {
  const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1];
  if (!src) return null;
  const alt = tag.match(/\balt\s*=\s*"([^"]*)"/i)?.[1] ?? "";
  const width = tag.match(/\bwidth\s*=\s*"?(\d+)"?/i)?.[1];
  const height = tag.match(/\bheight\s*=\s*"?(\d+)"?/i)?.[1];
  return {
    src: src.replace(/&amp;/g, "&"),
    alt: alt.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
    width: width ? Number(width) : undefined,
    height: height ? Number(height) : undefined,
  };
}

function ContentImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    />
  );
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      return (
        <ContentImage
          key={i}
          src={image[2]}
          alt={image[1]}
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
    // Raw <img ...> tag emitted by the auto-image generator.
    const htmlImg = line.trim().match(/^<img\b[^>]*?\/?>$/i);
    if (htmlImg) {
      const props = parseImgTag(line.trim());
      if (props) {
        flushList(i);
        blocks.push(
          <ContentImage
            key={i}
            src={props.src}
            alt={props.alt}
            width={props.width}
            height={props.height}
            className="my-5 w-full rounded-xl border border-border object-cover"
          />,
        );
        return;
      }
    }
    const imageOnly = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageOnly) {
      flushList(i);
      blocks.push(
        <ContentImage
          key={i}
          src={imageOnly[2]}
          alt={imageOnly[1]}
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
