const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: {
      type: String,
    },
    name: { type: String, index: true },
    nameAr: { type: String, index: true },
    password: { type: String },
    email: { type: String },
    phone: { type: String },
    phoneAr: { type: String },
    otp: { type: String },
    type: {
      type: String,
      enum: ["superadmin", "admin", "customer", "saloon"],
      required: true,
    },
    dob: { type: Date },
    address: { type: String },
    token: { type: String },
    fcm_token: { type: String },
    recoveryOtp: { type: Number },
    language: { type: String, default: "en" },
    recoveryOtpExpired: { type: Boolean },
    forgotPassword: {
      type: Object,
    },
    fcm_token: {
      type: String,
    },
    storeId: {
      type: String,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    mainImage: { type: String },
    profileImage: { type: String },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, default: "Active" },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.token;

  return userObject;
};

userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign(
    { USER_ID: user._id, USER_TYPE: user.type },
    process.env.JWT_SECRET
  );

  return token;
};

userSchema.statics.findByCredentials = async function (username) {
  const user = await User.findOne({
    $or: [{ email: username }, { phone: username }],
  });
  if (!user) {
    throw new Error("Unable to login. User not registered.");
  }

  return user;
};

const User = mongoose.model("Users", userSchema);

module.exports = User;
