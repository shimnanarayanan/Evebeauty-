const express = require("express");
const router = new express.Router();

const notificationController = require("../../controllers/admin/notificationController");

const auth = require("../../middlewares/auth");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "notification";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router
  .route("/")
  .post(
    upload.fields([{ name: "mainImage", maxCount: 1 }]),
    auth,
    userValidate(),
    notificationController.validate,
    notificationController.create
  )
  .get(auth, userValidate(), notificationController.list);
router.get("/:id", auth, userValidate(), notificationController.details);

router.put(
  "/:id",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    // { name: "additionalImages", maxCount: 10 },
  ]),
  auth,
  userValidate(),
  notificationController.update
);

router.delete("/:id", auth, userValidate(), notificationController.delete);

router.get(
  "/list/pushlist",
  auth,
  userValidate(),
  notificationController.pushList
);
router.put(
  "/mark/allread/list",
  auth,
  userValidate(),
  notificationController.setAllread
);
router.put(
  "/notify/status/:nid",
  auth,
  userValidate(),
  notificationController.notify
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
