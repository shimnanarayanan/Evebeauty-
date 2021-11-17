const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");

const ServiceSchema = new Schema(
  {
    saloon: { type: Schema.Types.ObjectId, required: true, ref: "Saloon" },
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    name: {
      english: {
        type: String,
        required: true,
        index: true,
      },
      arabic: {
        type: String,
      },
    },
    price: { type: String },
    time_limit: { type: String },
    homeService: { type: Boolean },
    status: { type: String, default: "Active" },
  },

  { timestamps: true }
);
ServiceSchema.virtual("Staff", {
  ref: "Staff",
  localField: "_id",
  foreignField: "services",
  match: { status: "Active" },
});

ServiceSchema.virtual("Offer", {
  ref: "Offer",
  localField: "_id",
  foreignField: "service",
  match: {
    status: "Active",
    endDate: { $gte: moment().subtract(1, "day").toDate() },
  },
});

ServiceSchema.set("toObject", { virtuals: true });
ServiceSchema.set("toJSON", { virtuals: true });

const Services = mongoose.model("Services", ServiceSchema);

module.exports = Services;
