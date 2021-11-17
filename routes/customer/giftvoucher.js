const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const giftvoucherController = require("../../controllers/customer/giftvoucherController");

router
  .route("/")
  .post(auth, userValidate(), giftvoucherController.purchaseGiftvoucher);

router
  .route("/payment")
  .put(auth, userValidate(), giftvoucherController.payment);
router
  .route("/redeem")
  .post(auth, userValidate(), giftvoucherController.redeemGiftVoucher);

router.route("/list").get(auth, userValidate2(), giftvoucherController.list);
router.route("/:id").get(auth, userValidate2(), giftvoucherController.details);

router
  .route("/user/voucher")
  .get(auth, userValidate(), giftvoucherController.userPurchasedGiftvoucher);

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

module.exports = router;
