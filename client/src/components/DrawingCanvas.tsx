import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { getSocket } from '../hooks/useSocket';
import type { Stroke } from '../types';

interface Props {
  isDrawer: boolean;
}

export interface CanvasHandle {
  replayStrokes: (strokes: Stroke[]) => void;
  drawStroke: (stroke: Stroke) => void;
  clearCanvas: () => void;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
  '#854d0e', '#166534', '#1e3a8a', '#7c3aed', '#be185d',
];

const DrawingCanvas = forwardRef<CanvasHandle, Props>(({ isDrawer }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<[number, number][]>([]);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);

  function getCtx() {
    const c = canvasRef.current;
    return c ? c.getContext('2d') : null;
  }

  function applyStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  useImperativeHandle(ref, () => ({
    replayStrokes(strokes: Stroke[]) {
      const ctx = getCtx();
      if (!ctx || !canvasRef.current) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      strokes.forEach(s => applyStroke(ctx, s));
    },
    drawStroke(stroke: Stroke) {
      const ctx = getCtx();
      if (ctx) applyStroke(ctx, stroke);
    },
    clearCanvas() {
      const ctx = getCtx();
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
  }));

  function getPos(e: React.MouseEvent | React.TouchEvent): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return [
        (touch.clientX - rect.left) * scaleX,
        (touch.clientY - rect.top) * scaleY,
      ];
    }
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    ];
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawer) return;
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    currentStroke.current = [pos];
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawer || !isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current.push(pos);

    const ctx = getCtx();
    if (!ctx) return;

    const pts = currentStroke.current;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Throttle emit every 30ms
    if (!throttleTimer.current) {
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
      }, 30);
      getSocket().emit('draw:stroke', {
        stroke: { tool, color, size, points: [...currentStroke.current] },
      });
    }
  }

  function endDraw() {
    if (!isDrawer || !isDrawing.current) return;
    isDrawing.current = false;
    if (currentStroke.current.length > 0) {
      getSocket().emit('draw:stroke', {
        stroke: { tool, color, size, points: [...currentStroke.current] },
      });
    }
    currentStroke.current = [];
  }

  function handleClear() {
    const ctx = getCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    getSocket().emit('draw:clear');
  }

  return (
    <div style={styles.wrapper}>
      <canvas
        ref={canvasRef}
        width={700}
        height={500}
        style={{
          ...styles.canvas,
          cursor: isDrawer ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      {isDrawer && (
        <div style={styles.toolbar}>
          <div style={styles.toolGroup}>
            <button
              style={{ ...styles.toolBtn, ...(tool === 'pen' ? styles.activeTool : {}) }}
              onClick={() => setTool('pen')} title="畫筆"
            >✏️</button>
            <button
              style={{ ...styles.toolBtn, ...(tool === 'eraser' ? styles.activeTool : {}) }}
              onClick={() => setTool('eraser')} title="橡皮擦"
            >🧹</button>
          </div>

          <div style={styles.colorGrid}>
            {COLORS.map(c => (
              <div
                key={c}
                style={{
                  ...styles.colorDot,
                  background: c,
                  border: color === c ? '3px solid #667eea' : '2px solid #ccc',
                }}
                onClick={() => { setColor(c); setTool('pen'); }}
              />
            ))}
          </div>

          <div style={styles.toolGroup}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>粗細</span>
            <input
              type="range" min={1} max={30} value={size}
              onChange={e => setSize(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: '0.8rem', width: 20 }}>{size}</span>
          </div>

          <button style={styles.clearBtn} onClick={handleClear}>清除畫布</button>
        </div>
      )}
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  canvas: {
    border: '2px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    maxWidth: '100%',
    touchAction: 'none',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  toolBtn: {
    width: 36,
    height: 36,
    border: '2px solid #ddd',
    borderRadius: 6,
    background: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTool: {
    border: '2px solid #667eea',
    background: '#ede9fe',
  },
  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 120,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  clearBtn: {
    padding: '0.4rem 0.8rem',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};
