const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const authController = require("../../controllers/admin/authController");

router.route("/login").post(authController.validator, authController.login);
router.route("/profile").get(auth, userValidate2(), authController.profile);

router
  .route("/change-password")
  .post(auth, userValidate(), authController.changePassword);

module.exports = router;

function userValidate() {
  const allowedUser = ["admin", "superadmin"];
  return (req, res, next) => {
    if (!allowedUser.includes(req.auth.type)) {
      // return res.sendStatus(401);
      return res.status(403).json({
        message: "You are not authorized to perform this action.",
      });
    }
    next();
  };
}

function userValidate2() {
  const allowedUser = ["admin", "superadmin", "saloon"];
  return (req, res, next) => {
    if (!allowedUser.includes(req.auth.type)) {
      // return res.sendStatus(401);
      return res.status(403).json({
        message: "You are not authorized to perform this action.",
      });
    }
    next();
  };
}
