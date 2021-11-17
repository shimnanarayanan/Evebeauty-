const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const saloonController = require("../../controllers/admin/saloonController");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "saloons";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router
  .route("/")
  .post(
    auth,
    userValidate(),
    saloonController.validate,
    saloonController.create
  );
router.put(
  "/:id",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
    { name: "documents", maxCount: 10 },
  ]),
  auth,
  userValidate2(),
  // saloonController.validateUpdate,
  saloonController.update
);
router.route("/").get(auth, userValidate(), saloonController.list);
router.route("/search").get(auth, userValidate(), saloonController.search);

router.route("/:id").get(auth, userValidate2(), saloonController.details);

router.delete("/:id", auth, userValidate2(), saloonController.delete);
router
  .route("/:id/:status")
  .post(auth, userValidate(), saloonController.approval);
router
  .route("/images/:id")
  .delete(auth, userValidate2(), saloonController.deleteImages);
router.get(
  "/category/:id",
  auth,
  userValidate(),
  saloonController.categorylist
);

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

function userValidate2() {
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
