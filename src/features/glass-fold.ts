/* Adapted from the GlassFold shader by GradFlow (gradflow.meerbahadin.dev).
   The site uses a small vanilla WebGL wrapper instead of adding React. */
const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;
const fragment = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 vUv;
vec2 centered(vec2 uv) {
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  return p;
}
mat2 rot(float a) { float s = sin(a); float c = cos(a); return mat2(c, -s, s, c); }
void main() {
  vec2 q = rot(0.6) * centered(vUv) * 2.0;
  float t = u_time * 0.6;
  float pixel = 2.0 / max(u_resolution.y, 1.0);
  vec3 color = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float bend = mod(fi, 2.0) * 2.0 - 1.0;
    float crease = (fi - 2.5) * 0.4
      + 0.26 * sin(q.x * (1.05 + 0.12 * fi) + fi * 1.9 + t * (0.25 + 0.05 * fi))
      + 0.1 * bend * q.x * q.x;
    float s = q.y - crease;
    float pane = smoothstep(-pixel, pixel, s);
    float back = max(s, 0.0);
    float body = exp(-back * 1.7);
    float fresnel = exp(-back * 8.0);
    float rim = exp(-back * 80.0);
    float inner = exp(-pow((back - 0.045) / 0.014, 2.0));
    float bloom = exp(-abs(s) * 20.0);
    vec3 tint = vec3(clamp(fresnel * 0.6 + 0.08 + 0.14 * sin(fi * 2.1 + q.x * 0.8 + t * 0.2), 0.0, 1.0));
    vec3 light = tint * pane * (body * 0.42 + fresnel * 0.4)
      + vec3(pane * (rim * 0.6 + inner * 0.12) + bloom * 0.1);
    color += light * (1.0 - color);
  }
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export function initGlassFold(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.hidden = true; return; }
  const shader = (kind: number, source: string): WebGLShader | null => {
    const value = gl.createShader(kind);
    if (!value) return null;
    gl.shaderSource(value, source); gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) { gl.deleteShader(value); return null; }
    return value;
  };
  const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); if (program) gl.deleteProgram(program); canvas.hidden = true; return; }
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); canvas.hidden = true; return; }
  const buffer = gl.createBuffer();
  if (!buffer) { gl.deleteProgram(program); canvas.hidden = true; return; }
  gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const time = gl.getUniformLocation(program, 'u_time');
  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, last = 0, elapsed = 0, visible = true, lost = false;
  const render = (now: number) => {
    frame = 0;
    if (lost || document.hidden || !visible) return;
    if (last && !reduced.matches) elapsed += Math.min((now - last) / 1000, .1);
    last = now;
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform1f(time, elapsed); gl.uniform2f(resolution, width, height); gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!reduced.matches) frame = requestAnimationFrame(render);
  };
  const update = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (!document.hidden && visible && !lost) frame = requestAnimationFrame(render);
  };
  const resize = new ResizeObserver(() => { if (reduced.matches) update(); });
  resize.observe(canvas);
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; update(); });
  intersection?.observe(canvas);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; update(); canvas.hidden = true; });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    if (frame) cancelAnimationFrame(frame);
    resize.disconnect(); intersection?.disconnect();
    document.removeEventListener('visibilitychange', update); reduced.removeEventListener('change', update);
    gl.deleteBuffer(buffer); gl.deleteProgram(program);
  }, { once: true });
  update();
}
