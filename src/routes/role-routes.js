const express = require("express");
const router = express.Router();

const roleController = require("../controllers/role-controller");
const {
  authenticate,
  requirePermission
} = require("../middlewares/auth-middleware");

router.get(
  "/",
  authenticate,
  requirePermission("role.read"),
  roleController.getRoles
);

router.post(
  "/",
  authenticate,
  requirePermission("role.create"),
  roleController.createRole
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("role.update"),
  roleController.updateRole
);

router.put(
  "/:id/permissions",
  authenticate,
  requirePermission("role.update"),
  roleController.updateRolePermissions
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("role.delete"),
  roleController.deleteRole
);

module.exports = router;