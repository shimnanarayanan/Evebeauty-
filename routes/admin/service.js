const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const serviceController = require("../../controllers/admin/serviceController");

router.route("/service").post(auth, userValidate(), serviceController.create);
router.route("/service/:id").get(auth, userValidate(), serviceController.list);
router
  .route("/service/saloon/:id")
  .get(auth, userValidate2(), serviceController.Servicelist);

router
  .route("/services/:id")
  .get(auth, userValidate(), serviceController.details);

router
  .route("/service/:id")
  .put(auth, userValidate(), serviceController.update);
router
  .route("/service/:id")
  .delete(auth, userValidate(), serviceController.delete);

module.exports = router;
function userValidate() {
  const allowedUser = ["admin", "superadmin", "saloon"];
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
