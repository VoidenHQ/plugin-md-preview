import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

// Matches CodeEditor.tsx's MEDIUM_FILE_THRESHOLD — the same "big enough to need
// special handling" line used elsewhere (streaming, disabled syntax highlighting).
// Unlike CodeMirror, react-markdown has no viewport virtualization: it commits the
// whole parsed tree as one synchronous DOM write, which freezes the entire window
// (Electron's renderer is single-threaded) on files past a few hundred KB.
const PREVIEW_SIZE_THRESHOLD = 512 * 1024;

// Stamps every rendered element with the source markdown line it came from
// (read off the remark/rehype position info that's preserved through the
// mdast -> hast transform). Lets the split view scroll-sync by matching
// actual content rather than raw scroll percentage, which drifts whenever
// rendered block heights don't match source line heights (headings, code
// blocks, images, etc).
function rehypeLineNumbers() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'element' && node.position?.start?.line) {
        node.properties = node.properties || {};
        node.properties['data-line'] = node.position.start.line;
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}

const Pre = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
  <pre
    {...props}
    style={{
      maxWidth: '100%',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflowX: 'hidden',
      ...(props.style || {}),
    }}
  >
    {children}
  </pre>
);

const Code = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) => {
  const isInline = !className;
  return (
    <code
      {...props}
      className={className}
      style={{
        display: isInline ? undefined : 'block',
        maxWidth: '100%',
        whiteSpace: isInline ? undefined : 'pre-wrap',
        wordBreak: 'break-word',
        ...(props.style || {}),
      }}
    >
      {children}
    </code>
  );
};

const Paragraph = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    {...props}
    style={{
      maxWidth: '100%',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      margin: '0.5rem 0',
      padding: '0.25rem 0',
      ...(props.style || {}),
    }}
  >
    {children}
  </p>
);

const Blockquote = ({ children, ...props }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    {...props}
    style={{
      borderLeft: '4px solid var(--blockquote-border, #555)',
      backgroundColor: 'var(--blockquote-bg, transparent)',
      color: 'var(--blockquote-fg, inherit)',
      padding: '10px 10px',
      marginLeft: '10px',
      marginRight: '10px',
      marginTop: '0.5rem',
      marginBottom: '0.5rem',
      borderRadius: '4px',
      ...(props.style || {}),
    }}
  >
    {children}
  </blockquote>
);

// Simple link handler for external links
const CustomLink = ({ href, children }: { href?: string; children: React.ReactNode }) => {
  const handleClick = () => {
    if (href) {
      // Access electron API if available
      (window as any).electron?.shell?.openExternal(href);
    }
  };

  return (
    <a
      onClick={handleClick}
      className="cursor-pointer text-accent hover:text-orange-400"
    >
      {children}
    </a>
  );
};

// Hoisted to module scope so these are stable references across renders —
// react-markdown memoizes its internal unified processor keyed on
// remarkPlugins/rehypePlugins/components identity, so passing fresh
// array/object literals every render (as inline props previously did) forced
// a full reparse on every render, not just when the markdown actually changed.
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeLineNumbers];
const MD_COMPONENTS = {
  // Override the default anchor tag rendering
  a: ({ href, children }: any) => <CustomLink href={href}>{children}</CustomLink>,
  pre: ({ children, ...props }: any) => <Pre {...props}>{children}</Pre>,
  code: ({ className, children, ...props }: any) => (
    <Code className={className} {...props}>{children}</Code>
  ),
  p: ({ children, ...props }: any) => <Paragraph {...props}>{children}</Paragraph>,
  blockquote: ({ children, ...props }: any) => <Blockquote {...props}>{children}</Blockquote>,
};

// Component with static property for prose classes (injected by extension)
const PreviewImpl = ({ tab, className = "" }: { tab: any; className?: string }) => {
  // Parsing a huge markdown doc (remark -> hast -> full React tree) is expensive.
  // Deferring it lets typing/scrolling stay responsive — React keeps showing the
  // previous render until it can catch up, instead of blocking on every keystroke.
  // (This only smooths out re-renders — it does nothing for the first mount of a
  // huge file, which is what the size gate below protects against.)
  const deferredContent = useDeferredValue(tab.content);

  const [forceRender, setForceRender] = useState(false);
  // Reset the opt-in override when switching to a different tab, so it doesn't
  // silently carry over and auto-render the next huge file too.
  useEffect(() => { setForceRender(false); }, [tab.tabId]);

  // Blob() allocation is itself O(content length) — memoize so it only reruns
  // when the (deferred) content actually changes, not on every ambient render.
  const sizeInBytes = useMemo(() => new Blob([deferredContent || ""]).size, [deferredContent]);
  const isTooLarge = sizeInBytes > PREVIEW_SIZE_THRESHOLD;

  if (isTooLarge && !forceRender) {
    return (
      <div
        className={`h-full w-full flex flex-col items-center justify-center gap-3 p-6 text-center text-comment text-sm ${className}`}
        style={{ backgroundColor: 'var(--editor-bg)' }}
      >
        <p>This file is large ({(sizeInBytes / 1024 / 1024).toFixed(1)} MB) — live preview is disabled by default to keep the app responsive.</p>
        <button
          type="button"
          onClick={() => setForceRender(true)}
          className="px-3 py-1.5 rounded-md border border-border hover:bg-panel text-text text-xs"
        >
          Show preview anyway
        </button>
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full flex flex-col ${className}`}
      style={{
        backgroundColor: 'var(--editor-bg)',
        overflow: 'hidden'
      }}
    >
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          overscrollBehavior: 'contain',
          backgroundColor: 'var(--editor-bg)'
        }}
      >
        <div
          className={`p-2 w-full ${Preview.proseClasses || ""}`}
          style={{
            backgroundColor: 'var(--editor-bg)',
            maxWidth: 'var(--prose-max-width, 860px)',
            marginLeft: 'var(--content-align-ml, auto)',
            marginRight: 'var(--content-align-mr, auto)',
            boxSizing: 'border-box',
          }}
        >
          <ReactMarkdown
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
            key={tab.tabId}
            components={MD_COMPONENTS}
          >
            {deferredContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Only re-render when the tab identity, its content, or the wrapper className
// actually change — blocks the re-render (and the O(content) work inside it)
// that would otherwise fire whenever any unrelated app state changes.
export const Preview = memo(PreviewImpl, (prev, next) =>
  prev.tab?.tabId === next.tab?.tabId &&
  prev.tab?.content === next.tab?.content &&
  prev.className === next.className,
) as typeof PreviewImpl & { proseClasses: string };

// Static property that will be set by the extension onload
Preview.proseClasses = "";
