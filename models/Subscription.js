const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SubscriptionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  mystery: { type: Schema.Types.ObjectId, required: true, ref: "Mystery" },
  month: { type: String },
  amount: { type: String },
  expiry: { type: Date },
  transactionId: { type: String },
  cardToken: { type: String },
  paymentStatus: { type: String, default: "Pending" },
  status: { type: String, enum: ["Pending", "Subscribed", "Cancelled"] },
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

const Subscription = mongoose.model("Subscription", SubscriptionSchema);

module.exports = Subscription;
