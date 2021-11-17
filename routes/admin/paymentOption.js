const express = require("express");
const router = express.Router();

const PaymentOption = require("../../models/PaymentOption");
const { handleErrors } = require("../../utils/helpers");

router.get("/paymentOptions", async (req, res) => {
  try {
    const paymentOptions = await PaymentOption.find();

    return res.status(200).send({
      message: "Success",
      data: paymentOptions,
    });
  } catch (error) {
    let message = await handleErrors(error);

    console.error(error);
    return res.status(400).send({
      error: error,

      message,
    });
  }
});

module.exports = router;
