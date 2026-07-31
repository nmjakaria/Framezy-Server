import { createRemoteJWKSet, jwtVerify } from "jose-cjs";

let _jwks;
function getJWKS() {
  if (!_jwks) {
    if (!process.env.AUTH_ISSUER_URL) {
      throw new Error("AUTH_ISSUER_URL is not set");
    }
    _jwks = createRemoteJWKSet(
      new URL(`${process.env.AUTH_ISSUER_URL}/api/auth/jwks`)
    );
  }
  return _jwks;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: process.env.AUTH_ISSUER_URL,
    });
    // console.log("DEBUG JWT payload:", payload);
    req.user = payload;
    next();
  } catch (err) {
    // console.log("DEBUG JWT verify failed:", err.message); // ← temporary
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}