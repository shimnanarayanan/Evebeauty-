const express = require("express");
const router = new express.Router();

const offerController = require("../../controllers/admin/offerController");

const auth = require("../../middlewares/auth");
const multer = require("multer");
const { multerStorage } = require("../../utils/helpers");

const folder = "offer";

var storage = multerStorage(multer, folder);

var upload = multer({ storage: storage });

router
  .route("/offer")
  .post(
    upload.fields([{ name: "mainImage", maxCount: 1 }]),
    auth,
    userValidate(),
    offerController.validate,
    offerController.create
  );

router.route("/offer/:saloon").get(auth, userValidate(), offerController.list);
router.route("/offers/:id").get(auth, userValidate(), offerController.details);

router.put(
  "/offer/:id",
  upload.fields([{ name: "mainImage", maxCount: 1 }]),
  auth,
  userValidate(),
  // offerController.validate,
  offerController.update
);

router.delete("/offer/:id", auth, userValidate(), offerController.delete);

module.exports = router;

function userValidate() {
  const allowedUser = ["admin", "superadmin", "saloon"];
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
