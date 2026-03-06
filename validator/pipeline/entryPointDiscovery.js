/**
 * entryPointDiscovery.js
 * ───────────────────────
 * Structure-agnostic entry point discovery.
 *
 * Instead of requiring hardcoded files like `app.py` or `index.js`,
 * this module scans source files for framework signatures and determines
 * the primary execution command dynamically.
 *
 * Supports: FastAPI, Flask, Django, Express, Koa, Hapi, Next.js, plain scripts.
 */

const fs = require("fs");
const path = require("path");

// ─── Framework Signatures ─────────────────────────────────────────────
const FRAMEWORK_SIGNATURES = {
    python: [
        { framework: "fastapi", patterns: [/from\s+fastapi\s+import/i, /import\s+fastapi/i, /FastAPI\s*\(/], entryCmd: (f) => `uvicorn ${f.replace(/\.py$/, "").replace(/[/\\]/g, ".")}:app --host 0.0.0.0 --port 8000`, defaultPort: 8000 },
        { framework: "flask", patterns: [/from\s+flask\s+import/i, /import\s+flask/i, /Flask\s*\(__name__\)/], entryCmd: (f) => `python ${f}`, defaultPort: 5000 },
        { framework: "django", patterns: [/django/i, /DJANGO_SETTINGS_MODULE/], entryCmd: () => "python manage.py runserver 0.0.0.0:8000", defaultPort: 8000 },
        { framework: "pytest", patterns: [/import\s+pytest/i, /from\s+pytest/i], entryCmd: () => "python -m pytest -v", defaultPort: null },
        { framework: "script", patterns: [/if\s+__name__\s*==\s*['"]__main__['"]/], entryCmd: (f) => `python ${f}`, defaultPort: null },
    ],
    javascript: [
        { framework: "express", patterns: [/require\s*\(\s*['"]express['"]\s*\)/, /from\s+['"]express['"]/i, /express\s*\(\s*\)/], entryCmd: (f) => `node ${f}`, defaultPort: 3000 },
        { framework: "koa", patterns: [/require\s*\(\s*['"]koa['"]\s*\)/, /from\s+['"]koa['"]/i], entryCmd: (f) => `node ${f}`, defaultPort: 3000 },
        { framework: "hapi", patterns: [/require\s*\(\s*['"]@hapi\/hapi['"]\s*\)/], entryCmd: (f) => `node ${f}`, defaultPort: 3000 },
        { framework: "nextjs", patterns: [/from\s+['"]next['"]/i, /require\s*\(\s*['"]next['"]\s*\)/], entryCmd: () => "npm run dev", defaultPort: 3000 },
        { framework: "script", patterns: [/module\.exports/, /exports\.\w+/], entryCmd: (f) => `node ${f}`, defaultPort: null },
    ],
    typescript: [
        { framework: "express", patterns: [/from\s+['"]express['"]/i, /import\s+express/], entryCmd: (f) => `npx ts-node ${f}`, defaultPort: 3000 },
        { framework: "nextjs", patterns: [/from\s+['"]next['"]/i], entryCmd: () => "npm run dev", defaultPort: 3000 },
        { framework: "script", patterns: [/export\s+(default|const|function)/, /import\s+/], entryCmd: (f) => `npx ts-node ${f}`, defaultPort: null },
    ],
};

// Port detection patterns across languages
const PORT_PATTERNS = [
    /\.listen\s*\(\s*(\d{2,5})/,
    /port\s*[=:]\s*(\d{2,5})/i,
    /PORT\s*[=:]\s*(\d{2,5})/,
    /--port\s+(\d{2,5})/,
    /uvicorn.*:(\d{2,5})/,
];

/**
 * Discover the entry point of a repository.
 *
 * @param {string} repoPath   - Absolute path to cloned repo
 * @param {string} language   - Detected language ("python" | "javascript" | "typescript")
 * @returns {{ framework: string, entryFile: string|null, entryCommand: string, detectedPort: number|null, confidence: number }}
 */
function discoverEntryPoint(repoPath, language) {
    const sourceFiles = getSourceFiles(repoPath, language);
    const signatures = FRAMEWORK_SIGNATURES[language] || [];

    let bestMatch = null;
    let bestConfidence = 0;

    for (const file of sourceFiles) {
        const relPath = path.relative(repoPath, file).replace(/\\/g, "/");
        let content;
        try {
            content = fs.readFileSync(file, "utf-8");
        } catch {
            continue;
        }

        for (const sig of signatures) {
            let matchCount = 0;
            for (const pattern of sig.patterns) {
                if (pattern.test(content)) matchCount++;
            }

            if (matchCount > 0) {
                // Confidence: more pattern matches = higher confidence
                // Also boost for files at repo root or in common entry dirs
                let confidence = (matchCount / sig.patterns.length) * 80;
                if (isLikelyEntryFile(relPath)) confidence += 20;

                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestMatch = {
                        framework: sig.framework,
                        entryFile: relPath,
                        entryCommand: sig.entryCmd(relPath),
                        detectedPort: detectPort(content) || sig.defaultPort,
                        confidence: Math.min(100, Math.round(confidence)),
                    };
                }
            }
        }
    }

    // Fallback: no framework detected, but source files exist
    if (!bestMatch && sourceFiles.length > 0) {
        const firstFile = path.relative(repoPath, sourceFiles[0]).replace(/\\/g, "/");
        bestMatch = {
            framework: "unknown",
            entryFile: firstFile,
            entryCommand: getDefaultCommand(language, firstFile),
            detectedPort: null,
            confidence: 10,
        };
    }

    return bestMatch || {
        framework: "none",
        entryFile: null,
        entryCommand: "",
        detectedPort: null,
        confidence: 0,
    };
}

/**
 * Scan code for functional logic patterns (e.g., Fibonacci sequences).
 * Used by the semantic agent to verify intent when endpoints fail.
 *
 * @param {string} repoPath
 * @param {string} pattern   - Regex pattern string to search for
 * @returns {{ found: boolean, files: string[], snippets: string[] }}
 */
function scanForLogicPattern(repoPath, pattern) {
    const files = getSourceFiles(repoPath, "all");
    const regex = new RegExp(pattern, "gi");
    const results = { found: false, files: [], snippets: [] };

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, "utf-8");
            const matches = content.match(regex);
            if (matches) {
                results.found = true;
                results.files.push(path.relative(repoPath, file).replace(/\\/g, "/"));
                // Grab surrounding context (3 lines before/after)
                const lines = content.split("\n");
                for (let i = 0; i < lines.length; i++) {
                    if (regex.test(lines[i])) {
                        const start = Math.max(0, i - 2);
                        const end = Math.min(lines.length, i + 3);
                        results.snippets.push(lines.slice(start, end).join("\n"));
                        regex.lastIndex = 0; // Reset regex state
                    }
                }
            }
        } catch {
            // Skip unreadable files
        }
    }

    return results;
}

// ─── Internal Helpers ─────────────────────────────────────────────────

function getSourceFiles(repoPath, language, depth = 0) {
    if (depth > 4) return [];
    const files = [];
    const extensions = getExtensions(language);

    try {
        const entries = fs.readdirSync(repoPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__" || entry.name === "venv" || entry.name === ".venv") continue;

            const full = path.join(repoPath, entry.name);
            if (entry.isDirectory()) {
                files.push(...getSourceFiles(full, language, depth + 1));
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(full);
                }
            }
        }
    } catch {
        // Permission or read error
    }

    return files;
}

function getExtensions(language) {
    switch (language) {
        case "python": return [".py"];
        case "javascript": return [".js", ".mjs", ".cjs"];
        case "typescript": return [".ts", ".tsx", ".mts"];
        case "all": return [".py", ".js", ".ts", ".mjs", ".cjs", ".tsx", ".mts"];
        default: return [".py", ".js", ".ts"];
    }
}

function isLikelyEntryFile(relPath) {
    const name = path.basename(relPath).toLowerCase();
    const commonNames = ["main", "app", "index", "server", "api", "run", "start", "wsgi", "asgi"];
    return commonNames.some(n => name.startsWith(n)) || !relPath.includes("/");
}

function detectPort(content) {
    for (const pattern of PORT_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
            const port = parseInt(match[1]);
            if (port >= 80 && port <= 65535) return port;
        }
    }
    return null;
}

function getDefaultCommand(language, file) {
    switch (language) {
        case "python": return `python ${file}`;
        case "javascript": return `node ${file}`;
        case "typescript": return `npx ts-node ${file}`;
        default: return "";
    }
}

module.exports = { discoverEntryPoint, scanForLogicPattern };
