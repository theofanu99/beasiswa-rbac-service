const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access token diperlukan"
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Format authorization tidak valid"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token sudah expired"
      });
    }

    return res.status(401).json({
      message: "Access token tidak valid"
    });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "User belum terautentikasi"
      });
    }

    const permissions = req.user.permissions || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        message: "Tidak memiliki permission"
      });
    }

    next();
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "User belum terautentikasi"
      });
    }

    const roles = req.user.roles || [];

    if (!roles.includes(role)) {
      return res.status(403).json({
        message: "Tidak memiliki role yang diperlukan"
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requirePermission,
  requireRole
};