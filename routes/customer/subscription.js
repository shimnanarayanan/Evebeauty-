const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const subscriptionController = require("../../controllers/customer/subscriptionController");

router
  .route("/subscribe/:id")
  .post(auth, userValidate(), subscriptionController.subscribe);

router
  .route("/users/subscribe")
  .get(auth, userValidate(), subscriptionController.userMystery);
router
  .route("/subscribe")
  .put(auth, userValidate(), subscriptionController.payment);
router
  .route("/subscribe/cancel")
  .put(auth, userValidate(), subscriptionController.cancelSubscription);

module.exports = router;

function userValidate() {
  const allowedUser = ["customer"];
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
