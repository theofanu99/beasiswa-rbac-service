const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error-middleware");

const {
  authenticate,
  requirePermission,
  requireRole
} = require("./middlewares/auth-middleware");

const userRoutes = require("./routes/user-routes");
const roleRoutes = require("./routes/role-routes");
const permissionRoutes = require("./routes/permission-routes");
const authRoutes = require("./routes/auth-routes");
const menuRoutes = require("./routes/menu-routes");

const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "rbac-service"
  });
});

app.get(
  "/api/test/protected",
  authenticate,
  (req, res) => {
    res.json({
      message: "Berhasil mengakses protected endpoint",
      user: req.user
    });
  }
);

app.get(
  "/api/test/admin",
  authenticate,
  requireRole("ADMIN"),
  (req, res) => {
    res.json({
      message: "Kamu adalah ADMIN"
    });
  }
);

app.get(
  "/api/test/users",
  authenticate,
  requirePermission("user.read"),
  (req, res) => {
    res.json({
      message: "Kamu memiliki permission user.read"
    });
  }
);

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/menus", menuRoutes);

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
|
*/

app.use(errorHandler);

module.exports = app;