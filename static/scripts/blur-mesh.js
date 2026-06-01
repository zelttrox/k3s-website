/* Wireframe geometric blur mesh — WebGL shader ported to vanilla JS.
   Click the canvas to cycle shapes. Background is transparent so it blends
   over the page. */
(function () {
    const canvas = document.getElementById("blur-mesh");
    if (!canvas) return;
    const container = canvas.parentElement;

    const gl = canvas.getContext("webgl", {
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
    });
    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    const vertexShaderSrc = `
attribute vec3 a_position;
attribute vec2 a_uv;
varying vec2 v_texcoord;

void main() {
    gl_Position = vec4(a_position, 1.0);
    v_texcoord = a_uv;
}
`;

    const fragmentShaderSrc = `
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_time;
uniform int u_shape;

#define PI 3.1415926535897932384626433832795
#define TWO_PI 6.2831853071795864769252867665590

mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}

mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

mat3 rotateZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c, -s, 0.0,
        s, c, 0.0,
        0.0, 0.0, 1.0
    );
}

vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
    } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
    }
    p -= 0.5;
    return p;
}

vec2 project(vec3 p) {
    float perspective = 2.0 / (2.0 - p.z);
    return p.xy * perspective;
}

float distToSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float drawLine(vec2 p, vec2 a, vec2 b, float thickness, float blur) {
    float d = distToSegment(p, a, b);
    return smoothstep(thickness + blur, thickness - blur, d);
}

void getCubeVertices(out vec3 v[8]) {
    float s = 0.7;
    v[0] = vec3(-s, -s, -s);
    v[1] = vec3( s, -s, -s);
    v[2] = vec3( s,  s, -s);
    v[3] = vec3(-s,  s, -s);
    v[4] = vec3(-s, -s,  s);
    v[5] = vec3( s, -s,  s);
    v[6] = vec3( s,  s,  s);
    v[7] = vec3(-s,  s,  s);
}

void getTetrahedronVertices(out vec3 v[4]) {
    float a = 1.0 / sqrt(3.0);
    v[0] = vec3( a,  a,  a);
    v[1] = vec3( a, -a, -a);
    v[2] = vec3(-a,  a, -a);
    v[3] = vec3(-a, -a,  a);
}

void getOctahedronVertices(out vec3 v[6]) {
    v[0] = vec3( 1.0,  0.0,  0.0);
    v[1] = vec3(-1.0,  0.0,  0.0);
    v[2] = vec3( 0.0,  1.0,  0.0);
    v[3] = vec3( 0.0, -1.0,  0.0);
    v[4] = vec3( 0.0,  0.0,  1.0);
    v[5] = vec3( 0.0,  0.0, -1.0);
}

void getIcosahedronVertices(out vec3 v[12]) {
    float t = (1.0 + sqrt(5.0)) / 2.0;
    float s = 1.0 / sqrt(1.0 + t * t);

    v[0] = vec3(-s, t * s, 0);
    v[1] = vec3( s, t * s, 0);
    v[2] = vec3(-s, -t * s, 0);
    v[3] = vec3( s, -t * s, 0);

    v[4] = vec3(0, -s, t * s);
    v[5] = vec3(0,  s, t * s);
    v[6] = vec3(0, -s, -t * s);
    v[7] = vec3(0,  s, -t * s);

    v[8] = vec3( t * s, 0, -s);
    v[9] = vec3( t * s, 0,  s);
    v[10] = vec3(-t * s, 0, -s);
    v[11] = vec3(-t * s, 0,  s);
}

float drawWireframe(vec2 p, int shape, mat3 rotation, float scale, float thickness, float blur) {
    float result = 0.0;

    if (shape == 0) {
        vec3 v[8];
        getCubeVertices(v);
        for (int i = 0; i < 8; i++) {
            v[i] = rotation * (v[i] * scale);
        }
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[2]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[0]), thickness, blur);
        result += drawLine(p, project(v[4]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[5]), project(v[6]), thickness, blur);
        result += drawLine(p, project(v[6]), project(v[7]), thickness, blur);
        result += drawLine(p, project(v[7]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[6]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[7]), thickness, blur);

    } else if (shape == 1) {
        vec3 v[4];
        getTetrahedronVertices(v);
        for (int i = 0; i < 4; i++) {
            v[i] = rotation * (v[i] * scale);
        }
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[2]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[2]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur);

    } else if (shape == 2) {
        vec3 v[6];
        getOctahedronVertices(v);
        for (int i = 0; i < 6; i++) {
            v[i] = rotation * (v[i] * scale);
        }
        result += drawLine(p, project(v[2]), project(v[0]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[0]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[4]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[5]), project(v[0]), thickness, blur);

    } else if (shape == 3) {
        vec3 v[12];
        getIcosahedronVertices(v);
        for (int i = 0; i < 12; i++) {
            v[i] = rotation * (v[i] * scale);
        }
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[7]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[10]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[11]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[7]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[8]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[9]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[6]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[10]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[11]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[6]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[8]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[9]), thickness, blur);
        result += drawLine(p, project(v[4]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[4]), project(v[11]), thickness, blur);
        result += drawLine(p, project(v[5]), project(v[11]), thickness, blur);
        result += drawLine(p, project(v[6]), project(v[7]), thickness, blur);
        result += drawLine(p, project(v[6]), project(v[8]), thickness, blur);
        result += drawLine(p, project(v[6]), project(v[10]), thickness, blur);
        result += drawLine(p, project(v[7]), project(v[10]), thickness, blur);
        result += drawLine(p, project(v[8]), project(v[9]), thickness, blur);
        result += drawLine(p, project(v[9]), project(v[11]), thickness, blur);
        result += drawLine(p, project(v[10]), project(v[11]), thickness, blur);

    } else if (shape == 4) {
        vec3 v[5];
        float s = 0.7;
        v[0] = vec3(-s, 0.0, -s);
        v[1] = vec3( s, 0.0, -s);
        v[2] = vec3( s, 0.0,  s);
        v[3] = vec3(-s, 0.0,  s);
        v[4] = vec3( 0.0, 1.0,  0.0);
        for (int i = 0; i < 5; i++) {
            v[i] = rotation * (v[i] * scale);
        }
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[2]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[0]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[4]), thickness, blur);

    } else if (shape == 5) {
        vec3 v[6];
        float s = 0.6;
        v[0] = vec3(-s, 0.0, -s);
        v[1] = vec3( s, 0.0, -s);
        v[2] = vec3( s, 0.0,  s);
        v[3] = vec3(-s, 0.0,  s);
        v[4] = vec3( 0.0,  1.0,  0.0);
        v[5] = vec3( 0.0, -1.0,  0.0);
        for (int i = 0; i < 6; i++) {
            v[i] = rotation * (v[i] * scale);
        }
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[2]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[0]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[5]), thickness, blur);

    } else if (shape == 6) {
        vec3 v[12];
        float angleStep = TWO_PI / 6.0;
        v[0] = vec3(cos(0.0 * angleStep), -1.0, sin(0.0 * angleStep));
        v[1] = vec3(cos(1.0 * angleStep), -1.0, sin(1.0 * angleStep));
        v[2] = vec3(cos(2.0 * angleStep), -1.0, sin(2.0 * angleStep));
        v[3] = vec3(cos(3.0 * angleStep), -1.0, sin(3.0 * angleStep));
        v[4] = vec3(cos(4.0 * angleStep), -1.0, sin(4.0 * angleStep));
        v[5] = vec3(cos(5.0 * angleStep), -1.0, sin(5.0 * angleStep));
        v[6] = vec3(cos(0.0 * angleStep), 1.0, sin(0.0 * angleStep));
        v[7] = vec3(cos(1.0 * angleStep), 1.0, sin(1.0 * angleStep));
        v[8] = vec3(cos(2.0 * angleStep), 1.0, sin(2.0 * angleStep));
        v[9] = vec3(cos(3.0 * angleStep), 1.0, sin(3.0 * angleStep));
        v[10] = vec3(cos(4.0 * angleStep), 1.0, sin(4.0 * angleStep));
        v[11] = vec3(cos(5.0 * angleStep), 1.0, sin(5.0 * angleStep));
        v[0] = rotation * (v[0] * scale);
        v[1] = rotation * (v[1] * scale);
        v[2] = rotation * (v[2] * scale);
        v[3] = rotation * (v[3] * scale);
        v[4] = rotation * (v[4] * scale);
        v[5] = rotation * (v[5] * scale);
        v[6] = rotation * (v[6] * scale);
        v[7] = rotation * (v[7] * scale);
        v[8] = rotation * (v[8] * scale);
        v[9] = rotation * (v[9] * scale);
        v[10] = rotation * (v[10] * scale);
        v[11] = rotation * (v[11] * scale);
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[2]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[4]), thickness, blur);
        result += drawLine(p, project(v[4]), project(v[5]), thickness, blur);
        result += drawLine(p, project(v[5]), project(v[0]), thickness, blur);
        result += drawLine(p, project(v[6]), project(v[7]), thickness, blur);
        result += drawLine(p, project(v[7]), project(v[8]), thickness, blur);
        result += drawLine(p, project(v[8]), project(v[9]), thickness, blur);
        result += drawLine(p, project(v[9]), project(v[10]), thickness, blur);
        result += drawLine(p, project(v[10]), project(v[11]), thickness, blur);
        result += drawLine(p, project(v[11]), project(v[6]), thickness, blur);
        result += drawLine(p, project(v[0]), project(v[6]), thickness, blur);
        result += drawLine(p, project(v[1]), project(v[7]), thickness, blur);
        result += drawLine(p, project(v[2]), project(v[8]), thickness, blur);
        result += drawLine(p, project(v[3]), project(v[9]), thickness, blur);
        result += drawLine(p, project(v[4]), project(v[10]), thickness, blur);
        result += drawLine(p, project(v[5]), project(v[11]), thickness, blur);

    } else {
        float t = u_time * 0.5;
        float morph = sin(t) * 0.5 + 0.5;
        vec3 cube[8];
        getCubeVertices(cube);
        vec3 octa[6];
        getOctahedronVertices(octa);
        vec3 v[8];
        for (int i = 0; i < 8; i++) {
            if (i < 6) {
                v[i] = mix(cube[i], octa[i] * 1.5, morph);
            } else {
                v[i] = cube[i] * (1.0 - morph * 0.3);
            }
            v[i] = rotation * (v[i] * scale);
        }
        float alpha = 1.0 - morph * 0.5;
        result += drawLine(p, project(v[0]), project(v[1]), thickness, blur) * alpha;
        result += drawLine(p, project(v[1]), project(v[2]), thickness, blur) * alpha;
        result += drawLine(p, project(v[2]), project(v[3]), thickness, blur) * alpha;
        result += drawLine(p, project(v[3]), project(v[0]), thickness, blur) * alpha;
        result += drawLine(p, project(v[4]), project(v[5]), thickness, blur) * alpha;
        result += drawLine(p, project(v[5]), project(v[6]), thickness, blur) * alpha;
        result += drawLine(p, project(v[6]), project(v[7]), thickness, blur) * alpha;
        result += drawLine(p, project(v[7]), project(v[4]), thickness, blur) * alpha;
        result += drawLine(p, project(v[0]), project(v[6]), thickness, blur) * morph;
        result += drawLine(p, project(v[1]), project(v[7]), thickness, blur) * morph;
        result += drawLine(p, project(v[2]), project(v[4]), thickness, blur) * morph;
        result += drawLine(p, project(v[3]), project(v[5]), thickness, blur) * morph;
    }

    return clamp(result, 0.0, 1.0);
}

vec3 render(vec2 st, vec2 mouse, out float lum) {
    float mouseDistance = length(st - mouse);
    float mouseInfluence = 1.0 - smoothstep(0.0, 0.5, mouseDistance);

    float time = u_time * 0.2;
    mat3 rotation = rotateY(time + (mouse.x - 0.5) * mouseInfluence * 1.0) *
                    rotateX(time * 0.7 + (mouse.y - 0.5) * mouseInfluence * 1.0) *
                    rotateZ(time * 0.1);

    float scale = 0.35;
    float blur = mix(0.0001, 0.05, mouseInfluence);
    float thickness = mix(0.002, 0.003, mouseInfluence);

    float shape = drawWireframe(st, u_shape, rotation, scale, thickness, blur);

    vec3 color = vec3(0.55, 0.95, 0.72);

    float dimming = 1.0 - mouseInfluence * 0.3;
    color *= shape * dimming;

    float vignette = 1.0 - length(st) * 0.2;
    color *= vignette;

    color = pow(color, vec3(0.9));
    lum = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);
    return color;
}

void main() {
    vec2 st = coord(gl_FragCoord.xy);
    vec2 mouse = coord(u_mouse * u_pixelRatio) * vec2(1., -1.);

    float lum;
    vec3 color = render(st, mouse, lum);

    gl_FragColor = vec4(color, lum);
}
`;

    const shapes = [
        "Cube",
        "Tetrahedron",
        "Octahedron",
        "Icosahedron",
        "Pyramid",
        "Diamond",
        "Hexagonal Prism",
        "Morphing",
    ];

    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vShader = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    const fShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    if (!vShader || !fShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking error:", gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uniforms = {
        u_mouse: gl.getUniformLocation(program, "u_mouse"),
        u_resolution: gl.getUniformLocation(program, "u_resolution"),
        u_pixelRatio: gl.getUniformLocation(program, "u_pixelRatio"),
        u_time: gl.getUniformLocation(program, "u_time"),
        u_shape: gl.getUniformLocation(program, "u_shape"),
    };

    const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const uvLocation = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
        const ratio = dpr();
        const width = container.clientWidth;
        const height = container.clientHeight;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0 };
    const mouseDamp = { x: 0, y: 0 };

    function onMove(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        mouse.x = clientX - rect.left;
        mouse.y = clientY - rect.top;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);

    let currentShape = 0;
    container.addEventListener("click", () => {
        currentShape = (currentShape + 1) % shapes.length;
    });

    const startTime = Date.now();
    let lastTime = performance.now();

    function animate(time) {
        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;

        const damping = 8;
        mouseDamp.x += (mouse.x - mouseDamp.x) * damping * deltaTime;
        mouseDamp.y += (mouse.y - mouseDamp.y) * damping * deltaTime;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const ratio = dpr();
        const elapsed = (Date.now() - startTime) / 1000;

        gl.uniform2f(uniforms.u_mouse, mouseDamp.x, mouseDamp.y);
        gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.u_pixelRatio, ratio);
        gl.uniform1f(uniforms.u_time, elapsed);
        gl.uniform1i(uniforms.u_shape, currentShape);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
})();
