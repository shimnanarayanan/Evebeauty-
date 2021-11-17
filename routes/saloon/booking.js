const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const bookingController = require("../../controllers/saloon/bookingController");
router.get("/bookings/:id", auth, userValidate(), bookingController.list);

router.get("/booking/:id", auth, userValidate2(), bookingController.details);
router.get(
  "/bookings/recent/:id",
  auth,
  userValidate(),
  bookingController.recentBookings
);
router.get(
  "/bookings/count/:id",
  auth,
  userValidate(),
  bookingController.count
);
router.post(
  "/booking/status/:id",
  auth,
  userValidate(),
  bookingController.statusUpdate
);
router.put(
  "/payment/status/:id",
  auth,
  userValidate(),
  bookingController.PaymentStatusUpdate
);

router.get(
  "/transactions/:id",
  auth,
  userValidate(),
  bookingController.transaction
);
router.get(
  "/bookings/finance/:id",
  auth,
  userValidate(),
  bookingController.salonFinanceBookTotal
);

function userValidate() {
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

function userValidate2() {
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

module.exports = router;
