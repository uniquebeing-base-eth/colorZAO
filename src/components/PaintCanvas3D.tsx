import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  color: string;
  onProgress: (percent: number) => void;
  onStroke?: () => void;
  disabled?: boolean;
  /** 0-100: pre-revealed amount when a session is restored. */
  initialReveal?: number;
};

const MASK_SIZE = 512;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform sampler2D uMask;
  uniform vec2 uScale;      // cover-fit scale
  uniform vec2 uPointer;    // 0..1, for lighting + parallax
  uniform float uTime;
  uniform float uComplete;  // 0..1 eased completion
  uniform float uIntro;     // 0..1 fade-in

  void main() {
    vec2 centered = (vUv - 0.5);
    float m = texture2D(uMask, vUv).r;
    float reveal = smoothstep(0.05, 0.55, m);

    // Depth / parallax: revealed paint sits slightly "above" the dull layer.
    vec2 parallax = (uPointer - 0.5) * 0.014 * (0.35 + reveal * 0.65);
    vec2 uv = centered * uScale + 0.5 + parallax;
    uv = clamp(uv, 0.0, 1.0);

    vec3 art = texture2D(uTex, uv).rgb;
    float g = dot(art, vec3(0.299, 0.587, 0.114));
    vec3 dull = vec3(0.125 + g * 0.78);

    // Saturation lift on freshly revealed paint.
    vec3 wet = mix(dull, art, reveal);
    float edge = smoothstep(0.02, 0.3, m) * (1.0 - smoothstep(0.3, 0.75, m));
    wet += edge * vec3(0.16, 0.10, 0.22);

    // Canvas lighting: soft sheen following the finger + slow drift.
    float d = distance(vUv, uPointer);
    float sheen = exp(-d * d * 9.0) * 0.13 * (0.4 + reveal * 0.8);
    float drift = 0.05 * sin((vUv.x + vUv.y) * 3.0 - uTime * 0.35);
    wet += sheen + drift * reveal * 0.5;

    // Celebration bloom once the canvas is complete.
    wet += uComplete * 0.10 * vec3(1.0, 0.86, 0.62) * (1.0 - length(centered));

    // Vignette for gallery depth.
    float vig = 1.0 - 0.28 * dot(centered, centered) * 2.0;
    wet *= vig;

    gl_FragColor = vec4(wet, uIntro);
  }
