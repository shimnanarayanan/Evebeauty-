const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const settingController = require("../../controllers/admin/settingController");

router.route("/").post(auth, userValidate(), settingController.create);
router.route("/").get(auth, userValidate(), settingController.list);
router.route("/:id").put(auth, userValidate(), settingController.update);
router
  .route("/customer")
  .get(auth, userValidate2(), settingController.customerlist);

module.exports = router;
function userValidate() {
  const allowedUser = ["admin", "superadmin", "saloon"];
  return function (req, res, next) {
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
  const allowedUser = ["customer"];
  return function (req, res, next) {
    if (!allowedUser.includes(req.auth.type)) {
      // return res.sendStatus(401);
      return res.status(403).json({
        message: "You are not authorized to perform this action.",
      });
    }
    next();
  };
}
