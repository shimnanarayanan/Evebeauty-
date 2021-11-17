const express = require("express");
const router = new express.Router();

const mysteryController = require("../../controllers/admin/mysteryController");

const auth = require("../../middlewares/auth");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "mystery";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router
  .route("/")
  .post(
    upload.fields([{ name: "mainImage", maxCount: 1 }]),
    auth,
    userValidate(),
    mysteryController.validate,
    mysteryController.create
  )
  .get(auth, userValidate(), mysteryController.list);
router.get("/:id", auth, userValidate(), mysteryController.details);

router.put(
  "/:id",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    // { name: "additionalImages", maxCount: 10 },
  ]),
  auth,
  userValidate(),
  mysteryController.update
);

router.delete("/:id", auth, userValidate(), mysteryController.delete);

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
