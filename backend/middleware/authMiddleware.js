/**
 * backend/middleware/authMiddleware.js
 * ─────────────────────────────────────
 * JWT verification middleware.
 * Extracts token from httpOnly cookie or Authorization header.
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "veylo-dev-secret-change-in-production";

/**
 * Middleware: require authentication.
 * Attaches req.user = { id, email, role }
 */
function requireAuth(req, res, next) {
    // Try cookie first, then Authorization header
    const token =
        req.cookies?.veylo_token ||
        (req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.slice(7)
            : null);

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * Optional auth — attaches user if token present, but doesn't block.
 */
function optionalAuth(req, res, next) {
    const token =
        req.cookies?.veylo_token ||
        (req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.slice(7)
            : null);

    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch {
            // Invalid token — proceed without user
        }
    }
    next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
