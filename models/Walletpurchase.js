const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WalletpurchaseSchema = new mongoose.Schema({
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
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  products: [
    {
      name: {
        type: String,
      },
      price: {
        type: Number,
      },
    },
  ],
  paymentStatus: {
    type: String,
  },
  type: { type: String, enum: ["TopUp", "Booking", "Store", "Gift Voucher"] },
  message: { type: String },
  isWallet: { type: Boolean },
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

const Walletpurchase = mongoose.model("Walletpurchase", WalletpurchaseSchema);

module.exports = Walletpurchase;
