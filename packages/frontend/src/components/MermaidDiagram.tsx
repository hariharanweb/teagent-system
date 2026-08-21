import { useEffect, useId, useState } from 'react';

// Lazy-loaded: mermaid pulls in ~150KB+ gzipped of per-diagram-type renderers (flowchart, gantt,
// sequence, etc.), and lesson plans only include a diagram occasionally (see the backend prompt).
// A static top-level import would put all of that in every page's critical bundle for a feature
// most chapters never use.
let mermaidModulePromise: Promise<typeof import('mermaid')> | undefined;
function loadMermaid() {
  mermaidModulePromise ??= import('mermaid').then((mod) => {
    mod.default.initialize({ startOnLoad: false, theme: 'default' });
    return mod;
  });
  return mermaidModulePromise;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);
    loadMermaid()
      .then((mod) => mod.default.render(diagramId, chart))
      .then((result) => {
        if (!cancelled) setSvg(result.svg);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  // Diagrams are LLM-generated, so occasionally invalid — fall back to the raw text rather than
  // showing a broken UI.
  if (failed) return <pre>{chart}</pre>;
  if (!svg) return <p style={{ color: 'var(--color-text-muted)' }}>Rendering diagram…</p>;
  // svg comes from mermaid's own renderer (SVG DOM output for our own generated diagram source), not user input
  return <div style={{ overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
