const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");

const userController = require("../../controllers/customer/userController");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");
const folder = "profiles";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router
  .route("/profiles")
  .put(
    upload.fields([{ name: "mainImage", maxCount: 1 }]),
    auth,
    userValidate(),
    userController.update
  );
router.route("/profiles").get(auth, userValidate(), userController.details);
router.route("/refer").post(auth, userValidate(), userController.referFriend);

module.exports = router;

function userValidate() {
  const allowedUser = ["customer"];
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
