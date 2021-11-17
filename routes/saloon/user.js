const express = require("express");
const router = new express.Router();
const auth = require("../../middlewares/auth");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "saloons";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

const userController = require("../../controllers/saloon/userController");
router.route("/customer/:id").get(auth, userValidate(), userController.list);

router.route("/user/:id").get(auth, userValidate(), userController.details);

router.put(
  "/profile/user",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  auth,
  userValidate(),
  // saloonController.validateUpdate,
  userController.profile
);
router
  .route("/notifications/:nid")
  .get(auth, userValidate(), userController.saloonNotifications);

router
  .route("/allread/:id")
  .put(auth, userValidate(), userController.setAllread);

router.put(
  "/notifications/read/:nid",
  auth,
  userValidate(),
  userController.setRead
);

function userValidate() {
  const allowedUser = ["saloon"];
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
