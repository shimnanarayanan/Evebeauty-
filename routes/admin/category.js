const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "category";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

const categoryController = require("../../controllers/admin/categoryController");

router
  .route("/")
  .post(
    upload.fields([{ name: "Icon", maxCount: 1 }]),
    auth,
    userValidate(),
    categoryController.create
  );
router.route("/").get(auth, userValidate(), categoryController.list);
router
  .route("/saloon")
  .get(auth, userValidate2(), categoryController.Categorylist);

router.route("/:id").get(auth, userValidate(), categoryController.details);

router.put(
  "/:id",
  upload.fields([{ name: "Icon", maxCount: 1 }]),
  auth,
  userValidate(),
  categoryController.update
);
router.route("/:id").delete(auth, userValidate(), categoryController.delete);

module.exports = router;

function userValidate() {
  const allowedUser = ["admin", "superadmin"];
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
