const express = require("express");
const router = new express.Router();

const couponController = require("../../controllers/admin/couponController");

const auth = require("../../middlewares/auth");

router
  .route("/")
  .post(auth, userValidate(), couponController.create)
  .get(auth, userValidate(), couponController.list);
router.get("/:id", auth, userValidate(), couponController.details);
router.put("/:id", auth, userValidate(), couponController.update);
router.delete("/:id", auth, userValidate(), couponController.delete);

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
