
// webgl-matrix-multiply.js

class WebGLMatrixMultiply {
    constructor() {
        if (typeof document !== 'undefined') {
            this.gl = this.createWebGLContext();
            if (!this.gl) {
            console.error("Failed to create WebGL context.");
            // If WebGL context creation fails, fall back to CPU
            this.gl = null;
            this.program = null;
            console.warn("Falling back to CPU matrix multiplication due to WebGL context failure.");
            return;
        }
        // Check if it's WebGL1.0 and if so, force CPU fallback due to shader limitations
        if (this.gl instanceof WebGLRenderingContext && !(this.gl instanceof WebGL2RenderingContext)) {
            console.warn("WebGL 1.0 detected. Falling back to CPU matrix multiplication due to shader limitations.");
            this.gl = null;
            this.program = null;
            return;
        }
            this.program = this.createProgram(this.gl);
        } else {
            console.warn("Running in a non-browser environment. Falling back to CPU matrix multiplication.");
            this.gl = null;
            this.program = null;
        }
    }

    createWebGLContext() {
        if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
            return null;
        }
        const canvas = document.createElement('canvas');
        let gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error("Unable to initialize WebGL. Your browser may not support it.");
            return null;
        }
        if (gl.getExtension('OES_texture_float') || gl.getExtension('OES_texture_float_linear')) {
            console.log("OES_texture_float extension supported.");
        } else if (gl instanceof WebGL2RenderingContext) {
            console.log("WebGL2 context, floating point textures are supported.");
        } else {
            console.error("Floating point textures not fully supported. Calculations might be inaccurate.");
        }
        return gl;
    }

    createProgram(gl) {
        const vertexShaderSource = `#version 300 es
            in vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
            }
        `;

        // Placeholder fragment shader for matrix multiplication
        // This will be updated to perform actual matrix multiplication
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            out vec4 FragColor;

            uniform sampler2D u_matrixA;
            uniform sampler2D u_matrixB;
            uniform float u_matrixA_rows;
            uniform float u_matrixA_cols;
            uniform float u_matrixB_rows;
            uniform float u_matrixB_cols;

            void main() {
                // Calculate the integer row and column of the output matrix
                // gl_FragCoord.xy gives pixel coordinates, which are 0.5, 1.5, ...
                // Subtract 0.5 to get integer indices (0, 1, ...)
                float outputRow = floor(gl_FragCoord.y);
                float outputCol = floor(gl_FragCoord.x);

                float sum = 0.0;
                // Iterate through the common dimension (inner product)
                for (float k = 0.0; k < u_matrixA_cols; k += 1.0) {
                    // Get element A[outputRow][k]
                    // Normalized texture coordinates for matrix A: (column_index + 0.5) / total_columns, (row_index + 0.5) / total_rows
                    float a = texture(u_matrixA, vec2((k + 0.5) / u_matrixA_cols, (outputRow + 0.5) / u_matrixA_rows)).r;

                    // Get element B[k][outputCol]
                    // Normalized texture coordinates for matrix B: (column_index + 0.5) / total_columns, (row_index + 0.5) / total_rows
                    float b = texture(u_matrixB, vec2((outputCol + 0.5) / u_matrixB_cols, (k + 0.5) / u_matrixB_rows)).r;

                    sum += a * b;
                }
                FragColor = vec4(sum, 0.0, 0.0, 1.0);
            }
        `;

        const vertexShader = this.compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    multiply(matrixA, matrixB) {
        const gl = this.gl;
        if (!gl || !this.program) {
            // Fallback to CPU multiplication if WebGL is not initialized
            //console.warn("WebGL not available, performing CPU matrix multiplication.");
            return this.cpuMultiply(matrixA, matrixB);
        }

        const aRows = matrixA.length;
        const aCols = matrixA[0].length;
        const bRows = matrixB.length;
        const bCols = matrixB[0].length;

        if (aCols !== bRows) {
            console.error("Matrix dimensions mismatch for multiplication.");
            return [];
        }

        const resultRows = aRows;
        const resultCols = bCols;

        // Create textures for matrixA and matrixB
        const textureA = this.createTextureFromMatrix(gl, matrixA, aRows, aCols);
        const textureB = this.createTextureFromMatrix(gl, matrixB, bRows, bCols);

        // Create framebuffer to render to
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        const outputTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, outputTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, resultCols, resultRows, 0, gl.RED, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

        const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
            // Fallback to CPU if framebuffer is incomplete
            gl.deleteTexture(textureA);
            gl.deleteTexture(textureB);
            gl.deleteTexture(outputTexture);
            gl.deleteFramebuffer(framebuffer);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return this.cpuMultiply(matrixA, matrixB);
        }

        gl.viewport(0, 0, resultCols, resultRows);
        gl.useProgram(this.program);

        // Set uniforms
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureA);
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_matrixA'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textureB);
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_matrixB'), 1);

        gl.uniform1f(gl.getUniformLocation(this.program, 'u_matrixA_rows'), aRows);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_matrixA_cols'), aCols);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_matrixB_rows'), bRows);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_matrixB_cols'), bCols);

        // Set up a full-screen quad to render to
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Read pixels back
        const pixels = new Float32Array(resultCols * resultRows * 4);
        gl.readPixels(0, 0, resultCols, resultRows, gl.RGBA, gl.FLOAT, pixels);

        // Convert pixel data back to matrix
        const resultMatrix = [];
        for (let i = 0; i < resultRows; i++) {
            resultMatrix[i] = [];
            for (let j = 0; j < resultCols; j++) {
                resultMatrix[i][j] = pixels[i * resultCols + j];
            }
        }

        // Clean up
        gl.deleteTexture(textureA);
        gl.deleteTexture(textureB);
        gl.deleteTexture(outputTexture);
        gl.deleteFramebuffer(framebuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return resultMatrix;
    }

    createTextureFromMatrix(gl, matrix, rows, cols) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const data = new Float32Array(rows * cols * 4);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                data[(i * cols + j) * 4] = matrix[i][j]; // Store in the red channel
                data[(i * cols + j) * 4 + 1] = 0.0; // Green
                data[(i * cols + j) * 4 + 2] = 0.0; // Blue
                data[(i * cols + j) * 4 + 3] = 1.0; // Alpha
            }
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, cols, rows, 0, gl.RED, gl.FLOAT, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return texture;
    }

    cpuMultiply(matrixA, matrixB) {
        const aRows = matrixA.length;
        const aCols = matrixA[0].length;
        const bRows = matrixB.length;
        const bCols = matrixB[0].length;

        if (aCols !== bRows) {
            console.error("Matrix dimensions mismatch for CPU multiplication.");
            return [];
        }

        const resultMatrix = Array(aRows).fill(0).map(() => Array(bCols).fill(0));

        for (let i = 0; i < aRows; i++) {
            for (let j = 0; j < bCols; j++) {
                let sum = 0;
                for (let k = 0; k < aCols; k++) {
                    sum += matrixA[i][k] * matrixB[k][j];
                }
                resultMatrix[i][j] = sum;
            }
        }
        return resultMatrix;
    }
}

// Export for use in other modules
if (typeof module !== "undefined") {
    module.exports = { WebGLMatrixMultiply };
} else if (typeof window !== "undefined") {
    window.WebGLMatrixMultiply = WebGLMatrixMultiply;
}
