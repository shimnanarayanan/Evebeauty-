const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MysterySchema = new Schema(
  {
    name: {
      english: {
        type: String,
        index: true,
      },
      arabic: {
        type: String,
      },
    },
    price: { type: String },
    paymentTerm: {
      type: String,
      // default: "Monthly"
    },
    description: {
      english: {
        type: String,
      },
      arabic: {
        type: String,
      },
    },
    mainImage: { type: String },
    status: { type: String, default: "Active" },
  },
  { timestamps: true }
);

const Mystery = mongoose.model("Mystery", MysterySchema);

module.exports = Mystery;
