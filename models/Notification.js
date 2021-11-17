const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    saloon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Saloon",
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    name: {
      english: {
        type: String,
        index: true,
      },
    },
    dateTime: { type: Date, default: Date.now },
    time: {
      type: String,
    },
    description: {
      english: {
        type: String,
      },
      arabic: {
        type: String,
      },
    },
    // status: {
    //   type: String,
    //   default: "Active",
    //   index: true,
    // },
    image: {
      type: String,
    },
    notificationType: {
      type: String,
      enum: ["Booking", "Reminder", "Cancel", "Update", "Inactive","Referal"],
    },
    readUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    common: {
      type: Boolean,
    },
    sendStatus: {
      type: Boolean,
      default: false,
    },
    dateStatus: {
      type: Boolean,
    },
    userType: {
      type: String,
      enum: ["saloon", "admin", "customer"],
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

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
