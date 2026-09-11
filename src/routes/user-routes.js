const express = require("express");

const {
  authenticate,
  requirePermission
} = require("../middlewares/auth-middleware");

const userController = require("../controllers/user-controller");

const router = express.Router();

router.get(
  "/",
  authenticate,
  requirePermission("user.read"),
  userController.getUsers
);

router.post(
  "/",
  authenticate,
  requirePermission("user.create"),
  userController.createUser
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("user.update"),
  userController.updateUser
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("user.delete"),
  userController.deleteUser
);

module.exports = router;
