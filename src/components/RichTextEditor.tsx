import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { marked } from "marked";
import TurndownService from "turndown";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

function markdownToHtml(md: string): string {
  return marked.parse(md ?? "", { async: false }) as string;
}

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html ?? "").trim();
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link:", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
      <ToolbarButton
        label="Negrito"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Itálico"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="Título H2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Título H3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="Lista com marcadores"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Inserir link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Remover link"
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Unlink className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  // Track the last markdown we emitted so external `value` changes (e.g. loading
  // a different article) sync into the editor without clobbering local edits.
  const lastEmitted = useRef<string>(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", class: "text-primary underline" },
      }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[20rem] max-w-none px-4 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const md = htmlToMarkdown(editor.getHTML());
      lastEmitted.current = md;
      onChange(md);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(markdownToHtml(value));
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[24rem] rounded-md border border-border bg-background" />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
