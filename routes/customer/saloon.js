const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const saloonController = require("../../controllers/customer/saloonController");

router.route("/").get(auth, userValidate(["guest"]), saloonController.list);
router
  .route("/:saloonId")
  .get(auth, userValidate(["guest"]), saloonController.listById);
router
  .route("/upcomingbookings/:saloon")
  .get(auth, userValidate(), saloonController.saloonUpcomingBookings);

router.route("/registration").post(saloonController.saloonRegistration);
router
  .route("/favourite")
  .post(auth, userValidate(), saloonController.favorites);
router
  .route("/user/favourites")
  .get(auth, userValidate(), saloonController.userFavorites);
router.get("/user/recently", auth, userValidate(), saloonController.recently);

router
  .route("/user/search")
  .get(auth, userValidate(["guest"]), saloonController.search);
router
  .route("/user/category")
  .get(auth, userValidate(["guest"]), saloonController.searchCat);
router
  .route("/user/filter")
  .post(auth, userValidate(["guest"]), saloonController.filter);
router
  .route("/user/filterdistance")
  .get(auth, userValidate(), saloonController.filterDistance);

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
