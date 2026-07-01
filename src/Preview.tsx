import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

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

// Component with static property for prose classes (injected by extension)
export const Preview = ({ tab, className = "" }: { tab: any; className?: string }) => {
  // Use alert to make absolutely sure this runs
  if (typeof window !== 'undefined') {
    (window as any).__mdPreviewRendered = true;
  }

  // Log to a global array that we can inspect
  if (!(window as any).__mdPreviewLogs) {
    (window as any).__mdPreviewLogs = [];
  }
  (window as any).__mdPreviewLogs.push({
    time: new Date().toISOString(),
    proseClasses: Preview.proseClasses,
    length: Preview.proseClasses?.length
  });

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
        <div className={`p-2 w-full ${Preview.proseClasses || ""}`} style={{ backgroundColor: 'var(--editor-bg)' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeLineNumbers]}
            key={tab.tabId}
            components={{
              // Override the default anchor tag rendering
              a: ({ href, children }) => <CustomLink href={href}>{children}</CustomLink>,
              pre: ({ children, ...props }) => <Pre {...props}>{children}</Pre>,
              code: ({ className, children, ...props }: any) => (
                <Code className={className} {...props}>{children}</Code>
              ),
              p: ({ children, ...props }) => <Paragraph {...props}>{children}</Paragraph>,
              blockquote: ({ children, ...props }) => <Blockquote {...props}>{children}</Blockquote>,
            }}
          >
            {tab.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Static property that will be set by the extension onload
Preview.proseClasses = "";
