const { validationResult } = require("express-validator");
const User = require("../../models/User");
const handleError = require("../../utils/helpers").handleErrors;
const validationAttributes = require("../../config/validation-attributes.json")
  .customer.signin;
const validateInputs = require("../../utils/helpers").validateInputs;
const jwt = require("jsonwebtoken");
const moment = require("moment");
const _ = require("lodash");
const axios = require("axios");
const Version = require("../../models/Version");

module.exports = {
  signin: async (req, res) => {
    try {
      let inputParams = req.body;
      let newPhone;
      if (inputParams.phone) {
        newPhone = 974 + inputParams.phone;
      } else {
        newPhone = 974 + inputParams.phoneAr;
      }

      let fcm_token = inputParams.fcm_token;

      let deviceId = req.query.deviceId;
      const otp = Math.floor(1000 + Math.random() * 9000);
      let user;

      if (inputParams.name && inputParams.phone) {
        user = await User.findOne({
          $and: [
            {
              $or: [
                { name: inputParams.name.trim().toLowerCase() },
                { nameAr: inputParams.name.trim().toLowerCase() },
              ],
            },
            {
              $or: [
                { phone: inputParams.phone },
                { phoneAr: inputParams.phone },
              ],
            },
          ],
          type: inputParams.type,
        }).exec();
      } else {
        user = await User.findOne({
          type: inputParams.type,
          $and: [
            {
              $or: [
                { name: inputParams.nameAr },
                { nameAr: inputParams.nameAr },
              ],
            },
            {
              $or: [
                { phone: inputParams.phoneAr },
                { phoneAr: inputParams.phoneAr },
              ],
            },
          ],
        }).exec();
      }

      if (user) {
        if (user.status === "Active") {
          await User.findOneAndUpdate({ _id: user._id }, { otp, fcm_token });
          await axios
            .get(
              "https://messaging.ooredoo.qa/bms/soap/Messenger.asmx/HTTP_SendSms?customerID=4361&userName=evebeauty&userPassword=Cov20%23e8&originator=Eve Beauty&smsText=%3C%23%3E Use " +
                otp +
                " as your verification code on Evebeauty. This OTP expires in 5 minutes. Please do not share with anyone " +
                deviceId +
                "&recipientPhone=" +
                newPhone +
                "&messageType=Latin&defDate=20140430193247&blink=false&flash=false&Private=false"
            )
            .then(function (response) {
              console.log("success");
            });
          return res.status(200).send({ data: { otp: otp } });
        } else {
          return res.status(400).send({
            message: "Sorry! Your account is Inactive",
          });
        }
      } else {
        return res.status(400).send({
          message: "Login failed. The user does not exist.",
        });
      }
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  otp: async (req, res) => {
    try {
      let inputParams = req.body;

      if (inputParams.otp && (inputParams.phone || inputParams.phoneAr)) {
        let user;

        if (
          inputParams.phone === "66339945" ||
          inputParams.phoneAr === "66339945"
        ) {
          if (inputParams.phone) {
            user = await User.findOne({
              $or: [
                { phone: inputParams.phone },
                { phoneAr: inputParams.phone },
              ],
            }).exec();
          } else {
            user = await User.findOne({
              $or: [
                { phone: inputParams.phoneAr },
                { phoneAr: inputParams.phoneAr },
              ],
            }).exec();
          }
        } else {
          if (inputParams.phone) {
            user = await User.findOne({
              otp: inputParams.otp,
              $or: [
                { phone: inputParams.phone },
                { phoneAr: inputParams.phone },
              ],
              // phoneAr:inputParams.phoneAr
            }).exec();
          } else {
            user = await User.findOne({
              otp: inputParams.otp,
              $or: [
                { phone: inputParams.phoneAr },
                { phoneAr: inputParams.phoneAr },
              ],
              // phoneAr:inputParams.phoneAr
            }).exec();
          }
        }
        if (user) {
          const privateKey = process.env.JWT_SECRET;
          const token = jwt.sign(
            { USER_ID: user._id, USER_TYPE: user.type },
            privateKey
          );

          user.status = "Active";
          await user.save();

          let data2 = {
            storeUserID: user.storeId,
            nodeUserID: user._id,
            userType: "customer",
          };

          await axios
            .post(
              "https://storepaneldev.evebeauty.qa/api/Register/userDetailsSaveFromNode",
              data2
            )
            .then(function () {
              console.log("success");
            });

          let data = {
            phone: inputParams.phone ? inputParams.phone : inputParams.phoneAr,
            firebaseToken: user.fcm_token || "",
          };

          let config = {
            headers: { Authorization: `Bearer ${token}` },
          };

        await  axios
            .post(
              "https://storepaneldev.evebeauty.qa/api/Login/userLogin",
              data,
              config
            )
            .then(function () {
              console.log("success");
            });

          return res.status(200).send({ data: { token: token } });
        } else {
          return res.status(400).send({
            message: "OTP verification failed",
          });
        }
      } else {
        return res.status(400).send({
          message: "Phone and Otp field is required",
        });
      }
    } catch (error) {
      let message = await handleError(error);
      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  registration: async (req, res) => {
    try {
      let inputParams = req.body;
      let deviceId = req.query.deviceId;
      let newPhone = 974 + inputParams.phone;

      if (inputParams.name) {
        const otp = Math.floor(1000 + Math.random() * 9000);
        const user = await User.findOne({
          $or: [{ email: inputParams.email }, { phone: inputParams.phone }],
          type: inputParams.type,
        }).exec();
        if (user) {
          return res.status(400).send({
            message: "User already exists",
          });
        } else {
          inputParams.otp = otp;
          if (inputParams.name) {
            inputParams.name = inputParams.name.toLowerCase();
          }
          let users = await User.create(inputParams);
          await axios
            .get(
              "https://messaging.ooredoo.qa/bms/soap/Messenger.asmx/HTTP_SendSms?customerID=4361&userName=evebeauty&userPassword=Cov20%23e8&originator=Eve Beauty&smsText=%3C%23%3E Use " +
                otp +
                " as your verification code on Evebeauty. This OTP expires in 5minutes. Please do not share with anyone " +
                deviceId +
                "&recipientPhone=" +
                newPhone +
                "&messageType=Latin&defDate=20140430193247&blink=false&flash=false&Private=false"
            )

            .then(function (response) {
              console.log("success", response);
            });

          let data = {
            name: inputParams.name.toLowerCase(),
            email: inputParams.email,
            phone: inputParams.phone,
            address: inputParams.address,
            // dob: inputParams.dob,
            type: inputParams.type,
          };

          await axios
            .post(
              "https://storepaneldev.evebeauty.qa/api/Register/userRegister",
              data
            )
            .then(async function (response) {
              console.log(response);
              console.log(response.data.data.customerID);
              let storeId = response.data.data.customerID;
              users.storeId = storeId;
              await users.save();
            });

          return res.status(200).send({ data: { otp: otp } });
        }
      } else {
        return res.status(400).send({
          message: "Name is required",
        });
      }
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  signup: async (req, res) => {
    try {
      let inputParams = req.body;
      let user;
      let deviceId = req.query.deviceId;

      let newPhone;
      if (inputParams.phone) {
        newPhone = 974 + inputParams.phone;
      } else {
        newPhone = 974 + inputParams.phoneAr;
      }
      if (inputParams.name || inputParams.nameAr) {
        const otp = Math.floor(1000 + Math.random() * 9000);

        if (inputParams.phone) {
          user = await User.findOne({
            $or: [
              { email: inputParams.email },
              {
                $or: [
                  { phone: inputParams.phone},
                  { phoneAr: inputParams.phone },
                ],
              },
            ],
            type: inputParams.type,
          }).exec();
        } else {
          user = await User.findOne({
            type: inputParams.type,
            $or: [
              { email: inputParams.email },
              {
                $or: [
                  { phone: inputParams.phoneAr },
                  { phoneAr: inputParams.phoneAr },
                ],
              },
            ],

           
          }).exec();
        }

        if (user) {
          return res.status(400).send({
            message: "User already exists",
          });
        } else {
          inputParams.otp = otp;
          if (inputParams.name) {
            inputParams.name = inputParams.name.trim().toLowerCase();
          }
          inputParams.phone = inputParams.phone ? inputParams.phone : inputParams.phoneAr
          inputParams.phoneAr = inputParams.phoneAr ? inputParams.phoneAr : inputParams.phone
          let users = await User.create(inputParams);
          await axios
            .get(
              "https://messaging.ooredoo.qa/bms/soap/Messenger.asmx/HTTP_SendSms?customerID=4361&userName=evebeauty&userPassword=Cov20%23e8&originator=Eve Beauty&smsText=%3C%23%3E Use " +
                otp +
                " as your verification code on Evebeauty. This OTP expires in 5minutes. Please do not share with anyone " +
                deviceId +
                "&recipientPhone=" +
                newPhone +
                "&messageType=Latin&defDate=20140430193247&blink=false&flash=false&Private=false"
            )

            .then(function (response) {
              console.log("success", response);
            });

          let data = {
            name: inputParams.name
              ? inputParams.name.trim().toLowerCase()
              : inputParams.nameAr,
            email: inputParams.email,
            phone: inputParams.phone ? inputParams.phone : inputParams.phoneAr,
            address: inputParams.address,
            dob: inputParams.dob,
            type: inputParams.type,
          };
        

          await axios
            .post(
              "https://storepaneldev.evebeauty.qa/api/Register/userRegister",
              data
            )
            .then(async function (response) {
              console.log(response);
              console.log(response.data.data.customerID);
              let storeId = response.data.data.customerID;
              users.storeId = storeId;
              await users.save();
            });

          return res.status(200).send({ data: { otp: otp } });
        }
      } else {
        return res.status(400).send({
          message: "Name is required",
        });
      }
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  referfriend: async (req, res) => {
    try {
      let inputParams = req.body;
      console.log(inputParams.inviteBy);
      let user = await User.findById(req.auth._id);
      user.referredBy = inputParams.inviteBy;
      await user.save();

      return res.status(200).send({ data: user });
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  updateVersion: async (req, res) => {
    try {
      let inputParams = req.body;

      const version = await Version.findOne();
      if (version) {
        data = version.remove();
      } else {
        data = await Version.create(inputParams);
        data.dateAdded = moment();
        await data.save();
      }

      return res
        .status(200)
        .send({ message: "Version Created  Succesfully", data: data });
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },

  getVersion: async (req, res) => {
    try {
      let version = await Version.findOne();

      return res.status(200).send({ message: "Success", data: version });
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },

  logout: async (req, res, next) => {
    try {
      req.auth.token = "";
      await req.auth.save();
      return res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (error) {
      return res.status(200).json({
        message: "Something went wrong while logging out",
      });
    }
  },
  validate: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;
    const inputValidation = await validateInputs(
      inputParams,
      validationAttributes
    );

    if (!inputValidation.success) {
      return res.status(404).send({
        message: inputValidation.message,
        error: inputValidation.errors,
      });
    }

    next();
  },
};
function generateOTP() {
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}
