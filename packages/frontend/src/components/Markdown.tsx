import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from './MermaidDiagram';

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { className, children } = props;
          const isMermaid = className === 'language-mermaid';
          if (isMermaid) {
            return <MermaidDiagram chart={String(children).trim()} />;
          }
          return <code className={className}>{children}</code>;
        },
        table({ children }) {
          return (
            <div style={{ overflowX: 'auto' }}>
              <table>{children}</table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
