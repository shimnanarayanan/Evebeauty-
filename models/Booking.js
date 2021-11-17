const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookingSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  saloon: {
    type: Schema.Types.ObjectId,
    ref: "Saloon",
  },
  date: {
    type: String,
  },
  transactionID: {
    type: String,
  },
  totalAmount: {
    type: String,
  },
  coupon: {
    type: Schema.Types.ObjectId,
    ref: "Coupon",
  },
  subTotal:{
    type:String
  },
  paymentStatus: {
    type: String,
    enum: ["SUCCESS", "FAILURE", "Pay at Salon"],
  },
  status: {
    type: String,
    enum: ["Booked", "Pending", "Cancelled"],
    default: "Pending",
  },
  booking_info: [
    {
      service: {
        type: Schema.Types.ObjectId,
        ref: "Services",
      },
      staff: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
      },
      time: {
        type: String,
      },
      price: {
        type: String,
      },
      offer: {
        type: String,
      },
      discountAmount: {
        type: String,
      },
      discountPercentage: {
        type: String,
      },
    },
  ],

  cancelReason: {
    type: String,
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
});

const Booking = mongoose.model("Booking", BookingSchema);

module.exports = Booking;
