const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserCouponSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  coupon: {
    type: Schema.Types.ObjectId,
    ref: "Coupon",
    required: true,
  },
  total_usage: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
const UserCoupons = mongoose.model("UserCoupons", UserCouponSchema);

module.exports = UserCoupons;
