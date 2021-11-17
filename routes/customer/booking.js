const express = require("express");
const router = new express.Router();
const { check } = require("express-validator");
const bookingController = require("../../controllers/customer/bookingController");
const auth = require("../../middlewares/auth");

router.route("/staff/:id").get(bookingController.listStaffbyServices);
router
  .route("/availability")
  .post(auth, userValidate(), bookingController.availability);
router.route("/").post(
  auth,
  userValidate(),
  // bookingController.validateBooking,
  bookingController.booking
);
router.get("/history", auth, userValidate(), bookingController.history);
router.get("/:id", auth, userValidate2(), bookingController.details);
router
  .route("/payment/user")
  .put(auth, userValidate(), bookingController.payment);
router
  .route("/salonpayment/user")
  .put(auth, userValidate(), bookingController.SalonPayment);
router
  .route("/cancel/:id")
  .put(auth, userValidate(), bookingController.cancelBookings);
router.get("/store/refer/:userId", bookingController.StoreReferal);

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

function userValidate2() {
  const allowedUser = ["customer", "saloon"];
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
