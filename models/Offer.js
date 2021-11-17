const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OfferSchema = new Schema(
  {
    saloon: { type: Schema.Types.ObjectId, required: true, ref: "Saloon" },
    service: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Service",
    },
    name: {
      english: {
        type: String,
        index: true,
      },
      arabic: {
        type: String,
      },
    },
    discount_amount: {
      type: Number,
      required: true,
    },
    description: {
      english: {
        type: String,
      },
      arabic: {
        type: String,
      },
    },
    startDate: { type: Date },
    endDate: { type: Date },
    order: { type: Number, default: 0, index: true },
    mainImage: { type: String },
    status: { type: String, default: "Active" },
  },
  { timestamps: true }
);

const Offer = mongoose.model("Offer", OfferSchema);

module.exports = Offer;
