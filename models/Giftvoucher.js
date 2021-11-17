const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GiftvoucherSchema = new mongoose.Schema({
  transactionID: {
    type: String,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  amount: {
    type: Number,
  },
  paymentStatus: {
    type: String,
  },
  redeemStatus: {
    type: String,
  },
  expireDate: { type: Date },
  giftCode: { type: String },
  redeemedUserId: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Giftvoucher = mongoose.model("Giftvoucher", GiftvoucherSchema);

module.exports = Giftvoucher;
