/** Procedural title-screen artwork. No run data, rules, storage or network. */
export interface MenuBackground {
  setActive(active: boolean): void;
  setMotion(enabled: boolean): void;
  destroy(): void;
}

const vertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
mat2 turn(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}
vec2 curl(vec2 p, vec2 center, float strength) {
  vec2 d = p - center;
  return center + turn(strength / (0.045 + dot(d, d))) * d;
}
void main() {
  // Work in logical landscape coordinates. The capped render surface supplies
  // the pixel rhythm; quantizing before derivatives would create a light grid.
  float diagonal = length(u_resolution);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / diagonal;
  float t = u_time + 12.0;

  // A broad twist and two local curls feed one another, rather than sliding
  // a coloured sine band across the screen. Their clocks have different phases.
  p = turn(8.8 * length(p) - t * 0.065) * p;
  p = curl(p, vec2(-0.22 + 0.025 * sin(t * 0.14), 0.12), 0.047);
  p = curl(p, vec2(0.23, -0.10 + 0.03 * cos(t * 0.11)), -0.041);
  p *= 27.0;
  vec2 memory = vec2(p.x + p.y, p.y - p.x) * 0.72;
  for (int i = 0; i < 5; i++) {
    float layer = float(i);
    memory = memory * 0.72 + p.yx * 0.67
      + sin(p.x + p.y + layer * 1.31 + t * 0.09);
    vec2 drift = vec2(sin(memory.y * 0.43 + t * 0.31 + layer),
                      cos(memory.x * 0.51 - t * 0.27 - layer));
    float fold = sin(p.x * 0.72 - p.y) - cos(p.x + p.y * 0.55);
    p += drift * 0.9 + vec2(fold, -fold * 0.69);
    p = mat2(0.984, -0.178, 0.178, 0.984) * p;
  }

  // Paint follows the two-dimensional deformed field. Highlights follow a
  // separate surface height, so shadow, colour and relief need not move as one.
  float density = length(p) * 0.074 + 0.045 * sin(memory.x * 0.23);
  float redPaint = 1.0 - smoothstep(0.16, 0.43, abs(density - 0.99));
  float bluePaint = 1.0 - smoothstep(0.15, 0.47, density);
  float darkPaint = max(0.0, 1.0 - redPaint - bluePaint);
  vec3 color = vec3(0.871, 0.267, 0.231) * redPaint
    + vec3(0.0, 0.420, 0.706) * bluePaint
    + vec3(0.065, 0.105, 0.126) * darkPaint;

  float height = 0.32 * sin(density * 7.0)
    + 0.15 * sin(memory.x * 0.19 + memory.y * 0.17);
  vec2 slope;
#ifdef SURFACE_DERIVATIVES
  slope = vec2(dFdx(height), dFdy(height)) * diagonal * 0.038;
#else
  slope = vec2(sin(memory.x * 0.19), cos(memory.y * 0.17)) * 0.42;
#endif
  vec3 normal = normalize(vec3(-slope, 1.0));
  vec3 light = normalize(vec3(-0.45, 0.60, 0.72));
  float diffuse = max(0.0, dot(normal, light));
  float sheen = pow(max(0.0, dot(normal, normalize(light + vec3(0.0, 0.0, 1.0)))), 23.0);
  float rim = pow(1.0 - max(0.0, normal.z), 2.0);
  float crest = pow(max(redPaint, bluePaint), 12.0);
  color *= 0.57 + 0.47 * diffuse;
  color += vec3(0.66, 0.80, 0.88) * (0.34 * sheen + 0.08 * rim) * (1.0 - darkPaint * 0.65);
  color += vec3(0.10, 0.08, 0.06) * crest * diffuse;
  vec2 screen = gl_FragCoord.xy / u_resolution;
  float vignette = 1.0 - 0.22 * dot(screen - 0.5, screen - 0.5);
  gl_FragColor = vec4(clamp(color * vignette, 0.0, 1.0), 1.0);
}
`;

/** Motion preferences belong to the menu controller; this renderer only obeys them. */
export function mountMenuBackground(canvas: HTMLCanvasElement): MenuBackground {
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let resolution: WebGLUniformLocation | null = null;
  let timeUniform: WebGLUniformLocation | null = null;
  let fallback: CanvasRenderingContext2D | null = null;
  let ready = false;
  let active = false;
  let motion = true;
  let destroyed = false;
  let lost = false;
  let frame = 0;
  let previousDraw = 0;
  let elapsed = 0;

  function release() {
    if (!gl || lost) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    buffer = null;
    program = null;
  }

  function initialize() {
    ready = false;
    try {
      gl = canvas.getContext('webgl', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'});
      if (!gl) {
        fallback = canvas.getContext('2d');
        canvas.dataset.renderer = fallback ? 'canvas2d' : 'css';
        return;
      }
      const derivatives = gl.getExtension('OES_standard_derivatives');
      const surfaceSource = (derivatives ? '#extension GL_OES_standard_derivatives : enable\n#define SURFACE_DERIVATIVES\n' : '') + fragmentSource;
      const shaders: WebGLShader[] = [];
      try {
        for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, surfaceSource]] as const) {
          const shader = gl.createShader(type);
          if (!shader) throw new Error('Shader unavailable');
          shaders.push(shader);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
        }
        program = gl.createProgram();
        if (!program) throw new Error('Program unavailable');
        for (const shader of shaders) gl.attachShader(program, shader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program unavailable');
      } finally {
        for (const shader of shaders) gl.deleteShader(shader);
      }
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Buffer unavailable');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program!, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      resolution = gl.getUniformLocation(program!, 'u_resolution');
      timeUniform = gl.getUniformLocation(program!, 'u_time');
      canvas.dataset.renderer = 'webgl';
      ready = true;
    } catch {
      release();
      // The parent supplies a CSS swirl when a GPU context cannot be used.
      canvas.dataset.renderer = 'css';
    }
  }

  function render() {
    if (destroyed || lost) return;
    if (gl && ready) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (fallback) {
      const ctx = fallback, w = canvas.width, h = canvas.height;
      ctx.fillStyle = '#071e29'; ctx.fillRect(0, 0, w, h);
      for (const [x, y, radius, color] of [[0.13, 0.24, 0.8, '#d43b36'], [0.52, 0.58, 0.64, '#007fb3'], [1, 0.75, 0.68, '#ed4c43']] as const) {
        const gradient = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * radius);
        gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
      }
    }
  }

  function resize() {
    if (destroyed) return;
    // CSS transforms can rotate the surrounding landscape stage. Bounding-box
    // dimensions would then be swapped, distorting the shader's logical aspect.
    const cssWidth = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
    const cssHeight = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const scale = dpr * Math.min(1, Math.sqrt(800_000 / (cssWidth * cssHeight * dpr * dpr)));
    const width = Math.max(1, Math.floor(cssWidth * scale));
    const height = Math.max(1, Math.floor(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    render();
  }

  const canAnimate = () => active && motion && !destroyed && !lost && ready && !document.hidden;
  function tick(timestamp: number) {
    frame = 0;
    if (!canAnimate()) return;
    if (!previousDraw || timestamp - previousDraw >= 1000 / 30) {
      elapsed += previousDraw ? Math.min(timestamp - previousDraw, 80) / 1000 : 0;
      previousDraw = timestamp;
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  function synchronize() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previousDraw = 0;
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }
  const visibility = () => { if (!document.hidden && active) resize(); synchronize(); };
  const contextLost = (event: Event) => {
    event.preventDefault(); lost = true; ready = false; canvas.dataset.renderer = 'css'; synchronize();
  };
  const contextRestored = () => {
    lost = false; buffer = null; program = null; initialize(); resize(); synchronize();
  };
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', resize);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  initialize(); resize();

  return {
    setActive(value) {
      if (destroyed) return;
      active = value;
      if (active) resize();
      synchronize();
    },
    setMotion(value) {
      if (destroyed) return;
      motion = value;
      render(); synchronize();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      release();
    }
  };
}

