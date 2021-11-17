const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const authController = require("../../controllers/saloon/authController");

router.route("/login").post(authController.validator, authController.login);
router.route("/forgot-password").post(authController.forgotPassword);
router
  .route("/forgot-password/validate")
  .get(authController.forgotPasswordValidate);
router
  .route("/change-password")
  .post(auth, userValidate(), authController.changePassword);

router.get(
  "/status/:id",
  auth,
  userValidate2(),
  authController.verificationStatus
);

function userValidate() {
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
function userValidate2() {
  const allowedUser = ["saloon"];
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
module.exports = router;
