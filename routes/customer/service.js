const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const serviceController = require("../../controllers/customer/serviceController");

router
  .route("/offer/:saloon")
  .get(auth, userValidate(["guest"]), serviceController.Offerlist);
router
  .route("/offers")
  .post(auth, userValidate(["guest"]), serviceController.OfferlistByCategory);
router
  .route("/mystery")
  .get(auth, userValidate(["guest"]), serviceController.Mysterylist);
router
  .route("/service/:id")
  .get(auth, userValidate(["guest"]), serviceController.ServicelistBySaloon);
router
  .route("/service/category/:id")
  .get(auth, userValidate(["guest"]), serviceController.ServicelistBySaloonIos);
router
  .route("/services/:category")
  .get(auth, userValidate(["guest"]), serviceController.Servicelist);
router
  .route("/category")
  .get(auth, userValidate(["guest"]), serviceController.Categorylist);
router.route("/coupon").get(auth, userValidate(), serviceController.Couponlist);
router
  .route("/coupon/:id")
  .get(auth, userValidate(), serviceController.CouponDetail);

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
