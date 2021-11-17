const express = require("express");
const router = express.Router();

const authAdminRoute = require("./admin/auth");
const adminsaloonRoute = require("./admin/saloon");
const serviceRoute = require("./admin/service");
const staffRoute = require("./admin/staff");
const userAdminRoute = require("./admin/user");
const categoryRoute = require("./admin/category");
const mysteryroute = require("./admin/mystery");
const offerRoute = require("./admin/offer");
const notificationroute = require("./admin/notification");
const adminbookingRoute = require("./admin/booking");
const adminSubscribeRoute = require("./admin/subscription");
const adminCouponRoute = require("./admin/coupon");
const settingRoute = require("./admin/setting");

////////
const custsaloonRoute = require("./customer/saloon");
const authCustomerRoute = require("./customer/auth");
const userCustRoute = require("./customer/user");
const bookingRoute = require("./customer/booking");
const CustserviceRoute = require("./customer/service");
const CustsubscribeRoute = require("./customer/subscription");
const CustwalletRoute = require("./customer/wallet");
const CustgiftvocherRoute = require("./customer/giftvoucher");
const custnotificationRoute = require("./customer/notification");

////////

const saloonAuthRoute = require("./saloon/auth");
const saloonBookingRoute = require("./saloon/booking");
const saloonUserRoute = require("./saloon/user");
/////
const cityRoute = require("./admin/city");
const paymentRoute = require("./admin/paymentOption");
const menuRoute = require("./menu");

/////Admin

router.use("/", authAdminRoute);
router.use("/saloon", adminsaloonRoute);
router.use("/mystery", mysteryroute);
router.use("/", offerRoute);
router.use("/notification", notificationroute);
router.use("/", adminbookingRoute);
router.use("/", serviceRoute);
router.use("/", staffRoute);
router.use("/category", categoryRoute);
router.use("/user", userAdminRoute);
router.use("/", adminSubscribeRoute);
router.use("/coupon", adminCouponRoute);
router.use("/settings", settingRoute);

///customer
router.use("/", authCustomerRoute);
router.use("/users", userCustRoute);
router.use("/customer/saloon", custsaloonRoute);
router.use("/customer/booking", bookingRoute);
router.use("/customer", CustserviceRoute);
router.use("/", CustsubscribeRoute);
router.use("/customer", CustwalletRoute);
router.use("/customer/giftvoucher", CustgiftvocherRoute);
router.use("/customer/notificationstate", custnotificationRoute);
///Saloon Route

router.use("/saloon", saloonAuthRoute);
router.use("/saloon", saloonBookingRoute);
router.use("/saloon", saloonUserRoute);
////common Route
router.use("/", menuRoute);
router.use("/", cityRoute);
router.use("/", paymentRoute);

module.exports.router = router;
