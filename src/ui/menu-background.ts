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
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
mat2 rotate(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat2(c, -s, s, c);
}
vec2 vortex(vec2 p, vec2 center, float strength) {
  vec2 d = p - center;
  return center + rotate(strength / (0.38 + dot(d, d))) * d;
}
void main() {
  vec2 pixel = floor(gl_FragCoord.xy / 1.6) * 1.6;
  vec2 p = (2.0 * pixel - u_resolution) / min(u_resolution.x, u_resolution.y);
  float time = u_time * 0.11;
  p *= 1.36;
  p = rotate(-0.24 + 0.07 * sin(time * 0.36)) * p;
  p = vortex(p, vec2(-0.78, 0.32), 1.65 + 0.18 * sin(time));
  p = vortex(p, vec2(0.85, -0.24), -1.32 + 0.18 * cos(time * 0.7));
  vec2 q = p;
  for (int i = 0; i < 5; i++) {
    float layer = float(i);
    q += 0.38 * sin(q.yx * (1.2 + layer * 0.17) + vec2(time * 0.36, -time * 0.29) + layer * 1.72);
    q = rotate(0.31) * q;
  }
  float flow = q.x * 1.55 + q.y * 0.49 + 0.56 * sin(q.y * 1.47 - time * 0.55);
  float field = sin(flow + time * 0.46);
  vec3 dark = vec3(0.020, 0.080, 0.105);
  vec3 red = vec3(0.91, 0.19, 0.16);
  vec3 blue = vec3(0.015, 0.47, 0.73);
  float redArea = smoothstep(0.02, 0.48, field);
  float blueArea = (1.0 - smoothstep(-0.52, -0.02, field));
  vec3 color = mix(dark, red, redArea);
  color = mix(color, blue, blueArea);
  // Parallel, narrow reflections make the warped surface read as liquid.
  float ribbons = 0.5 + 0.5 * sin(flow * 12.0 + 1.7 * sin(q.y * 2.5));
  float fine = pow(ribbons, 15.0);
  float shoulder = pow(1.0 - abs(field), 11.0);
  float lit = 0.5 + 0.5 * sin(flow * 3.0 - 0.7);
  color *= 0.69 + 0.34 * lit;
  color += vec3(0.23, 0.18, 0.14) * fine * (redArea + blueArea) * 0.62;
  color += vec3(0.57, 0.72, 0.74) * shoulder * (0.30 + fine * 0.56);
  float vein = pow(0.5 + 0.5 * sin(flow * 25.0 + q.y * 0.8), 30.0);
  color += vec3(0.25, 0.32, 0.35) * vein * shoulder;
  vec2 screen = gl_FragCoord.xy / u_resolution;
  float vignette = 1.0 - 0.28 * dot(screen - 0.5, screen - 0.5);
  gl_FragColor = vec4(color * vignette, 1.0);
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
      const shaders: WebGLShader[] = [];
      try {
        for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
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
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || window.innerWidth;
    const cssHeight = rect.height || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const scale = dpr * Math.min(1, Math.sqrt(1_300_000 / (cssWidth * cssHeight * dpr * dpr)));
    const width = Math.max(1, Math.round(cssWidth * scale));
    const height = Math.max(1, Math.round(cssHeight * scale));
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

