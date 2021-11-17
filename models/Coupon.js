const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CouponSchema = new Schema(
  {
    title: {
      english: {
        type: String,
        index: true,
      },
      arabic: {
        type: String,
      },
    },
    description: {
      english: {
        type: String,
        index: true,
      },
      arabic: {
        type: String,
      },
    },
    fromDate: { type: Date },
    toDate: {
      type: Date,
    },
    couponCode: { type: String },
    discount_type: {
      type: String,
      enum: ["fixed", "percentage"],
    },
    discount: {
      type: Number,
    },
    min_amount: {
      type: Number,
      default: 0,
    },
    max_amount_of_discount: {
      type: Number,
    },
    expiry: {
      type: Boolean,
    },
    usage_peruser: {
      type: Number,
    },
    total_users: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Delete"],
      default: "Active",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", CouponSchema);

module.exports = Coupon;
