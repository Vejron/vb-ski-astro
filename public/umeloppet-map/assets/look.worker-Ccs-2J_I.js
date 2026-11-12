const e=`
struct Frame {
  viewProj: mat4x4f,
  view: mat4x4f,
  cameraPos: vec4f,
  // Unit vector toward the sun.
  sunDir: vec4f,
  // Colour times intensity.
  sunColor: vec4f,
  hemiSky: vec4f,
  hemiGround: vec4f,
  fogColor: vec4f,
  // near, far, on (0 or 1), time in seconds.
  fog: vec4f,
  // width, height, 1/width, 1/height in pixels.
  viewport: vec4f,
  shadowMatrix: mat4x4f,
  // texel size, blur radius in texels, on (0 or 1), one tap instead of the 3×3 filter (0 or 1).
  shadow: vec4f,
  // camera near, camera far, seconds since the last frame, unused.
  clip: vec4f,
  // Number of lights listed, the height under which a reflection pass cuts the scene away, whether it does (0 or 1), unused.
  lightCount: vec4f,
  // The light grid's corner (world x, z), 1 / its cell size, whether to show its cells' counts instead (0 or 1).
  lightGrid: vec4f,
}

struct Object {
  model: mat4x4f,
  tint: vec4f,
  // material index, flags (OBJ_*), first bone + 1 (0 when not skinned), unused.
  misc: vec4u,
}

struct Material {
  // linear rgb, opacity.
  color: vec4f,
  emissive: vec4f,
  // flags (MAT_*), ramp row, unused, unused.
  params: vec4u,
}

const MAT_LIT = 1u;
const MAT_VERTEX_COLORS = 2u;
const MAT_FOG = 4u;
const MAT_NORMAL_MAP = 8u;
const MAT_NORMAL_TONE = 16u;
const MAT_CRATERS = 32u;
const MAT_SNOW = 64u;
const MAT_MARSH = 128u;
const MAT_STONES = 256u;
const MAT_WORN = 512u;
const MAT_WALLS = 1024u;
const MAT_ASPHALT = 2048u;
const MAT_GROUND = 4096u;
const SNOW_COLOR = vec3f(0.93, 0.95, 0.98);
const SNOW_ROCK = vec3f(0.3, 0.31, 0.33);
const OBJ_RECEIVE_SHADOW = 1u;
const PI = 3.141592653589793;

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> objects: array<Object>;
@group(0) @binding(2) var<storage, read> materials: array<Material>;
// This frame's draws, in draw order: instance_index picks an entry, the entry picks the object record.
@group(0) @binding(3) var<storage, read> drawList: array<u32>;
// Skinning matrices (bone world × inverse bind) of every skinned mesh drawn this frame.
@group(0) @binding(4) var<storage, read> bones: array<mat4x4f>;

// The object's model matrix, or for a skinned object the weighted blend of its vertex's bones.
fn modelMatrix(object: Object, joints: vec4u, weights: vec4f) -> mat4x4f {
  if (object.misc.z == 0u) {
    return object.model;
  }
  let b = object.misc.z - 1u;
  return bones[b + joints.x] * weights.x + bones[b + joints.y] * weights.y + bones[b + joints.z] * weights.z + bones[b + joints.w] * weights.w;
}

// The inverse-transpose of the model's upper 3×3, up to scale: the cofactor matrix. Normals only need
// direction, so this handles non-uniform scale without a per-object normal matrix.
fn normalMatrix(m: mat4x4f) -> mat3x3f {
  let c0 = m[0].xyz;
  let c1 = m[1].xyz;
  let c2 = m[2].xyz;
  let cof = mat3x3f(cross(c1, c2), cross(c2, c0), cross(c0, c1));
  return cof * sign(dot(c0, cof[0]));
}

${`
const CRATER_CELL = ${16 .toFixed(1)};
const CRATER_BUCKETS = 4096u;
const CRATER_SLOTS = 16u;
const CRATER_REACH = ${1.6.toFixed(2)};
// Seconds a fresh crater's embers take to go out.
const CRATER_EMBER_LIFE = ${20 .toFixed(1)};
// Seconds a crater's marks last, fading out over the last 30%.
const CRATER_FADE = ${1800 .toFixed(1)};

// Two vec4s a crater: x, z, radius, depth (metres); birth time (seconds), unused. Marks fade with age.
@group(0) @binding(5) var<storage, read> craters: array<vec4f>;
// Per bucket: a count, then that many crater indices.
@group(0) @binding(6) var<storage, read> craterGrid: array<u32>;

struct CraterMark {
  // The ground's height gradient the craters add (dh/dx, dh/dz).
  slope: vec2f,
  // Bare earth, char, thrown-out soil and the ink line on the rim, 0 to 1 each.
  earth: f32,
  char: f32,
  soil: f32,
  ink: f32,
  // How much of the sun reaches past the craters' rims (1 all of it), and of the sky into their bowls.
  sun: f32,
  sky: f32,
  // Embers still glowing in a fresh crater, 0 to 1.
  heat: f32,
}

fn craterBucket(cell: vec2i) -> u32 {
  return ((bitcast<u32>(cell.x) * 73856093u) ^ (bitcast<u32>(cell.y) * 19349663u)) & (CRATER_BUCKETS - 1u);
}

fn craterHash(p: vec2i) -> f32 {
  var h = (bitcast<u32>(p.x) * 1664525u) ^ (bitcast<u32>(p.y) * 1013904223u);
  h ^= h >> 16u;
  h *= 2246822519u;
  h ^= h >> 13u;
  h *= 3266489917u;
  h ^= h >> 16u;
  return f32(h) * (1.0 / 4294967296.0);
}

