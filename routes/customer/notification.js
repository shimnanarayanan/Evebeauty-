const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const notificationController = require("../../controllers/customer/notificationController");

router.route("/list").get(auth, userValidate(), notificationController.list);
router
  .route("/notify")
  .post(auth, userValidate(), notificationController.notify);

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

module.exports = router;
