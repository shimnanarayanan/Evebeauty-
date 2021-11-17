const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
  cancel_time: {
    type: String,
  },
  cancel_deduction_amount: {
    type: String,
  },
  referalAmount: { type: Number },
  bookingInfo_mail: {
    type: String,
  },
  saloonInfo_mail: {
    type: String,
  },

  info_mail: {
    type: String,
  },
  workingHours: {
    type: Object,
  },
  privacyPolicy: {
    english: {
      type: String,
    },
    arabic: {
      type: String,
    },
  },
  aboutus: {
    english: {
      type: String,
      index: true,
    },
    arabic: {
      type: String,
      index: true,
    },
  },
  termsAndconditions: {
    english: {
      type: String,
      index: true,
    },
    arabic: {
      type: String,
      index: true,
    },
  },
});

const Setting = mongoose.model("Setting", SettingsSchema);

module.exports = Setting;
