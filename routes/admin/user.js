const express = require("express");
const router = new express.Router();
const { check } = require("express-validator");
const userController = require("../../controllers/admin/userController");
const auth = require("../../middlewares/auth");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "users";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router.route("/").post(userController.validate, userController.create);
router.route("/search").get(auth, userValidate(), userController.search);
router.route("/filter").get(auth, userValidate(), userController.searchCust);

router.route("/").get(auth, userValidate(), userController.list);
router.route("/:id").get(auth, userValidate(), userController.details);
router
  .route("/")
  .put(
    auth,
    upload.fields([{ name: "profileImage", maxCount: 1 }]),
    userValidate(),
    userController.update
  );

router.route("/:id").put(auth, userValidate(), userController.Userupdate);
router.route("/:id").delete(auth, userValidate(), userController.delete);

router.route("/export/customer").get(auth, userValidate(), userController.customerExport);

module.exports = router;

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
