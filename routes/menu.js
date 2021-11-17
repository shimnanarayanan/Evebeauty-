const express = require("express");
const router = new express.Router();

const menuController = require("../controllers/menuController");

router
  .route("/menu")
  .post(menuController.create)

  .get(menuController.list);

router.put(
  "/:id",

  menuController.update
);

module.exports = router;
