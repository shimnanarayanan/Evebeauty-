const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const staffController = require("../../controllers/admin/staffController");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "staff";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router
  .route("/staff")
  .post(
    upload.fields([{ name: "mainImage", maxCount: 1 }]),
    auth,
    userValidate(),
    staffController.create
  );
router.route("/staff/:saloon").get(auth, userValidate(), staffController.list);
router.route("/staffs/:id").get(auth, userValidate(), staffController.details);

router
  .route("/staff/:id")
  .put(
    upload.fields([{ name: "mainImage", maxCount: 1 }]),
    auth,
    userValidate(),
    staffController.update
  );
router.route("/staff/:id").delete(auth, userValidate(), staffController.delete);
router
  .route("/staff/list/:services")
  .get(auth, userValidate(), staffController.listStaff);

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