// Value noise, 0 to 1, a lattice point a unit.
fn craterNoise(p: vec2f) -> f32 {
  let i = vec2i(floor(p));
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = craterHash(i);
  let b = craterHash(i + vec2i(1, 0));
  let c = craterHash(i + vec2i(0, 1));
  let d = craterHash(i + vec2i(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// The height of crater \`c\`'s bowl at \`xz\`, deepened by \`scale\`: 0 at and past the rim.
fn craterHeight(c: vec4f, xz: vec2f, scale: f32) -> f32 {
  let t2 = min(dot(xz - c.xy, xz - c.xy) / (c.z * c.z), 1.0);
  return -c.w * scale * (1.0 - t2) * (1.0 - t2);
}

// Whether the sun reaches \`xz\` in crater \`c\`'s bowl (deepened by \`scale\`) past its rim: the ray
// toward the sun, marched to the far side, against the bowl's own heights. Softened near the edge of the shadow.
fn craterSun(c: vec4f, xz: vec2f, scale: f32) -> f32 {
  let sun = frame.sunDir.xyz;
  let across = length(sun.xz);
  if (sun.y <= 0.0 || across < 1e-3) {
    return 1.0;
  }
  let toward = sun.xz / across;
  let rise = sun.y / across;
  let here = craterHeight(c, xz, scale);
  var lit = 1.0;
  for (var i = 1u; i <= 6u; i++) {
    let along = c.z * 2.0 * f32(i) / 6.0;
    let above = here + along * rise - craterHeight(c, xz + toward * along, scale);
    lit = min(lit, smoothstep(-0.05, 0.1, above));
  }
  return lit;
}

// How much of crater \`index\`'s marks are left at its age: 1, then fading to 0 at CRATER_FADE.
fn craterFade(index: u32) -> f32 {
  return 1.0 - smoothstep(0.7 * CRATER_FADE, CRATER_FADE, frame.fog.w - craters[index * 2u + 1u].x);
}

// The seed of crater \`c\`'s noise: from where it is, so every player's crater looks the same.
fn craterSeed(c: vec4f) -> vec2f {
  return vec2f(craterHash(vec2i(c.xy * 10.0)), craterHash(vec2i(c.yx * 10.0))) * 100.0;
}

// How far the rim is pushed in or out here, as a share of the radius: a ragged edge, not a circle.
fn craterRagged(off: vec2f, seed: vec2f) -> f32 {
  return (craterNoise(off * 1.3 + seed) - 0.5) * 0.25;
}

// The char at \`off\` from a crater's middle, \`t\` radii out along \`dir\`: a black heart, then streaks
// thrown out past the rim, some long, some short, most none.
fn craterChar(off: vec2f, t: f32, dir: vec2f, seed: vec2f, ragged: f32) -> f32 {
  let core = (1.0 - smoothstep(0.2, 0.5, t + ragged)) * 0.85;
  let streak = smoothstep(0.55, 0.8, craterNoise(dir * 13.0 + seed.yx));
  let reach = 1.0 + 0.45 * craterNoise(dir * 4.0 + seed);
  let rays = streak * smoothstep(0.3, 0.6, t) * (1.0 - smoothstep(0.7 * reach, reach, t + ragged)) * 0.6;
  let speckle = 0.75 + 0.25 * craterNoise(off * 2.7 + seed.yx);
  return max(core, rays) * speckle;
}

// What the craters do to a blade of grass rooted at \`root\`: xy its lean away from them (tip offset
// per metre of blade), laid flattest just past the rim; z how burnt it is, as the ground under it.
fn craterGrass(root: vec2f) -> vec3f {
  var g = vec3f(0.0);
  let base = craterBucket(vec2i(floor(root / CRATER_CELL))) * CRATER_SLOTS;
  let count = min(craterGrid[base], CRATER_SLOTS - 1u);
  for (var k = 0u; k < count; k++) {
    let index = craterGrid[base + 1u + k];
    let c = craters[index * 2u];
    let off = root - c.xy;
    let d = length(off);
    let t = d / c.z;
    let fade = craterFade(index);
    if (t >= CRATER_REACH || fade <= 0.0) {
      continue;
    }
    let dir = off / max(d, 1e-4);
    let seed = craterSeed(c);
    g += vec3f(dir * 1.2 * smoothstep(0.7, 0.9, t) * (1.0 - smoothstep(0.95, 1.5, t)) * fade, 0.0);
    g.z = max(g.z, craterChar(off, t, dir, seed, craterRagged(off, seed)) * fade);
  }
  return g;
}

// The marks at ground point \`xz\`, where a pixel spans \`pixel\` metres. Every crater listed in the
// point's cell counts: slopes add (as their dents do), each mark takes the strongest.
fn craterMarks(xz: vec2f, pixel: f32, slope: f32) -> CraterMark {
  var m = CraterMark(vec2f(0.0), 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0);
  let base = craterBucket(vec2i(floor(xz / CRATER_CELL))) * CRATER_SLOTS;
  let count = min(craterGrid[base], CRATER_SLOTS - 1u);
  for (var k = 0u; k < count; k++) {
    let index = craterGrid[base + 1u + k];
    let c = craters[index * 2u];
    let r = c.z;
    let off = xz - c.xy;
    let d = length(off);
    let fade = craterFade(index);
    if (d >= r * CRATER_REACH || fade <= 0.0) {
      continue;
    }
    let t = d / r;
    let dir = off / max(d, 1e-4);
    let seed = craterSeed(c);

    // The bowl, depth (1 - t²)²: its slope down toward the middle.
    if (t < 1.0) {
      m.slope += dir * (slope * 4.0 * c.w * t * (1.0 - t * t) / r) * fade;
      m.sun = min(m.sun, mix(1.0, craterSun(c, xz, slope), fade));
      // Less sky reaches the bottom of a bowl: darkest in the middle.
      m.sky = min(m.sky, 1.0 - 0.35 * (1.0 - t * t) * (1.0 - t * t) * fade);
    }
    // A low lip just past the rim, drawn only (the ground has none): a bump a tenth of the depth.
    let lip = (t - 1.08) / 0.22;
    m.slope += dir * (-slope * 0.12 * c.w * 2.0 * lip * exp(-lip * lip) / (0.22 * r)) * fade;

    // Noise on the direction rather than the angle, so it has no seam where the angle wraps.
    let ragged = craterRagged(off, seed);
    m.char = max(m.char, craterChar(off, t, dir, seed, ragged) * fade);
    // Embers: patches of the char in the middle glowing, flickering, cooling to nothing.
    let age = frame.fog.w - craters[index * 2u + 1u].x;
    if (age < CRATER_EMBER_LIFE && t < 0.7) {
      let cool = 1.0 - age / CRATER_EMBER_LIFE;
      let patches = smoothstep(0.55, 0.8, craterNoise(off * 2.4 + seed.yx));
      let flicker = 0.6 + 0.4 * craterNoise(off * 0.8 + seed + vec2f(frame.fog.w * 1.7, 0.0));
      m.heat = max(m.heat, cool * cool * patches * flicker * (1.0 - smoothstep(0.35, 0.7, t + ragged)));
    }
    m.earth = max(m.earth, (1.0 - smoothstep(0.85, 1.0, t + ragged * 0.5)) * fade);
    m.soil = max(m.soil, smoothstep(0.8, 0.97, t) * (1.0 - smoothstep(1.05, 1.3, t + ragged)) * fade);
    // A line about a pixel and a half wide on the rim, broken in places as an inked stroke is, and gone
    // where the crater is too small on screen to carry it.
    let line = 1.0 - smoothstep(0.75 * pixel, 1.5 * pixel, abs(d - r * (1.0 + ragged * 0.2)));
    let stroke = smoothstep(0.3, 0.55, craterNoise(dir * 5.0 + seed));
    m.ink = max(m.ink, line * stroke * smoothstep(4.0, 10.0, r / pixel) * fade);
  }
  return m;
}
`}

const LIGHT_GRID = 64i;
const LIGHT_CELL_MAX = 32u;

// Three vec4s a light: xyz position and radius; linear rgb times strength and the cosine of a spot's
// outer half-angle (-2 for a point light); a spot's unit direction and the cosine of its inner half-angle.
@group(0) @binding(7) var<storage, read> lightRecords: array<vec4f>;
// Per cell, offset << 8 | count; then, from LIGHT_GRID², every cell's light indices.
@group(0) @binding(8) var<storage, read> lightCells: array<u32>;

// Light from this frame's point and spot lights on a surface at \`world\` facing \`n\` (wrapped, so it
// still reads on the far side). With \`frame.lightGrid.w\` on, the cell's light count instead, as a heat map.
fn pointLight(world: vec3f, n: vec3f) -> vec3f {
  if (frame.lightCount.x < 0.5) {
    return vec3f(0.0);
  }
  let cell = vec2i(floor((world.xz - frame.lightGrid.xy) * frame.lightGrid.z));
  if (any(cell < vec2i(0)) || any(cell >= vec2i(LIGHT_GRID))) {
    return vec3f(0.0);
  }
  let packed = lightCells[u32(cell.y * LIGHT_GRID + cell.x)];
  let first = u32(LIGHT_GRID * LIGHT_GRID) + (packed >> 8u);
  let count = min(packed & 0xffu, LIGHT_CELL_MAX);
  if (frame.lightGrid.w > 0.5) {
    let heat = f32(count) / 8.0;
    return vec3f(heat, max(1.0 - abs(heat - 1.0), 0.0), max(1.0 - heat * 2.0, 0.0) * 0.4) * PI * 2.0;
  }
  var sum = vec3f(0.0);
  for (var k = 0u; k < count; k++) {
    let i = lightCells[first + k] * 3u;
    let at = lightRecords[i];
    let to = at.xyz - world;
    let d = length(to);
    if (d < at.w) {
      let color = lightRecords[i + 1u];
      let spot = lightRecords[i + 2u];
      let l = to / max(d, 1e-3);
      let fall = 1.0 - d / at.w;
      let facing = dot(n, l) * 0.6 + 0.4;
      // A point light's cosines (-2 and -1) let every direction through.
      let cone = smoothstep(color.w, spot.w, dot(-l, spot.xyz));
      sum += color.rgb * fall * fall * max(facing, 0.0) * cone;
    }
  }
  return sum;
}

`;function t(e){return`
var<private> vertexModel: mat4x4f;
var<private> vertexUv: vec2f;

struct VertexIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) color: vec4f,
  @location(4) custom: vec4f,
  @location(5) joints: vec4u,
  @location(6) weights: vec4f,
  @builtin(instance_index) instance: u32,
}

struct VertexOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) color: vec4f,
  @location(3) uv: vec2f,
  @location(4) viewDepth: f32,
  @location(5) custom: vec4f,
  // material index, object flags, object record.
  @location(6) @interpolate(flat) ids: vec3u,
}

@vertex
fn vs(in: VertexIn) -> VertexOut {
  let record = drawList[in.instance];
  let object = objects[record];
  let material = materials[object.misc.x];
  let model = modelMatrix(object, in.joints, in.weights);
  var color = material.color * object.tint;
  if ((material.params.x & MAT_VERTEX_COLORS) != 0u) {
    color *= in.color;
  }
  vertexModel = model;
  vertexUv = in.uv;
  ${e?`let world = vec4f(displace((model * vec4f(in.position, 1.0)).xyz, in.custom, color), 1.0);`:`let world = model * vec4f(in.position, 1.0);`}
  var out: VertexOut;
  out.clip = frame.viewProj * world;
  out.world = world.xyz;
  out.normal = normalMatrix(model) * in.normal;
  out.color = color;
  out.uv = in.uv;
  out.viewDepth = -(frame.view * world).z;
  out.custom = in.custom;
  out.ids = vec3u(object.misc.x, object.misc.y, record);
  return out;
}

fn applyFog(rgb: vec3f, flags: u32, viewDepth: f32) -> vec3f {
  if ((flags & MAT_FOG) == 0u || frame.fog.z == 0.0) {
    return rgb;
  }
  return mix(rgb, frame.fogColor.rgb, smoothstep(frame.fog.x, frame.fog.y, viewDepth));
}
`}const n=t(!1);`${e}`,`${e}${n}`;let r=1;var i=class e{id=r++;positions;normals;uvs;colors;custom;joints;weights;indices;bounds={x:0,y:0,z:0,radius:0};version=0;dirtyRanges=[];gpu=void 0;disposed=!1;constructor(e){this.positions=e.positions,this.normals=e.normals,this.uvs=e.uvs,this.colors=e.colors,this.custom=e.custom,this.joints=e.joints,this.weights=e.weights,this.indices=e.indices,e.bounds?this.bounds={...e.bounds}:this.computeBounds()}get vertexCount(){return this.positions.length/3}get indexCount(){return this.indices?this.indices.length:this.vertexCount}needsUpdateRange(e,t){this.dirtyRanges.push(e,t)}needsUpdate(){this.dirtyRanges.length=0,this.version++,this.computeBounds()}computeBounds(){let e=this.positions,t=1/0,n=1/0,r=1/0,i=-1/0,a=-1/0,o=-1/0;for(let s=0;s<e.length;s+=3){let c=e[s],l=e[s+1],u=e[s+2];c<t&&(t=c),l<n&&(n=l),u<r&&(r=u),c>i&&(i=c),l>a&&(a=l),u>o&&(o=u)}if(!e.length){this.bounds={x:0,y:0,z:0,radius:0};return}let s=(t+i)/2,c=(n+a)/2,l=(r+o)/2,u=0;for(let t=0;t<e.length;t+=3){let n=e[t]-s,r=e[t+1]-c,i=e[t+2]-l;u=Math.max(u,n*n+r*r+i*i)}this.bounds={x:s,y:c,z:l,radius:Math.sqrt(u)}}computeNormals(){let e=this.positions,t=new Float32Array(e.length),n=this.indexCount/3,r=this.indices;for(let i=0;i<n;i++){let n=r?r[i*3]:i*3,a=r?r[i*3+1]:i*3+1,o=r?r[i*3+2]:i*3+2,s=e[a*3]-e[n*3],c=e[a*3+1]-e[n*3+1],l=e[a*3+2]-e[n*3+2],u=e[o*3]-e[n*3],d=e[o*3+1]-e[n*3+1],f=e[o*3+2]-e[n*3+2],p=c*f-l*d,m=l*u-s*f,h=s*d-c*u;for(let e of[n,a,o])t[e*3]=t[e*3]+p,t[e*3+1]=t[e*3+1]+m,t[e*3+2]=t[e*3+2]+h}for(let e=0;e<t.length;e+=3){let n=Math.hypot(t[e],t[e+1],t[e+2])||1;t[e]=t[e]/n,t[e+1]=t[e+1]/n,t[e+2]=t[e+2]/n}this.normals=t,this.version++}clone(){return new e({positions:this.positions.slice(),normals:this.normals?.slice(),uvs:this.uvs?.slice(),colors:this.colors?.slice(),custom:this.custom?.slice(),joints:this.joints?.slice(),weights:this.weights?.slice(),indices:this.indices?.slice()})}toNonIndexed(){let t=this.indices;if(!t)return this.clone();let n=(e,n)=>{if(!e)return;let r=new Float32Array(t.length*n);for(let i=0;i<t.length;i++)for(let a=0;a<n;a++)r[i*n+a]=e[t[i]*n+a];return r},r=this.colors?this.colors.length/this.vertexCount:0;return new e({positions:n(this.positions,3),normals:n(this.normals,3),uvs:n(this.uvs,2),colors:n(this.colors,r),custom:n(this.custom,4)})}translate(e,t,n){let r=this.positions;for(let i=0;i<r.length;i+=3)r[i]=r[i]+e,r[i+1]=r[i+1]+t,r[i+2]=r[i+2]+n;return this.computeBounds(),this}scale(e,t,n){let r=this.positions;for(let i=0;i<r.length;i+=3)r[i]=r[i]*e,r[i+1]=r[i+1]*t,r[i+2]=r[i+2]*n;let i=this.normals;if(i)for(let r=0;r<i.length;r+=3){let a=i[r]/e,o=i[r+1]/t,s=i[r+2]/n,c=Math.hypot(a,o,s)||1;a/=c,o/=c,s/=c,i[r]=a,i[r+1]=o,i[r+2]=s}return this.computeBounds(),this}rotateX(e){return this.rotateAbout(0,e)}rotateY(e){return this.rotateAbout(1,e)}rotateZ(e){return this.rotateAbout(2,e)}rotateAbout(e,t){let n=Math.cos(t),r=Math.sin(t),i=(e+1)%3,a=(e+2)%3;for(let e of[this.positions,this.normals])if(e)for(let t=0;t<e.length;t+=3){let o=e[t+i],s=e[t+a];e[t+i]=o*n-s*r,e[t+a]=o*r+s*n}return this.computeBounds(),this}static merge(t){let n=t.reduce((e,t)=>e+t.vertexCount,0),r=t.some(e=>e.normals),i=t.some(e=>e.uvs),a=t.some(e=>e.colors&&e.colors.length===e.vertexCount*4)?4:t.some(e=>e.colors)?3:0,o=new Float32Array(n*3),s=r?new Float32Array(n*3):void 0,c=i?new Float32Array(n*2):void 0,l=t.some(e=>e.custom)?new Float32Array(n*4):void 0,u=a?new Float32Array(n*a).fill(1):void 0,d=n>65535?new Uint32Array(t.reduce((e,t)=>e+t.indexCount,0)):new Uint16Array(t.reduce((e,t)=>e+t.indexCount,0)),f=0,p=0;for(let e of t){if(o.set(e.positions,f*3),s&&e.normals&&s.set(e.normals,f*3),c&&e.uvs&&c.set(e.uvs,f*2),l&&e.custom&&l.set(e.custom,f*4),u&&e.colors){let t=e.colors.length/e.vertexCount;if(t===a)u.set(e.colors,f*a);else for(let n=0;n<e.vertexCount;n++)for(let r=0;r<3;r++)u[(f+n)*a+r]=e.colors[n*t+r]}if(e.indices)for(let t=0;t<e.indices.length;t++)d[p++]=e.indices[t]+f;else for(let t=0;t<e.vertexCount;t++)d[p++]=f+t;f+=e.vertexCount}return new e({positions:o,normals:s,uvs:c,colors:u,custom:l,indices:d})}dispose(){this.disposed=!0,this.version++}};const a=new class e{constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}identity(){let e=this.elements;return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}clone(){return new e().copy(this)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}fromArray(e,t=0){let n=this.elements;for(let r=0;r<16;r++)n[r]=e[t+r];return this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],P=r[7],F=r[11],I=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*P,i[8]=a*C+o*D+s*j+c*F,i[12]=a*w+o*O+s*M+c*I,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*P,i[9]=l*C+u*D+d*j+f*F,i[13]=l*w+u*O+d*M+f*I,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*P,i[10]=p*C+m*D+h*j+g*F,i[14]=p*w+m*O+h*M+g*I,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*P,i[11]=_*C+v*D+y*j+b*F,i[15]=_*w+v*O+y*M+b*I,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15];return p*(i*s*u-r*c*u-i*o*d+n*c*d+r*o*f-n*s*f)+m*(t*s*f-t*c*d+i*a*d-r*a*f+r*c*l-i*s*l)+h*(t*c*u-t*o*f-i*a*u+n*a*f+i*o*l-n*c*l)+g*(-r*o*l-t*s*u+t*o*d+r*a*u-n*a*d+n*s*l)}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=u*h*c-m*d*c+m*s*f-o*h*f-u*s*g+o*d*g,v=p*d*c-l*h*c-p*s*f+a*h*f+l*s*g-a*d*g,y=l*m*c-p*u*c+p*o*f-a*m*f-l*o*g+a*u*g,b=p*u*s-l*m*s-p*o*d+a*m*d+l*o*h-a*u*h,x=t*_+n*v+r*y+i*b;if(x===0)return e.fill(0),this;let S=1/x;return e[0]=_*S,e[1]=(m*d*i-u*h*i-m*r*f+n*h*f+u*r*g-n*d*g)*S,e[2]=(o*h*i-m*s*i+m*r*c-n*h*c-o*r*g+n*s*g)*S,e[3]=(u*s*i-o*d*i-u*r*c+n*d*c+o*r*f-n*s*f)*S,e[4]=v*S,e[5]=(l*h*i-p*d*i+p*r*f-t*h*f-l*r*g+t*d*g)*S,e[6]=(p*s*i-a*h*i-p*r*c+t*h*c+a*r*g-t*s*g)*S,e[7]=(a*d*i-l*s*i+l*r*c-t*d*c-a*r*f+t*s*f)*S,e[8]=y*S,e[9]=(p*u*i-l*m*i-p*n*f+t*m*f+l*n*g-t*u*g)*S,e[10]=(a*m*i-p*o*i+p*n*c-t*m*c-a*n*g+t*o*g)*S,e[11]=(l*o*i-a*u*i-l*n*c+t*u*c+a*n*f-t*o*f)*S,e[12]=b*S,e[13]=(l*m*r-p*u*r+p*n*d-t*m*d-l*n*h+t*u*h)*S,e[14]=(p*o*r-a*m*r-p*n*s+t*m*s+a*n*h-t*o*h)*S,e[15]=(a*u*r-l*o*r+l*n*s-t*u*s-a*n*d+t*o*d)*S,this}makeBasis(e,t,n){let r=this.elements;return r[0]=e.x,r[1]=e.y,r[2]=e.z,r[3]=0,r[4]=t.x,r[5]=t.y,r[6]=t.z,r[7]=0,r[8]=n.x,r[9]=n.y,r[10]=n.z,r[11]=0,r[12]=0,r[13]=0,r[14]=0,r[15]=1,this}compose(e,t,n){let r=this.elements,i=t.x,a=t.y,o=t.z,s=t.w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements,i=Math.hypot(r[0],r[1],r[2]),o=Math.hypot(r[4],r[5],r[6]),s=Math.hypot(r[8],r[9],r[10]);this.determinant()<0&&(i=-i),e.x=r[12],e.y=r[13],e.z=r[14];let c=1/i,l=1/o,u=1/s,d=a.elements;return d[0]=r[0]*c,d[1]=r[1]*c,d[2]=r[2]*c,d[4]=r[4]*l,d[5]=r[5]*l,d[6]=r[6]*l,d[8]=r[8]*u,d[9]=r[9]*u,d[10]=r[10]*u,t.setFromRotationMatrix(a),n.x=i,n.y=o,n.z=s,this}};`${e}`,`${e}`;var o=class e{static __wrap(t){let n=Object.create(e.prototype);return n.__wbg_ptr=t,p.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){let e=this.__wbg_ptr;return this.__wbg_ptr=0,p.unregister(this),e}free(){let e=this.__destroy_into_raw();F.__wbg_carvedcells_free(e,0)}get dims(){let e=F.carvedcells_dims(this.__wbg_ptr);var t=_(e[0],e[1]).slice();return F.__wbindgen_free(e[0],e[1]*4,4),t}get origin(){let e=F.carvedcells_origin(this.__wbg_ptr);var t=g(e[0],e[1]).slice();return F.__wbindgen_free(e[0],e[1]*4,4),t}get roof(){let e=F.carvedcells_roof(this.__wbg_ptr);var t=v(e[0],e[1]).slice();return F.__wbindgen_free(e[0],e[1]*1,1),t}get solid(){let e=F.carvedcells_solid(this.__wbg_ptr);var t=v(e[0],e[1]).slice();return F.__wbindgen_free(e[0],e[1]*1,1),t}};Symbol.dispose&&(o.prototype[Symbol.dispose]=o.prototype.free);var s=class{__destroy_into_raw(){let e=this.__wbg_ptr;return this.__wbg_ptr=0,m.unregister(this),e}free(){let e=this.__destroy_into_raw();F.__wbg_clientsim_free(e,0)}addTile(e,t,n){let r=A(n,F.__wbindgen_malloc),i=P,a=F.clientsim_addTile(this.__wbg_ptr,e,t,r,i);if(a[1])throw N(a[0])}buildingNear(e,t,n,r){return F.clientsim_buildingNear(this.__wbg_ptr,e,t,n,r)!==0}carState(e){let t=F.clientsim_carState(this.__wbg_ptr,e);var n=h(t[0],t[1]).slice();return F.__wbindgen_free(t[0],t[1]*4,4),n}carveBuilding(e,t,n,r){let i=k(r,F.__wbindgen_malloc),a=P;F.clientsim_carveBuilding(this.__wbg_ptr,e,t,n,i,a)}castRay(e,t,n,r,i,a,o){let s=F.clientsim_castRay(this.__wbg_ptr,e,t,n,r,i,a,o);var c=h(s[0],s[1]).slice();return F.__wbindgen_free(s[0],s[1]*4,4),c}static controlsFor(e,t,n,r,i,a){let o=F.clientsim_controlsFor(e,t,n,r,i,a);var s=h(o[0],o[1]).slice();return F.__wbindgen_free(o[0],o[1]*4,4),s}cubeBlocked(e,t,n,r){return F.clientsim_cubeBlocked(this.__wbg_ptr,e,t,n,r)!==0}driveCar(e,t,n){let r=j(t,F.__wbindgen_malloc),i=P;F.clientsim_driveCar(this.__wbg_ptr,e,r,i,n)}fellTree(e,t,n){return F.clientsim_fellTree(this.__wbg_ptr,e,t,n)!==0}fits(e,t,n){return F.clientsim_fits(this.__wbg_ptr,e,t,n)!==0}constructor(e){let t=A(e,F.__wbindgen_malloc),n=P,r=F.clientsim_new(t,n);if(r[2])throw N(r[1]);return this.__wbg_ptr=r[0],m.register(this,this.__wbg_ptr,this),this}obstacleIds(){let e=F.clientsim_obstacleIds(this.__wbg_ptr);var t=_(e[0],e[1]).slice();return F.__wbindgen_free(e[0],e[1]*4,4),t}ragdollPose(e){let t=F.clientsim_ragdollPose(this.__wbg_ptr,e);var n=h(t[0],t[1]).slice();return F.__wbindgen_free(t[0],t[1]*4,4),n}refresh(){F.clientsim_refresh(this.__wbg_ptr)}removeObstacle(e){F.clientsim_removeObstacle(this.__wbg_ptr,e)}removeRagdoll(e){F.clientsim_removeRagdoll(this.__wbg_ptr,e)}removeTile(e,t){F.clientsim_removeTile(this.__wbg_ptr,e,t)}setCarState(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v,y){let b=A(v,F.__wbindgen_malloc),x=P;F.clientsim_setCarState(this.__wbg_ptr,e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_,b,x,y)}setConstructChunk(e,t,n,r){let i=A(r,F.__wbindgen_malloc),a=P;F.clientsim_setConstructChunk(this.__wbg_ptr,e,t,n,i,a)}setObstacle(e,t,n,r,i,a,o,s,c,l,u,d,f){F.clientsim_setObstacle(this.__wbg_ptr,e,t,n,r,i,a,o,s,c,l,u,d,f)}setRagdollTarget(e,t,n,r){F.clientsim_setRagdollTarget(this.__wbg_ptr,e,t,n,r)}setTick(e){F.clientsim_setTick(this.__wbg_ptr,e)}setTileGround(e,t,n){let r=k(n,F.__wbindgen_malloc),i=P;F.clientsim_setTileGround(this.__wbg_ptr,e,t,r,i)}spawnRagdoll(e,t,n,r,i,a,o,s,c,l,u,d){let f=j(t,F.__wbindgen_malloc),p=P;return F.clientsim_spawnRagdoll(this.__wbg_ptr,e,f,p,n,r,i,a,o,s,c,l,u,d)!==0}startCar(e,t,n,r,i,a){F.clientsim_startCar(this.__wbg_ptr,e,t,n,r,i,a)}stepCharacter(e,t,n,r,i,a,o,s,c,l,u,d){var f=M(e,F.__wbindgen_malloc),p=P;F.clientsim_stepCharacter(this.__wbg_ptr,f,p,e,t,n,r,i,a,o,s,c,l,u,d)}stepRagdolls(e){F.clientsim_stepRagdolls(this.__wbg_ptr,e)}stopCar(e){F.clientsim_stopCar(this.__wbg_ptr,e)}static waveAt(e,t,n){let r=F.clientsim_waveAt(e,t,n);var i=h(r[0],r[1]).slice();return F.__wbindgen_free(r[0],r[1]*4,4),i}static windAt(e,t,n){let r=F.clientsim_windAt(e,t,n);var i=h(r[0],r[1]).slice();return F.__wbindgen_free(r[0],r[1]*4,4),i}};Symbol.dispose&&(s.prototype[Symbol.dispose]=s.prototype.free);function c(e,t,n,r){let i=k(e,F.__wbindgen_malloc),a=P,o=k(t,F.__wbindgen_malloc),s=P,c=A(n,F.__wbindgen_malloc),l=P,u=A(r,F.__wbindgen_malloc),d=P,f=F.carve_baked_faces(i,a,o,s,c,l,u,d);var p=g(f[0],f[1]).slice();return F.__wbindgen_free(f[0],f[1]*4,4),p}function l(e,t){let n=k(e,F.__wbindgen_malloc),r=P,i=k(t,F.__wbindgen_malloc),a=P,s=F.carve_cut(n,r,i,a);return s===0?void 0:o.__wrap(s)}function u(e,t,n){let r=k(e,F.__wbindgen_malloc),i=P,a=k(t,F.__wbindgen_malloc),o=P,s=k(n,F.__wbindgen_malloc),c=P,l=F.carve_faces(r,i,a,o,s,c);var u=g(l[0],l[1]).slice();return F.__wbindgen_free(l[0],l[1]*4,4),u}function d(e,t,n,r,i,a,o){let s=k(e,F.__wbindgen_malloc),c=P,l=k(t,F.__wbindgen_malloc),u=P,d=A(n,F.__wbindgen_malloc),f=P,p=k(r,F.__wbindgen_malloc),m=P;return F.carve_nearest(s,c,l,u,d,f,p,m,i,a,o)}function f(e,t,n){let r=A(e,F.__wbindgen_malloc),i=P,a=F.carve_unpack(r,i,t,n);var o=v(a[0],a[1]).slice();return F.__wbindgen_free(a[0],a[1]*1,1),o}const p=typeof FinalizationRegistry>`u`?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>F.__wbg_carvedcells_free(e,1)),m=typeof FinalizationRegistry>`u`?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>F.__wbg_clientsim_free(e,1));function h(e,t){return e>>>=0,b().subarray(e/4,e/4+t)}function g(e,t){return e>>>=0,w().subarray(e/4,e/4+t)}function _(e,t){return e>>>=0,E().subarray(e/4,e/4+t)}function v(e,t){return e>>>=0,O().subarray(e/1,e/1+t)}let y=null;function b(){return(y===null||y.byteLength===0)&&(y=new Float32Array(F.memory.buffer)),y}let x=null;function S(){return(x===null||x.byteLength===0)&&(x=new Float64Array(F.memory.buffer)),x}let C=null;function w(){return(C===null||C.byteLength===0)&&(C=new Int32Array(F.memory.buffer)),C}let T=null;function E(){return(T===null||T.byteLength===0)&&(T=new Uint32Array(F.memory.buffer)),T}let D=null;function O(){return(D===null||D.byteLength===0)&&(D=new Uint8Array(F.memory.buffer)),D}function k(e,t){let n=t(e.length*4,4)>>>0;return E().set(e,n/4),P=e.length,n}function A(e,t){let n=t(e.length*1,1)>>>0;return O().set(e,n/1),P=e.length,n}function j(e,t){let n=t(e.length*4,4)>>>0;return b().set(e,n/4),P=e.length,n}function M(e,t){let n=t(e.length*8,8)>>>0;return S().set(e,n/8),P=e.length,n}function N(e){let t=F.__wbindgen_externrefs.get(e);return F.__externref_table_dealloc(e),t}new TextDecoder(`utf-8`,{ignoreBOM:!0,fatal:!0}).decode();let P=0,F;const I=(e,t,n)=>f(e,t,n),ee=(e,t,n)=>u(Int32Array.from(e),Uint32Array.from(t),n);var te=class e{origin;cell=72;dims;baked;solidFlags;roofFlags;constructor(e,t,n,r,i=null){this.origin=e,this.dims=t,this.solidFlags=n,this.roofFlags=r,this.baked=i}get solid(){return this.solidFlags??=I(this.baked.solid,this.count,this.dims[0]*this.dims[2])}get roofed(){return this.roofFlags??=I(this.baked.roof,this.count,this.dims[0]*this.dims[2])}get count(){return this.dims[0]*this.dims[1]*this.dims[2]}static fromCells(t){let[n,r,i]=t.dims,a=n*r*i;return a===0||a>8e6?null:new e([...t.origin],[n,r,i],null,null,t)}get flags(){return{origin:this.origin,dims:this.dims,solid:this.solid,roof:this.roofed}}static ofFlags(t){let[n,r,i]=t.origin,[a,o,s]=t.dims;return new e([n,r,i],[a,o,s],t.solid,t.roof)}static of(t,n){return e.ofFlat(t.flat(),n.flat())}static ofFlat(t,n){let r=l(Int32Array.from(t),Int32Array.from(n));if(!r)return null;try{let[t,n,i]=r.origin,[a,o,s]=r.dims;return new e([t,n,i],[a,o,s],r.solid,r.roof)}finally{r.free()}}isSolid(e){return this.solid[e]===1}isRoof(e){return this.roofed[e]===1}index(e,t,n){return(t*this.dims[2]+n)*this.dims[0]+e}coords(e){let t=e%this.dims[0],n=Math.floor(e/this.dims[0])%this.dims[2];return[t,Math.floor(e/(this.dims[0]*this.dims[2])),n]}centre(e){let t=e%this.dims[0],n=Math.floor(e/this.dims[0])%this.dims[2],r=Math.floor(e/(this.dims[0]*this.dims[2])),i=this.cell/2;return[this.origin[0]+t*this.cell+i,this.origin[1]+r*this.cell+i,this.origin[2]+n*this.cell+i]}get solidCount(){return this.cells.length}solidIds=null;get cells(){if(this.solidIds)return this.solidIds;let e=[];for(let t=this.solid.indexOf(1);t>=0;t=this.solid.indexOf(1,t+1))e.push(t);let t=new Int32Array(e);return this.solidIds=t}cellAt(e,t,n){let r=(e,t)=>Math.min(this.dims[e]-1,Math.max(0,Math.floor((t*100-this.origin[e])/this.cell)));return this.index(r(0,e),r(1,t),r(2,n))}nearestCell(e,t,n,r){let i=r?Uint32Array.from(r):/* @__PURE__ */ new Uint32Array,a=d(Int32Array.from(this.origin),Uint32Array.from(this.dims),this.solid,i,Math.round(e*100),Math.round(t*100),Math.round(n*100));return a<0?null:a}clusters(e,t){let n=new Set(e),r=[];for(let i of[...e].sort((e,t)=>e-t)){if(!n.has(i))continue;n.delete(i);let e=[i];for(let r=0;r<e.length&&e.length<t;r++){let i=e[r],a=i%this.dims[0],o=Math.floor(i/this.dims[0])%this.dims[2],s=Math.floor(i/(this.dims[0]*this.dims[2]));for(let r=-1;r<=1&&e.length<t;r++)for(let i=-1;i<=1&&e.length<t;i++)for(let c=-1;c<=1&&e.length<t;c++){let[t,l,u]=[a+c,s+r,o+i];if(t<0||l<0||u<0||t>=this.dims[0]||l>=this.dims[1]||u>=this.dims[2])continue;let d=this.index(t,l,u);n.has(d)&&(n.delete(d),e.push(d))}}r.push(e)}return r}whole=null;faces(e){return this.facesWithRoof(e).tris}facesWithRoof(e){if(e.size===0&&this.whole)return this.whole;if(e.size===0&&this.baked){let e=c(Int32Array.from(this.origin),Uint32Array.from(this.dims),this.baked.solid,this.baked.roof),t=e.length/10;return this.whole={tris:e.subarray(0,t*9),roof:Uint8Array.from(e.subarray(t*9))}}let t=new Int32Array(this.solid.length).fill(-1);for(let n of this.cells)e.has(n)||(t[n]=this.roofed[n]);let n=ee(this.origin,this.dims,t),r=n.length/10,i=new Int32Array(r*9),a=new Uint8Array(r);for(let e=0,t=0,o=0;e<r;e++,t++){for(let e=0;e<9;e++)i[o++]=n[t++];a[e]=n[t]}let o={tris:i,roof:a};return e.size===0&&(this.whole=o),o}};const ne=2.8,re=.9,L=1.3,R=.35,ie=2.1,ae=.025,oe=.09,z=.2,B=[.86,.84,.78],se=[.11,.06,.035],ce=[.7,.68,.63];function le(e,t){let{vertices:n,triangles:r}=e,i=e=>[n[e*3],n[e*3+1],n[e*3+2]],a=/* @__PURE__ */ new Map;for(let e=t.first;e<t.first+t.walls;e++){let[t,n,o]=[i(r[e*3]),i(r[e*3+2]),i(r[e*3+1])],s=[n[0]-t[0],n[1]-t[1],n[2]-t[2]],c=[o[0]-t[0],o[1]-t[1],o[2]-t[2]],l=[s[1]*c[2]-s[2]*c[1],s[2]*c[0]-s[0]*c[2],s[0]*c[1]-s[1]*c[0]],u=Math.hypot(...l);if(u<1e-6||(l=[l[0]/u,l[1]/u,l[2]/u],Math.abs(l[1])>.1))continue;let d=Math.hypot(l[0],l[2]);l=[l[0]/d,0,l[2]/d];let f=l[0]*t[0]+l[2]*t[2],p=`${Math.round(Math.atan2(l[2],l[0])*100)},${Math.round(f*10)}`,m=a.get(p);m||(m={normal:l,u:[-l[2],0,l[0]],tris:[],u0:1/0,u1:-1/0,v0:1/0,v1:-1/0,d:f},a.set(p,m));let h=[t,n,o].map(e=>[e[0]*m.u[0]+e[2]*m.u[2],e[1]]);m.tris.push(h);for(let[e,t]of h)m.u0=Math.min(m.u0,e),m.u1=Math.max(m.u1,e),m.v0=Math.min(m.v0,t),m.v1=Math.max(m.v1,t)}let o=(e,t,n)=>e.tris.some(([e,r,i])=>{let a=(e,r)=>(r[0]-e[0])*(n-e[1])-(r[1]-e[1])*(t-e[0]),[o,s,c]=[a(e,r),a(r,i),a(i,e)];return o>=0&&s>=0&&c>=0||o<=0&&s<=0&&c<=0}),s=(e,t,n,r,i)=>[[t-R,r-R],[n+R,r-R],[n+R,i+R],[t-R,i+R]].every(([t,n])=>o(e,t,n)),c=[...a.values()].sort((e,t)=>e.u1-e.u0===t.u1-t.u0?e.d-t.d:t.u1-t.u0-(e.u1-e.u0)),l=[];return c.forEach((e,t)=>{let n=e.u1-e.u0;if(n<1.7)return;let r=Math.max(1,Math.round(n/2.8)),i=n/r,a=(t,n)=>[e.u[0]*t+e.normal[0]*e.d,n,e.u[2]*t+e.normal[2]*e.d],o=(t,n,r,i,o)=>l.push({corners:[a(t,r),a(n,r),a(n,i),a(t,i)],normal:e.normal,door:o});for(let n=0;e.v0+re+n*ne+L+R<=e.v1;n++){let a=e.v0+re+n*ne;for(let c=0;c<r;c++){let l=e.u0+(c+.5)*i;if(t===0&&n===0&&c===Math.floor(r/2)&&s(e,l-1/2,l+1/2,e.v0+R,e.v0+ie)){o(l-1/2,l+1/2,e.v0+.02,e.v0+ie,!0);continue}let[u,d]=[l-1/2,l+1/2];s(e,u,d,a,a+L)&&o(u,d,a,a+L,!1)}}}),l}const ue=/* @__PURE__ */ new WeakMap;function de(e,t){let n=ue.get(e);n||(n=/* @__PURE__ */ new Map,ue.set(e,n));let r=n.get(t.first);return r||(r=le(e,t),n.set(t.first,r)),r}function fe(e,t){for(let{corners:n,normal:r,door:i}of e){let[e,,a]=n,o=[n[1][0]-e[0],0,n[1][2]-e[2]],s=Math.hypot(o[0],o[2])||1,[c,l]=[o[0]/s,o[2]/s],u=(t,i,o=i)=>{let s=(e,n,i)=>[e[0]+c*n+r[0]*t,e[1]+i,e[2]+l*n+r[2]*t];return[s(e,-i,-o),s(n[1],i,-o),s(a,i,i),s(n[3],-i,i)]};if(i){t(u(ae,oe,0),B,r),t(u(.04,0),se,r);continue}let d=u(ae,oe),f=u(ae,0);for(let e=0;e<4;e++)t([d[e],d[(e+1)%4],f[(e+1)%4],f[e]],B,r);let p=e=>[e[0]-r[0]*z,e[1],e[2]-r[2]*z],m=[[0,1,0],[-c,0,-l],[0,-1,0],[c,0,l]];for(let e=0;e<4;e++){let[r,i]=[n[e],n[(e+1)%4]];t([r,i,p(i),p(r)],ce,m[e])}}}function V(e,t){let[n,r,i]=e,a=[i[0]-r[0],i[1]-r[1],i[2]-r[2]],o=[n[0]-r[0],n[1]-r[1],n[2]-r[2]],s=[a[1]*o[2]-a[2]*o[1],a[2]*o[0]-a[0]*o[2],a[0]*o[1]-a[1]*o[0]];return s[0]*t[0]+s[1]*t[1]+s[2]*t[2]>=0?e:[e[3],e[2],e[1],e[0]]}const pe=1e-4;function H(e,t,n,r){let i=Math.sin(e*127.1+t*311.7+n*74.7+r*19.19)*43758.5453;return i-Math.floor(i)}function U(e){return`${Math.round(e[0]*1e3)},${Math.round(e[1]*1e3)},${Math.round(e[2]*1e3)}`}function W(e,t){let[n,r]=[U(e),U(t)];return n<r?`${n}|${r}`:`${r}|${n}`}function me(e,t,n){let r=[],i=[],a=e=>e[t]-n>pe?1:e[t]-n<-1e-4?-1:0,o=!0;for(let s=0;s<e.length;s++){let c=e[s],l=e[(s+1)%e.length],[u,d]=[a(c),a(l)];if(u!==0&&(o=!1),u<=0&&r.push(c),u>=0&&i.push(c),u*d<0){let e=(n-c[t])/(l[t]-c[t]),a=[c[0]+(l[0]-c[0])*e,c[1]+(l[1]-c[1])*e,c[2]+(l[2]-c[2])*e];a[t]=n,r.push(a),i.push([...a])}}return o?[[],e]:[r.length>=3?r:[],i.length>=3?i:[]]}function G(e){let[t,n,r]=[0,0,0];for(let i=0;i<e.length;i++){let a=e[i],o=e[(i+1)%e.length];t+=(a[1]-o[1])*(a[2]+o[2]),n+=(a[2]-o[2])*(a[0]+o[0]),r+=(a[0]-o[0])*(a[1]+o[1])}let i=Math.hypot(t,n,r)||1;return[t/i,n/i,r/i]}function K(e){let t=[0,0,0];for(let n of e)for(let r=0;r<3;r++)t[r]+=n[r]/e.length;return t}const q=(e,t,n=1)=>[e[0]+t[0]*n,e[1]+t[1]*n,e[2]+t[2]*n],J=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],Y=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],X=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Z=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},Q=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n];function he(e,t,n){let r=[],i=[],a=e=>Y(e,t)-n>pe?1:Y(e,t)-n<-1e-4?-1:0,o=!0;for(let s=0;s<e.length;s++){let c=e[s],l=e[(s+1)%e.length],[u,d]=[a(c),a(l)];if(u!==0&&(o=!1),u<=0&&r.push(c),u>=0&&i.push(c),u*d<0){let e=(n-Y(c,t))/(Y(l,t)-Y(c,t)),a=Q(c,l,e);r.push(a),i.push([...a])}}return o?[[],e]:[r.length>=3?r:[],i.length>=3?i:[]]}function ge(e){let t=e.length;if(t<3)return[];let n=0;for(let r=0;r<t;r++){let[i,a]=e[r],[o,s]=e[(r+1)%t];n+=i*s-o*a}let r=n>=0?1:-1,i=[...Array(t).keys()],a=[],o=(t,n,r)=>{let[i,a]=e[t],[o,s]=e[n],[c,l]=e[r];return(o-i)*(l-a)-(s-a)*(c-i)},s=(e,t,n,i)=>{let[a,s,c]=[o(e,t,i)*r,o(t,n,i)*r,o(n,e,i)*r];return a>=-1e-9&&s>=-1e-9&&c>=-1e-9},c=0;for(;i.length>3&&c++<t*t;){let e=!1;for(let t=0;t<i.length;t++){let[n,c,l]=[i[(t+i.length-1)%i.length],i[t],i[(t+1)%i.length]];if(!(o(n,c,l)*r<=1e-9)&&!i.some(e=>e!==n&&e!==c&&e!==l&&s(n,c,l,e))){a.push(n,c,l),i.splice(t,1),e=!0;break}}if(!e)break}if(i.length===3)a.push(i[0],i[1],i[2]);else for(let e=1;e+1<i.length;e++)a.push(i[0],i[e],i[e+1]);return a}const _e=B,ve=[B[0]*.8,B[1]*.8,B[2]*.8];function ye(e,t){let{vertices:n,triangles:r}=e,i=e=>[n[e*3],n[e*3+1],n[e*3+2]],a=e=>[i(r[e*3]),i(r[e*3+2]),i(r[e*3+1])],o=/* @__PURE__ */ new Map;for(let e=t.first+t.walls;e<t.first+t.walls+t.roof;e++){let t=a(e),n=G(t);if(Math.abs(n[1])>.9995||Math.abs(n[1])<.05)continue;n[1]<0&&(n=[-n[0],-n[1],-n[2]]);let r={normal:n,centre:K(t)};for(let e=0;e<3;e++){let[n,i]=[t[e],t[(e+1)%3]],a=W(n,i),s=o.get(a);s?s.count++:o.set(a,{a:n,b:i,tri:r,count:1})}}let s=[];for(let e=t.first;e<t.first+t.walls;e++){let t=a(e),n=G(t);if(Math.abs(n[1])>.1)continue;let r=Math.hypot(n[0],n[2])||1;n=[n[0]/r,0,n[2]/r];let i=[-n[2],0,n[0]],o=t.map(e=>Y(e,i));s.push({n,d:Y(t[0],n),u:i,u0:Math.min(...o),u1:Math.max(...o),low:Math.min(t[0][1],t[1][1],t[2][1])})}let c=[];for(let{a:e,b:t,tri:n,count:r}of o.values()){if(r!==1||Math.hypot(t[0]-e[0],t[1]-e[1],t[2]-e[2])<.05)continue;let i=Math.min(e[1],t[1]),a=s.find(n=>{if(Math.abs(Y(e,n.n)-n.d)>.02||Math.abs(Y(t,n.n)-n.d)>.02)return!1;let[r,a]=[Y(e,n.u),Y(t,n.u)];return Math.min(r,a)>n.u1-.01||Math.max(r,a)<n.u0+.01?!1:n.low<i-.3});if(!a)continue;let o=Q(e,t,.5),l=[a.n[0],0,a.n[2]];Y(l,J(o,n.centre))<0&&(l=[-l[0],0,-l[2]]),c.push({a:e,b:t,out:l,normal:n.normal,offset:Math.abs(e[1]-t[1])<.02?.4:.25})}if(c.length===0)return[];let l=/* @__PURE__ */ new Map;for(let e of c)for(let t of[e.a,e.b]){let n=U(t),r=l.get(n)??[];r.push(e),l.set(n,r)}let u=(e,t,n,r)=>{let i=0;for(let{normal:a}of r)i+=(e[1]-(a[0]*t+a[2]*n)/a[1])/r.length;return[e[0]+t,i,e[2]+n]},d=/* @__PURE__ */ new Map;for(let[e,t]of l){let n=U(t[0].a)===e?t[0].a:t[0].b,[r,i]=[t[0],t[1]],[a,o]=[r.out[0]*r.offset,r.out[2]*r.offset];if(i){let[e,t]=[r.out,i.out],n=e[0]*t[2]-e[2]*t[0];if(Math.abs(n)>=.05){a=(r.offset*t[2]-i.offset*e[2])/n,o=(i.offset*e[0]-r.offset*t[0])/n;let s=2.5*Math.max(r.offset,i.offset),c=Math.hypot(a,o);c>s&&([a,o]=[a/c*s,o/c*s])}}d.set(e,u(n,a,o,t.slice(0,2)))}let f=[0,.15,0],p=[];for(let e of c){let{a:t,b:n,out:r,normal:i,offset:a}=e,[o,s]=[d.get(U(t)),d.get(U(n))],c=Math.max(1,Math.ceil(Math.hypot(n[0]-t[0],n[1]-t[1],n[2]-t[2])/1)),m=i=>{if(i<=0)return o;if(i>=1)return s;let c=Q(t,n,i);return u(c,r[0]*a,r[2]*a,[e])};for(let e=0;e<c;e++){let[a,o]=[e/c,(e+1)/c],[s,u]=[Q(t,n,a),Q(t,n,o)],[d,h]=[m(a),m(o)],g=[{corners:V([s,u,h,d],i),part:`top`},{corners:V([d,h,J(h,f),J(d,f)],r),part:`fascia`},{corners:V([J(d,f),J(h,f),J(u,f),J(s,f)],[-i[0],-i[1],-i[2]]),part:`soffit`}],_=Z(J(n,t));e===0&&l.get(U(t)).length===1&&g.push({corners:V([s,d,J(d,f),J(s,f)],[-_[0],-_[1],-_[2]]),part:`cap`}),e===c-1&&l.get(U(n)).length===1&&g.push({corners:V([u,h,J(h,f),J(u,f)],_),part:`cap`}),p.push({a:s,b:u,out:r,roofNormal:i,mid:Q(s,u,.5),quads:g})}}return p.length>400?[]:p}const be=/* @__PURE__ */ new WeakMap;function xe(e,t){let n=be.get(e);n||(n=/* @__PURE__ */ new Map,be.set(e,n));let r=n.get(t.first);return r||(r=ye(e,t),n.set(t.first,r)),r}function Se(e){return q(q(e.mid,e.out,-.1),e.roofNormal,-.02)}const Ce=z,we=.18,Te=[.07,.05,.035];function Ee(e,t){let{vertices:n,triangles:r}=e,i=e=>[n[e*3],n[e*3+1],n[e*3+2]],a=e=>[i(r[e*3]),i(r[e*3+2]),i(r[e*3+1])],o=[];for(let e=t.first;e<t.first+t.walls;e++)o.push(a(e));let s=[];for(let e=t.first+t.walls;e<t.first+t.walls+t.roof;e++)s.push(a(e));for(let n of de(e,t))n.door||(o=De(o,n));return{walls:o,roof:s,floor:Oe(o)}}function De(e,t){let[n,r,,i]=t.corners,a=t.normal,o=Z([r[0]-n[0],0,r[2]-n[2]]),s=Y(n,a),[c,l]=[Y(n,o),Y(r,o)],[u,d]=[n[1],i[1]],f=[];for(let t of e){let e=G(t);if(Y(e,a)<.999||Math.abs(Y(t[0],a)-s)>.03){f.push(t);continue}let n=[t];for(let[e,t]of[[o,c],[o,l],[[0,1,0],u],[[0,1,0],d]]){let r=[];for(let i of n)for(let n of he(i,e,t))n.length>=3&&r.push(n);n=r}for(let e of n){let t=K(e),[n,r]=[Y(t,o),t[1]];n>c&&n<l&&r>u&&r<d||f.push(e)}}return f}function Oe(e){let t=1/0;for(let n of e)for(let e of n)t=Math.min(t,e[1]);if(!Number.isFinite(t))return[];let n=/* @__PURE__ */ new Map,r=/* @__PURE__ */ new Map;for(let i of e)for(let e=0;e<i.length;e++){let[a,o]=[i[e],i[(e+1)%i.length]];if(Math.abs(a[1]-t)>.05||Math.abs(o[1]-t)>.05||Math.hypot(o[0]-a[0],o[2]-a[2])<.01)continue;let s=U(a);n.has(s)||(n.set(s,o),r.set(s,a))}let i=[],a=/* @__PURE__ */ new Set;for(let e of n.keys()){if(a.has(e))continue;let o=[],s=e,c=!1;for(;!a.has(s);){a.add(s),o.push(r.get(s));let t=n.get(s);if(!t)break;s=U(t),s===e&&(c=!0)}if(!c||o.length<3)continue;let l=ge(o.map(e=>[e[0],e[2]]));for(let e=0;e+2<l.length;e+=3){let n=[l[e],l[e+1],l[e+2]].map(e=>q(o[e],[0,1,0],t-o[e][1]+.45));G(n)[1]<0&&n.reverse(),i.push(n)}}return i}function ke(e,t){return e.map(e=>J(e,[t[0]*Ce,t[1]*Ce,t[2]*Ce])).reverse()}const Ae=/* @__PURE__ */ new WeakMap;function je(e,t){let n=Ae.get(e);n||(n=/* @__PURE__ */ new Map,Ae.set(e,n));let r=n.get(t.first);return r||(r=Ee(e,t),n.set(t.first,r)),r}const Me={wall:0,roof:0},Ne=[.07,.11],Pe=[.25,.75],Fe=[.13,.075,.04],Ie=[.035,.02],Le=[.08,.32],Re=[.5,.36,.2],ze=[.16,.38],Be=.028,$=.22,Ve=/* @__PURE__ */ new Set([1,2]),He=/* @__PURE__ */ new Set([3,4,8]),Ue=/* @__PURE__ */ new Set([5,9]),We=[.22,.33],Ge=.22,Ke=.38,qe=[.55,.5,.44];var Je=class{shell;cell;origin;constructor(e){this.shell=e,this.cell=e.cell/100,this.origin=e.origin.map(e=>e/100)}of(e,t){return Math.floor((e-this.origin[t])/this.cell)}has(e,t,n){let r=this.shell.dims;return e>=0&&t>=0&&n>=0&&e<r[0]&&t<r[1]&&n<r[2]}},Ye=class e{grid;cells=/* @__PURE__ */ new Map;constructor(e){this.grid=e}add(t,n,r){let i=[1/0,1/0,1/0],a=[-1/0,-1/0,-1/0];for(let e of n)for(let t=0;t<3;t++)i[t]=Math.min(i[t],e[t]),a[t]=Math.max(a[t],e[t]);let o=this.grid,[s,c,l]=[0,1,2].map(e=>o.of(i[e]-r,e)),[u,d,f]=[0,1,2].map(e=>o.of(a[e]+r,e));for(let n=c;n<=d;n++)for(let r=l;r<=f;r++)for(let i=s;i<=u;i++){let a=e.key(i,n,r),o=this.cells.get(a);o?o.push(t):this.cells.set(a,[t])}}at(t){let n=this.grid;return this.cells.get(e.key(n.of(t[0],0),n.of(t[1],1),n.of(t[2],2)))??[]}static key(e,t,n){return((e+4096)*8192+(t+4096))*8192+(n+4096)}};function Xe(e,t,n,r){let{cell:i,origin:a,shell:o}=t,s=[],c=[],l=[...e.walls.map(e=>[e,!1]),...e.roof.map(e=>[e,!0])];for(let[e,r]of l){let i={poly:e,normal:G(e),roof:r},a=[0,1,2].map(n=>t.of(Math.min(...e.map(e=>e[n])),n)-2),o=[0,1,2].map(n=>t.of(Math.max(...e.map(e=>e[n])),n)+2);(n.some(e=>e[0]>=a[0]&&e[0]<=o[0]&&e[1]>=a[1]&&e[1]<=o[1]&&e[2]>=a[2]&&e[2]<=o[2])?c:s).push(i)}let u=[],d=[];for(let e of c){let n=[e.poly];for(let t=0;t<3;t++){let r=1/0,o=-1/0;for(let n of e.poly)r=Math.min(r,n[t]),o=Math.max(o,n[t]);for(let e=Math.floor((r-a[t])/i)+1;a[t]+e*i<o;e++){let r=a[t]+e*i,o=[];for(let e of n)for(let n of me(e,t,r))n.length>=3&&o.push(n);n=o}}for(let i of n){let n=[0,0,0];for(let e of i)for(let t=0;t<3;t++)n[t]+=e[t]/i.length;let[a,s,c]=[0,1,2].map(r=>t.of(n[r]-e.normal[r]*.01,r));(t.has(a,s,c)&&r(o.index(a,s,c))||Ze(t,a,s,c,r)?d:u).push({poly:i,normal:e.normal,roof:e.roof})}}return{whole:s,kept:u,taken:d}}function Ze(e,t,n,r,i){let a=e.shell;if(e.has(t,n,r)&&a.isSolid(a.index(t,n,r)))return!1;let o=!1;for(let s=-1;s<=1;s++)for(let c=-1;c<=1;c++)for(let l=-1;l<=1;l++){let[u,d,f]=[t+l,n+s,r+c];if(!e.has(u,d,f))continue;let p=a.index(u,d,f);if(a.isSolid(p)){if(!i(p))return!1;o=!0}}return o}function Qe(e){let t=e.filter(e=>!e.door).map(e=>{let[t,n,,r]=e.corners,i=Z([n[0]-t[0],0,n[2]-t[2]]);return{n:e.normal,d:Y(t,e.normal),along:i,u:[Y(t,i),Y(n,i)],v:[t[1],r[1]]}}),n=.015,r=(e,t)=>{if(Math.abs(Y(e,t.n)-t.d)>n)return!1;let[r,i]=[Y(e,t.along),e[1]],a=r>t.u[0]-n&&r<t.u[1]+n,o=i>t.v[0]-n&&i<t.v[1]+n;return a&&(Math.abs(i-t.v[0])<n||Math.abs(i-t.v[1])<n)||o&&(Math.abs(r-t.u[0])<n||Math.abs(r-t.u[1])<n)};return(e,n)=>{let i=[(e[0]+n[0])/2,(e[1]+n[1])/2,(e[2]+n[2])/2];return t.some(t=>r(e,t)&&r(n,t)&&r(i,t))}}function $e(e,t,n){if(n.size===0)return[...e];let{cell:r,origin:i,shell:a}=t,o=[...n].map(e=>a.coords(e)),s=/* @__PURE__ */ new Map,c=(e,r)=>{let i=`${e},${r}`,o=s.get(i);if(o!==void 0)return o;o=!1;for(let i=-1;i<=1&&!o;i++)for(let s=-1;s<=1&&!o;s++)for(let c=0;c<a.dims[1];c++){if(!t.has(e+i,c,r+s))continue;let l=a.index(e+i,c,r+s);if(a.isSolid(l)&&!n.has(l)){o=!0;break}}return s.set(i,o),o},l=[];for(let n of e){let e=[0,2].map(e=>t.of(Math.min(...n.map(t=>t[e])),e)-2),a=[0,2].map(e=>t.of(Math.max(...n.map(t=>t[e])),e)+2);if(!o.some(t=>t[0]>=e[0]&&t[0]<=a[0]&&t[2]>=e[1]&&t[2]<=a[1])){l.push(n);continue}let s=[n];for(let e of[0,2]){let[t,a]=[Math.min(...n.map(t=>t[e])),Math.max(...n.map(t=>t[e]))];for(let n=Math.floor((t-i[e])/r)+1;i[e]+n*r<a;n++){let t=i[e]+n*r,a=[];for(let n of s)for(let r of me(n,e,t))r.length>=3&&a.push(r);s=a}}for(let e of s){let n=K(e);c(t.of(n[0],0),t.of(n[2],2))&&l.push(e)}}return l}function et(e,t,n,r=()=>!1){let i=/* @__PURE__ */ new Map;for(let{poly:e}of t)for(let t=0;t<e.length;t++){let n=W(e[t],e[(t+1)%e.length]);i.set(n,(i.get(n)??0)+1)}let a=[];t.forEach(({poly:e},t)=>{for(let n=0;n<e.length;n++){let[o,s]=[e[n],e[(n+1)%e.length]];i.get(W(o,s))===1&&!r(o,s)&&a.push({a:o,b:s,piece:t})}});let o=new Ye(e);for(let e of a)o.add(e,[e.a,e.b],.02);let s=(e,t,n)=>{let r=[(e[0]+t[0])/2,(e[1]+t[1])/2,(e[2]+t[2])/2],i=Z(J(t,e));for(let e of o.at(r)){if(e.piece===n)continue;let t=J(e.b,e.a),a=Math.hypot(...t);if(a<1e-6||Math.abs(Y(t,i))<a*.9999)continue;let o=t.map(e=>e/a),s=J(r,e.a),c=Y(s,o);if(!(c<-.01||c>a+.01)&&Math.hypot(s[0]-o[0]*c,s[1]-o[1]*c,s[2]-o[2]*c)<.01)return!0}return!1},c=[],l=/* @__PURE__ */ new Set,u=new Ye(e);for(let{a:e,b:n,piece:r}of a){if(s(e,n,r))continue;let{poly:i,normal:a,roof:o}=t[r],d=K(i),f=[0,1,2].map(t=>d[t]-(e[t]+n[t])/2),p=f[0]*a[0]+f[1]*a[1]+f[2]*a[2],m=[0,1,2].map(e=>f[e]-a[e]*p),h=Math.hypot(...m)||1;c.push({a:e,b:n,normal:a,roof:o,inward:m.map(e=>e/h)}),l.add(U(e)),l.add(U(n)),u.add(!0,[e,n],.01)}let d=/* @__PURE__ */ new Map;for(let{poly:e,normal:t}of n)for(let n of e){if(u.at(n).length===0)continue;let e=U(n);if(!l.has(e))continue;let r=d.get(e)??[];r.some(e=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2]>.999)||r.push(t),d.set(e,r)}let f=/* @__PURE__ */ new Map;for(let[e,t]of d){if(t.length!==1)continue;let n=t[0],r=e.split(`,`).map(Number),i=Math.abs(n[1])>.9?[1,0,0]:[0,1,0],a=[n[1]*i[2]-n[2]*i[1],n[2]*i[0]-n[0]*i[2],n[0]*i[1]-n[1]*i[0]],o=Math.hypot(...a)||1,s=[n[1]*a[2]-n[2]*a[1],n[2]*a[0]-n[0]*a[2],n[0]*a[1]-n[1]*a[0]],[c,l]=[(H(r[0],r[1],r[2],1)-.5)*2*Ge,(H(r[0],r[1],r[2],2)-.5)*2*Ge];f.set(e,[0,1,2].map(e=>r[e]/1e3+a[e]/o*c+s[e]/o*l))}return{rims:c,place:e=>f.size>0&&u.at(e).length>0?f.get(U(e))??e:e}}var tt=class{place;offset;positions=[];colors=[];custom=[];surface=0;constructor(e,t=[0,0,0]){this.place=e,this.offset=t}poly(e,t,n,r=!1){let i=r?e:e.map(this.place),a=n?i.map(e=>n(e)):null;for(let e=1;e+1<i.length;e++)this.corner(i[0],t,a?a[0]:1),this.corner(i[e],t,a?a[e]:1),this.corner(i[e+1],t,a?a[e+1]:1)}corner(e,t,n){let[r,i,a]=this.offset;this.positions.push(e[0]-r,e[1]-i,e[2]-a),this.colors.push(t[0]*n,t[1]*n,t[2]*n),this.custom.push(this.surface,0,0,0)}rims(e,t,n,r){let i=e=>[0,1,2].map(t=>(e[t]*.44999999999999996+qe[t]*.55)*.72),[a,o]=[i(t),i(n)];for(let{a:t,b:n,normal:i,roof:s}of e){let e=s?.16:.3,[c,l]=[this.place(t),this.place(n)],[u,d]=[c,l].map(t=>[t[0]-i[0]*e,t[1]-i[1]*e,t[2]-i[2]*e]);this.poly([c,l,d,u],s?o:a,r,!0)}}soup(){return{positions:Float32Array.from(this.positions),colors:Float32Array.from(this.colors),custom:Float32Array.from(this.custom)}}};function nt(e,t,n,r,i,a,o,s=Me){let c=new Je(n),{cell:l,origin:u}=c,d=[...r,...i.keys()].map(e=>n.coords(e)),f=je(e,t),p=de(e,t),{whole:m,kept:h,taken:g}=Xe(f,c,d,e=>r.has(e)),{rims:_,place:v}=et(c,g,[...h,...g],Qe(p)),[y,b,x]=n.dims,S=new Uint8Array(y*b*x),C=new Uint8Array(y*b*x);for(let e of r){S[e]=1;let[t,r,i]=n.coords(e);for(let e=-2;e<=2;e++)for(let a=-2;a<=2;a++)for(let o=-2;o<=2;o++)c.has(t+o,r+e,i+a)&&(C[n.index(t+o,r+e,i+a)]=1)}let w=e=>{let[t,r,i]=[c.of(e[0],0),c.of(e[1],1),c.of(e[2],2)];if(c.has(t,r,i)&&C[n.index(t,r,i)]===0)return 1;let[a,o,s,d]=[1/0,0,0,0];for(let n=Math.max(0,r-2);n<=Math.min(b-1,r+2);n++)for(let r=Math.max(0,i-2);r<=Math.min(x-1,i+2);r++)for(let i=Math.max(0,t-2);i<=Math.min(y-1,t+2);i++){if(S[(n*x+r)*y+i]===0)continue;let[t,c,f]=[u[0]+(i+.5)*l-e[0],u[1]+(n+.5)*l-e[1],u[2]+(r+.5)*l-e[2]],p=t*t+c*c+f*f;p<a&&([a,o,s,d]=[p,t,c,f])}if(a===1/0)return 1;let f=Math.max(0,Math.min(1,(1.7-Math.hypot(o,s,d))/1.25));return f=Math.min(1,f*(.6+.8*H(e[0],e[1],e[2],3))),1-f*.88},T=new tt(v);for(let e of m)T.surface=e.roof?s.roof:s.wall,T.poly(e.poly,e.roof?o:a,void 0,!0);for(let e of h)T.surface=e.roof?s.roof:s.wall,T.poly(e.poly,e.roof?o:a,w);T.surface=0;let E=e=>[e[0]*we,e[1]*we,e[2]*we];for(let e of m)T.poly(ke(e.poly,e.normal),E(e.roof?o:a),w,!0);for(let e of h)T.poly(ke(e.poly.map(v),e.normal),E(e.roof?o:a),w,!0);for(let e of $e(f.floor,c,r))T.poly(e,Te,void 0,!0);T.rims(_,a,o,w);for(let i of xe(e,t)){let e=Se(i),[t,a,l]=[0,1,2].map(t=>c.of(e[t],t));if(!(c.has(t,a,l)&&r.has(n.index(t,a,l))))for(let{corners:e,part:t}of i.quads)T.surface=t===`top`?s.roof:0,T.poly(e,t===`top`?o:t===`soffit`?ve:_e,w,!0)}T.surface=0;let D=null;if(at(T,_,s,a,o,(e,t)=>{if(!D){D=new Ye(c);for(let e of[...m,...h])D.add(e,e.poly,.035)}return D.at(e).some(n=>{if(Y(n.normal,t)<.999)return!1;let r=n.poly;if(Math.abs(Y([e[0]-r[0][0],e[1]-r[0][1],e[2]-r[0][2]],t))>.03)return!1;let i=0;for(let n=0;n<r.length;n++){let[a,o]=[r[n],r[(n+1)%r.length]],s=Y(X([o[0]-a[0],o[1]-a[1],o[2]-a[2]],[e[0]-a[0],e[1]-a[1],e[2]-a[2]]),t);if(!(Math.abs(s)<1e-9)){if(i===0)i=Math.sign(s);else if(Math.sign(s)!==i)return!1}}return!0})}),i.size>0){let e=/* @__PURE__ */ new Map;for(let t of h){let r=[0,0,0];for(let e of t.poly)for(let n=0;n<3;n++)r[n]+=e[n]/t.poly.length;let[a,o,s]=[0,1,2].map(e=>c.of(r[e]-t.normal[e]*.01,e));if(!c.has(a,o,s))continue;let l=n.index(a,o,s);i.has(l)&&!e.has(l)&&e.set(l,t)}for(let[t,n]of i){let r=e.get(t);r&&st(T,r,t,Math.min(6,Math.ceil(n/40*6)),r.roof?o:a)}}return fe(r.size===0?p:p.filter(e=>rt(n,r,e)),(e,t)=>T.poly(e,t,w,!0)),T.soup()}function rt(e,t,n){let r=new Je(e),i=e=>t.has(e),[a,o,s,c]=n.corners,l=n.normal,u=Z([o[0]-a[0],0,o[2]-a[2]]),d=(e,t)=>[(e[0]+t[0])/2,(e[1]+t[1])/2,(e[2]+t[2])/2],f=[q(d(a,o),[0,-1,0],.05),q(d(o,s),u,.05),q(d(s,c),[0,1,0],.05),q(d(c,a),u,-.05)],p=d(d(a,o),d(s,c)),m=[p,...[a,o,s,c].map(e=>d(d(e,p),e))];for(let t of[...f,...m]){let n=q(t,l,-.01),[a,o,s]=[0,1,2].map(e=>r.of(n[e],e));if(r.has(a,o,s)&&i(e.index(a,o,s))||Ze(r,a,o,s,i))return!1}return!0}function it(e,t,n,r,i,a,o,s){let c=Z([n[0]-t[0],n[1]-t[1],n[2]-t[2]]),l=Z(X(c,r)),u=X(l,c),d=(e,t)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([n,r])=>q(q(e,l,n*i*t/2),u,r*a*t/2)),[f,p]=[d(t,1),d(n,o)];for(let t=0;t<4;t++)e.poly([f[t],f[(t+1)%4],p[(t+1)%4],p[t]],s,void 0,!0);e.poly(p,s,void 0,!0)}function at(e,t,n,r,i,a){let o=[r[0]*$,r[1]*$,r[2]*$];for(let r of t){let{normal:t,inward:s}=r,[c,l]=[e.place(r.a),e.place(r.b)],u=Math.hypot(l[0]-c[0],l[1]-c[1],l[2]-c[2]);if(u<.05)continue;let d=K([r.a,r.b]),f=e=>H(d[0],d[1],d[2],e),p=e=>q(c,[l[0]-c[0],l[1]-c[1],l[2]-c[2]],e);if(r.roof){if(Ue.has(n.roof)&&ot(e,r,c,l,f,t,s,a,i),f(11)>.7)continue;let o=Math.abs(t[1])>.97?s:Z(X(X([0,1,0],t),t)),u=Y(o,s);if(Math.abs(u)<.3)continue;let d=u>0?o:[-o[0],-o[1],-o[2]],m=q(p(.2+.6*f(12)),t,-.08-Ne[1]/2),h=Pe[0]+(Pe[1]-Pe[0])*f(13);it(e,m,q(q(m,d,h),[0,-1,0],h*.25*f(14)),t,Ne[0],Ne[1],.8,Fe);continue}if(Ve.has(n.wall)){for(let n=0;n<2;n++){if(f(20+n)>.6)continue;let r=q(p(.15+.7*f(22+n)),t,-.3*(.15+.6*f(24+n))),i=Le[0]+(Le[1]-Le[0])*f(26+n),a=Z(q(q(s,t,(f(28+n)-.3)*.8),[l[0]-c[0],l[1]-c[1],l[2]-c[2]],(f(30+n)-.5)/u));it(e,r,q(r,a,i),t,Ie[0],Ie[1],.15,Re)}continue}if(!He.has(n.wall)||f(40)>.55)continue;let m=X(t,s),h=(f(41)-.5)*1.2,g=q(c,t,.006);for(let n=0;n<6;n++){h+=(f(42+n)-.5)*1.1;let r=ze[0]+(ze[1]-ze[0])*f(50+n),i=Z(q([-s[0]*Math.cos(h),-s[1]*Math.cos(h),-s[2]*Math.cos(h)],m,Math.sin(h))),c=q(g,i,r);if(!a(c,t))break;let[l,u]=[Be*(1-n/6),Be*(1-(n+1)/6)+.002],d=X(t,i);e.poly([q(g,d,-l/2),q(c,d,-u/2),q(c,d,u/2),q(g,d,l/2)],o,void 0,!0),g=c}}}function ot(e,t,n,r,i,a,o,s,c){let l=Z([r[0]-n[0],r[1]-n[1],r[2]-n[2]]),u=e=>q(n,[r[0]-n[0],r[1]-n[1],r[2]-n[2]],e),d=e=>[c[0]*e,c[1]*e,c[2]*e],f=(t,n,r,i,o)=>{let s=Z(X(a,n)),[c,l]=[We[0]/2,We[1]/2],u=q(t,n,-l),d=q(q(t,n,l),a,r);e.poly([q(q(u,s,-c),a,i),q(q(u,s,c),a,i),q(q(d,s,c),a,i),q(q(d,s,-c),a,i)],o,void 0,!0)},p=[-o[0],-o[1],-o[2]];if(i(15)<.5){let e=q(u(.2+.6*i(17)),p,.12+.25*i(18));s(e,a)&&f(e,Z(q(p,l,(i(19)-.5)*.8)),.08+.1*i(21),.03,d(.85))}if(i(16)<.4){let e=q(u(.15+.7*i(22)),p,.3+.3*i(23));s(e,a)&&f(e,Z(q(p,l,(i(24)-.5)*.3)),0,.006,d(.4))}}function st(e,t,n,r,i){let a=t.normal,o=[0,0,0];for(let e of t.poly)for(let n=0;n<3;n++)o[n]+=e[n]/t.poly.length;let s=Math.abs(a[1])>.9?[1,0,0]:[0,1,0],c=[a[1]*s[2]-a[2]*s[1],a[2]*s[0]-a[0]*s[2],a[0]*s[1]-a[1]*s[0]],l=Math.hypot(...c)||1,u=[c[0]/l,c[1]/l,c[2]/l],d=[a[1]*u[2]-a[2]*u[1],a[2]*u[0]-a[0]*u[2],a[0]*u[1]-a[1]*u[0]],f=Math.min(.24,...t.poly.map(e=>Math.hypot(e[0]-o[0],e[1]-o[1],e[2]-o[2])*.6)),p=[i[0]*Ke,i[1]*Ke,i[2]*Ke];for(let t=0;t<r;t++){let[r,i]=[(H(n,t,1,4)-.5)*2*f,(H(n,t,2,4)-.5)*2*f],s=.035+H(n,t,3,4)*.05,c=[0,1,2].map(e=>o[e]+u[e]*r+d[e]*i+a[e]*.012),l=[];for(let e=0;e<7;e++){let r=e/7*Math.PI*2,i=s*(.55+H(n,t,e,5)*.7);l.push([0,1,2].map(e=>c[e]+(u[e]*Math.cos(r)+d[e]*Math.sin(r))*i))}e.poly(l,p,void 0,!0)}}const ct=/* @__PURE__ */ new Map;self.onmessage=e=>{let t=e.data;try{t.source&&ct.set(t.building,{source:t.source,shell:te.ofFlags(t.source.shell)});let e=ct.get(t.building);if(!e)throw Error(`look worker: building ${t.building} was never told`);let{ask:n}=t,r=/* @__PURE__ */ new Map;for(let e=0;e<n.dents.length;e+=2)r.set(n.dents[e],n.dents[e+1]);let a=nt(e.source.look,e.source.range,e.shell,new Set(n.removed),r,n.wall,n.roof,n.surfaces),o=new i({positions:a.positions});o.computeNormals();let s=o.normals,c={kind:`drawn`,id:t.id,positions:a.positions,colors:a.colors,custom:a.custom,normals:s};self.postMessage(c,[a.positions.buffer,a.colors.buffer,a.custom.buffer,s.buffer])}catch(e){let n={kind:`failed`,id:t.id,message:e instanceof Error?e.message:String(e)};self.postMessage(n)}};