const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const walletController = require("../../controllers/customer/walletController");

router
  .route("/wallet/purchase/user")
  .post(auth, userValidate(), walletController.purchaseWallet);
router
  .route("/wallet/booking")
  .post(auth, userValidate(), walletController.walletPayment);
router
  .route("/wallet/payment")
  .put(auth, userValidate(), walletController.payment);
router.route("/wallet").get(auth, userValidate(), walletController.UserWallet);
router
  .route("/transactions")
  .get(auth, userValidate(), walletController.Usertransactions);
router
  .route("/transaction/:id")
  .get(auth, userValidate2(), walletController.Transactionlist);
router
  .route("/transactions/:id")
  .get(auth, userValidate2(), walletController.TransactionDetails);

router
  .route("/store/wallet")
  .post(auth, userValidate(), walletController.StoreWalletPayment);
router
  .route("/store/cancel/refund")
  .post(walletController.StoreCancelWalletRefund);

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