`;

/**
 * Three.js scratch-to-reveal canvas.
 *
 * The artwork lives in a single WebGL texture and is always on screen; a
 * painted mask texture drives a shader that mixes the desaturated layer with
 * the true colors, adds edge glow, lighting, parallax and a completion
 * particle burst. Falls back gracefully if WebGL is unavailable.
 */
export function PaintCanvas3D({
  src,
  color,
  onProgress,
  onStroke,
  disabled,
  initialReveal = 0,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskDirty = useRef(false);
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5 });
  const progressRef = useRef(0);
  const moves = useRef(0);
  const completeRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const measure = useCallback(() => {
    const ctx = maskCtxRef.current;
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
    const step = 8;
    let cleared = 0;
    let total = 0;
    for (let y = 0; y < MASK_SIZE; y += step) {
      for (let x = 0; x < MASK_SIZE; x += step) {
        total++;
        if ((data[(y * MASK_SIZE + x) * 4] ?? 0) > 120) cleared++;
      }
    }
    const pct = total ? Math.min(100, Math.round((cleared / total) * 125)) : 0;
    if (pct !== progressRef.current) {
      progressRef.current = pct;
      onProgressRef.current(pct);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | null = null;

    const mask = document.createElement("canvas");
    mask.width = MASK_SIZE;
    mask.height = MASK_SIZE;
    const maskCtx = mask.getContext("2d", { willReadFrequently: true });
    const restored = initialReveal >= 100;
    if (maskCtx) {
      maskCtx.fillStyle = restored ? "#fff" : "#000";
      maskCtx.fillRect(0, 0, MASK_SIZE, MASK_SIZE);
    }
    maskRef.current = mask;
    maskCtxRef.current = maskCtx;
    progressRef.current = restored ? 100 : 0;
    completeRef.current = restored ? 1 : 0;
    moves.current = 0;
    setVisible(false);
    if (!restored) onProgressRef.current(0);

    const boot = async () => {
      const THREE = await import("three");
      const canvas = glRef.current;
      const wrap = wrapRef.current;
      if (cancelled || !canvas || !wrap) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const texture = await new Promise<import("three").Texture | null>((resolve) => {
        loader.load(src, resolve, undefined, () => resolve(null));
      });
      if (cancelled) return;
      if (!texture) {
        setFailed(true);
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;

      const maskTexture = new THREE.CanvasTexture(mask);
      maskTexture.minFilter = THREE.LinearFilter;
      maskTexture.magFilter = THREE.LinearFilter;

      const uniforms = {
        uTex: { value: texture },
        uMask: { value: maskTexture },
        uScale: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uComplete: { value: 0 },
        uIntro: { value: 0 },
      };

      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms,
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
        }),
      );
      scene.add(quad);

      // Completion particle burst.
      const COUNT = 260;
      const positions = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = Math.random() * 2 - 1;
        positions[i * 3 + 1] = Math.random() * 2 - 1;
        positions[i * 3 + 2] = 0;
        seeds[i * 3] = Math.random();
        seeds[i * 3 + 1] = 0.35 + Math.random() * 0.9;
        seeds[i * 3 + 2] = Math.random() * Math.PI * 2;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        size: 0.03,
        transparent: true,
        opacity: 0,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(color),
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      const resize = () => {
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        renderer.setSize(w, h, false);
        const image = texture.image as { width: number; height: number };
        const imgAspect = image.width / image.height;
        const boxAspect = w / h;
        // Cover fit expressed as uv scale.
        if (boxAspect > imgAspect) {
          uniforms.uScale.value.set(1, imgAspect / boxAspect);
        } else {
          uniforms.uScale.value.set(boxAspect / imgAspect, 1);
        }
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(wrap);

      let raf = 0;
      const clock = new THREE.Clock();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();
        uniforms.uTime.value = t;
        uniforms.uIntro.value = Math.min(1, uniforms.uIntro.value + 0.06);
        if (uniforms.uIntro.value > 0.2 && !cancelled) setVisible(true);

        uniforms.uPointer.value.x += (pointer.current.x - uniforms.uPointer.value.x) * 0.12;
        uniforms.uPointer.value.y += (pointer.current.y - uniforms.uPointer.value.y) * 0.12;

        if (maskDirty.current) {
          maskTexture.needsUpdate = true;
          maskDirty.current = false;
        }

        const target = progressRef.current >= 100 ? 1 : 0;
        completeRef.current += (target - completeRef.current) * 0.05;
        uniforms.uComplete.value = completeRef.current * (0.75 + 0.25 * Math.sin(t * 2.2));

        // Particles drift upward and fade in only on completion.
        const pos = particleGeo.getAttribute("position") as import("three").BufferAttribute;
        if (target === 1) {
          particleMat.opacity = Math.min(0.85, particleMat.opacity + 0.02);
          for (let i = 0; i < COUNT; i++) {
            const speed = seeds[i * 3 + 1]! * 0.0035;
            let y = pos.getY(i) + speed;
            if (y > 1.05) y = -1.05;
            pos.setY(i, y);
            pos.setX(i, pos.getX(i) + Math.sin(t * 1.2 + seeds[i * 3 + 2]!) * 0.0009);
          }
          pos.needsUpdate = true;
          particleMat.size = 0.02 + 0.012 * (0.5 + 0.5 * Math.sin(t * 3));
        }

        renderer.render(scene, camera);
      };
      tick();

      dispose = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        particleGeo.dispose();
        particleMat.dispose();
        quad.geometry.dispose();
        (quad.material as import("three").Material).dispose();
        maskTexture.dispose();
        texture.dispose();
        renderer.dispose();
      };
    };

    void boot();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [src, color, initialReveal]);

  const paintAt = (x: number, y: number) => {
    const ctx = maskCtxRef.current;
    if (!ctx) return;
    const brush = MASK_SIZE * 0.075;
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush * 2;
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, brush, 0, Math.PI * 2);
    ctx.fill();
    last.current = { x, y };
    maskDirty.current = true;
  };

  const uv = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      u: (e.clientX - rect.left) / rect.width,
      v: (e.clientY - rect.top) / rect.height,
    };
  };

  if (failed) {
    return (
      <div ref={wrapRef} className="absolute inset-0">
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={glRef}
        aria-label="Paint here to reveal the artwork"
        className="absolute inset-0 h-full w-full touch-none transition-opacity duration-500"
        style={{ cursor: disabled ? "default" : "crosshair", opacity: visible ? 1 : 0 }}
        onPointerDown={(e) => {
          const p = uv(e);
          pointer.current = { x: p.u, y: 1 - p.v };
          if (disabled) return;
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          painting.current = true;
          last.current = null;
          paintAt(p.u * MASK_SIZE, p.v * MASK_SIZE);
          onStroke?.();
        }}
        onPointerMove={(e) => {
          const p = uv(e);
          pointer.current = { x: p.u, y: 1 - p.v };
          if (disabled || !painting.current) return;
          paintAt(p.u * MASK_SIZE, p.v * MASK_SIZE);
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
      />
    </div>
  );
}
