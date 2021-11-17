const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SaloonSchema = new Schema(
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
    email: { type: String },
    phone: { type: String },
    type: {
      type: String,
      enum: ["salon", "spa"],
    },
    commission: {
      type: String,
    },

    address: {
      english: {
        type: String,
      },
      arabic: {
        type: String,
      },
    },
    coordinates: {
      type: [Number],
      index: "2dsphere",
      default: [0, 0],
    },
    description: {
      english: {
        type: String,
      },
      arabic: {
        type: String,
      },
    },
    country: {
      type: Object,
      default: {
        english: "Qatar",
        arabic: "دولة قطر",
      },
    },
    maxCustomer: { type: String },
    homeService: { type: Boolean, default: false },
    recommended: { type: Boolean, default: false, index: true },
    city: { type: Schema.Types.ObjectId, ref: "City" },
    paymentOptions: [{ type: Schema.Types.ObjectId, ref: "PaymentOption" }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mainImage: { type: String },
    profileImage: { type: String },
    additionalImages: { type: Array },
    documents: { type: Array },
    workingHours: {
      type: Object,
    },
    cancel_time: { type: Number },
    cancel_deduction_amount: { type: Number },

    holidays: {
      type: [String],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Delete"],
      default: "Active",
    },
    verificationStatus: {
      type: Boolean,
      default: false,
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

SaloonSchema.virtual("Services", {
  ref: "Services",
  localField: "_id",
  foreignField: "saloon",
});

SaloonSchema.set("toObject", { virtuals: true });
SaloonSchema.set("toJSON", { virtuals: true });

const Saloon = mongoose.model("Saloon", SaloonSchema);

module.exports = Saloon;
