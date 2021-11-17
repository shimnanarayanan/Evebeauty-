const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const bookingController = require("../../controllers/admin/bookingController");
router.route("/bookings").get(auth, userValidate(), bookingController.list);

router.get(
  "/bookings/export",
  auth,
  userValidate(),
  bookingController.excelExport
);
router.get(
  "/bookings/count/:id",
  auth,
  userValidate2(),
  bookingController.count
);
router.get("/bookings/count", auth, userValidate(), bookingController.countAll);
router
  .route("/bookings/search")
  .get(auth, userValidate(), bookingController.search);
router.get("/bookings/finance/reports", auth, userValidate(), bookingController.financeBookTotal);
router.get("/bookings/finance/commission", auth, userValidate(), bookingController.commission);
router.get("/bookings/finance/filter/commission", auth, userValidate(), bookingController.commissionFilter);
router.get(
  "/bookings/commission/export",
  auth,
  userValidate(),
  bookingController.commissionFilterExcelExport
);

function userValidate() {
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
function userValidate2() {
  const allowedUser = ["saloon"];
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

module.exports = router;
