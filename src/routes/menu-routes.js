const express = require("express");

const router = express.Router();

const menuController = require("../controllers/menu-controller");

const {
  authenticate,
  requirePermission
} = require("../middlewares/auth-middleware");

router.get(
  "/",
  authenticate,
  requirePermission("menu.read"),
  menuController.getMenus
);

router.get(
  "/role/:roleId",
  authenticate,
  requirePermission("menu.read"),
  menuController.getMenusByRole
);

router.post(
  "/",
  authenticate,
  requirePermission("menu.create"),
  menuController.createMenu
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("menu.update"),
  menuController.updateMenu
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("menu.delete"),
  menuController.deleteMenu
);

router.put(
  "/role/:roleId",
  authenticate,
  requirePermission("role.update"),
  menuController.updateRoleMenus
);

module.exports = router;