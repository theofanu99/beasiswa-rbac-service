const express = require("express");

const {
  authenticate,
  requirePermission
} = require("../middlewares/auth-middleware");

const permissionController = require("../controllers/permission-controller");

const router = express.Router();

router.get(
  "/",
  authenticate,
  requirePermission("role.read"),
  permissionController.getPermissions
);

module.exports = router;