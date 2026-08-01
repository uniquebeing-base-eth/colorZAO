import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  color: string;
  onProgress: (percent: number) => void;
  onStroke?: () => void;
  disabled?: boolean;
};

/**
 * Scratch-to-reveal canvas.
 *
 * Both the colored artwork and its grayscale copy are drawn onto stacked
 * canvases from the same decoded bitmap, so the colored version can never
 * flash before the grayscale layer exists. Dragging erases the grayscale
 * layer, uncovering the real colors underneath.
 */
export function PaintCanvas({ src, color, onProgress, onStroke, disabled }: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const progressRef = useRef(0);
  const moves = useRef(0);
  const ready = useRef(false);
  const [visible, setVisible] = useState(false);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready.current) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const step = 10;
    const { width, height } = canvas;
    if (!width || !height) return;
    const data = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    let total = 0;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        total++;
        if ((data[(y * width + x) * 4 + 3] ?? 255) < 40) cleared++;
      }
    }
    // Generous curve so a thorough paint-over reliably reaches 100%.
    const pct = total ? Math.min(100, Math.round((cleared / total) * 125)) : 0;
    if (pct !== progressRef.current) {
      progressRef.current = pct;
      onProgress(pct);
    }
  }, [onProgress]);

  useEffect(() => {
    const base = baseRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!base || !canvas || !wrap) return;
    const baseCtx = base.getContext("2d");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!baseCtx || !ctx) return;

    ready.current = false;
    progressRef.current = 0;
    setVisible(false);
    onProgress(0);

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const draw = () => {
      if (cancelled) return;
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      base.width = w;
      base.height = h;
      canvas.width = w;
      canvas.height = h;

      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      // Colored artwork stays hidden beneath the grayscale layer.
      baseCtx.clearRect(0, 0, w, h);
      baseCtx.drawImage(img, dx, dy, dw, dh);

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, dx, dy, dw, dh);
      // Manual desaturation (never relies on ctx.filter support).
      const frame = ctx.getImageData(0, 0, w, h);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
        const lifted = 32 + g * 0.78;
        d[i] = lifted;
        d[i + 1] = lifted;
        d[i + 2] = lifted;
      }
      ctx.putImageData(frame, 0, 0);
      ready.current = true;
      setVisible(true);
    };

    img.onload = () => {
      draw();
      // Re-draw once layout has settled (mobile address bar / font shifts).
      requestAnimationFrame(() => {
        if (cancelled || progressRef.current > 0) return;
        const rect = wrap.getBoundingClientRect();
        if (Math.abs(Math.round(rect.width) - canvas.width) > 2) draw();
      });
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, onProgress]);

  const paintAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const brush = Math.max(28, Math.round(canvas.width * 0.13));
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = brush;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    last.current = { x, y };
  };

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={baseRef}
        aria-hidden
        className="absolute inset-0 h-full w-full transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <canvas
        ref={canvasRef}
        aria-label="Paint here to reveal the artwork"
        className="absolute inset-0 h-full w-full touch-none transition-opacity duration-200"
        style={{ cursor: disabled ? "default" : "crosshair", opacity: visible ? 1 : 0 }}
        onPointerDown={(e) => {
          if (disabled) return;
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          painting.current = true;
          last.current = null;
          const p = pos(e);
          paintAt(p.x, p.y);
          onStroke?.();
        }}
        onPointerMove={(e) => {
          if (disabled || !painting.current) return;
          const p = pos(e);
          paintAt(p.x, p.y);
          moves.current += 1;
          if (moves.current % 4 === 0) onStroke?.();
          if (moves.current % 6 === 0) measure();
        }}
        onPointerUp={() => {
          painting.current = false;
          last.current = null;
          measure();
        }}
        onPointerCancel={() => {
          painting.current = false;
          last.current = null;
          measure();
        }}
        onPointerLeave={() => {
          if (painting.current) {
            painting.current = false;
            last.current = null;
            measure();
          }
        }}
        data-brush={color}
      />
    </div>
  );
}
