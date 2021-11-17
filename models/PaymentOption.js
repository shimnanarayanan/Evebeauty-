const mongoose = require("mongoose");

const PaymentOptionSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  typeAr: {
    type: String,
  },
});

const PaymentOption = mongoose.model("PaymentOption", PaymentOptionSchema);

module.exports = PaymentOption;
