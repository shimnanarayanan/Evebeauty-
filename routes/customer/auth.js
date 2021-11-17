const express = require("express");
const router = new express.Router();
const { check } = require("express-validator");
const authController = require("../../controllers/customer/authController");
const auth = require("../../middlewares/auth");

router
  .route("/register")
  .post(authController.validate, authController.registration);
router.route("/signup").post(authController.validate, authController.signup);

router.route("/verify").post(authController.otp);
router
  .route("/referfriend")
  .post(auth, userValidate(), authController.referfriend);
router
  .route("/version")
  .get(auth, userValidate(["guest"]), authController.getVersion);
router
  .route("/UpdateVersion")
  .post(auth, userValidate(["guest"]), authController.updateVersion);

router.route("/signin").post(authController.validate, authController.signin);
// router.route("/guest").post(guest, authController.guestLogin);

router.route("/logout").patch(auth, authController.logout);

module.exports = router;
function userValidate(user = []) {
  const allowedUser = ["customer", ...user];
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
