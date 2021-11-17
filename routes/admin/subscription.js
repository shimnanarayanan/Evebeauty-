const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const subscriptionController = require("../../controllers/admin/subscriptionController");

router
  .route("/subscribe/list")
  .get(auth, userValidate2(), subscriptionController.list);

module.exports = router;

function userValidate2() {
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
