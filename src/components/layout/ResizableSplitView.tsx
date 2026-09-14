import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const MIN_LIST_WIDTH = 520;
const MIN_DETAIL_WIDTH = 320;
const DEFAULT_DETAIL_WIDTH = 420;

export default function ResizableSplitView({ children, detail }: { children: ReactNode; detail?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [detailWidth, setDetailWidth] = useState(DEFAULT_DETAIL_WIDTH);

  const constrain = useCallback((nextWidth: number) => {
    const width = containerRef.current?.getBoundingClientRect().width ?? 0;
    return Math.max(MIN_DETAIL_WIDTH, Math.min(nextWidth, Math.max(MIN_DETAIL_WIDTH, width - MIN_LIST_WIDTH)));
  }, []);

  const resize = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setDetailWidth(constrain(rect.right - clientX));
  }, [constrain]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const stopResizing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === event.pointerId) activePointerId.current = null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === event.pointerId) resize(event.clientX);
  };

  useEffect(() => {
    const onResize = () => setDetailWidth((width) => constrain(width));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [constrain]);

  if (!detail) return <div>{children}</div>;

  return (
    <div ref={containerRef} className="resizable-split-view" style={{ '--detail-width': `${detailWidth}px` } as React.CSSProperties}>
      <div className="resizable-split-main">{children}</div>
      <div className="resizable-split-handle" role="separator" aria-orientation="vertical" aria-label="Resize student detail panel" tabIndex={0} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopResizing} onPointerCancel={stopResizing} onLostPointerCapture={stopResizing} onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') setDetailWidth((width) => constrain(width + 24));
        if (event.key === 'ArrowRight') setDetailWidth((width) => constrain(width - 24));
      }} />
      <div className="resizable-split-detail">{detail}</div>
    </div>
  );
}
