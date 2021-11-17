const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");

const Saloon = require("../../models/Saloon");

const Menu = require("../../models/Menu");
const handleError = require("../../utils/helpers").handleErrors;

const validationSignin = require("../../config/validation-attributes.json")
  .signin;
const validateInputs = require("../../utils/helpers").validateInputs;
const _ = require("lodash");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { sendMail } = require("../../utils/email");

module.exports = {
  login: async (req, res) => {
    try {
      let inputParams = req.body;

      const user = await User.findOne({
        username: inputParams.username.toLowerCase(),
        type: inputParams.type,
      }).exec();

      if (user) {
        if (inputParams.fcm_token) {
          user.fcm_token = inputParams.fcm_token;
          await user.save();
        }
        const match = await bcrypt.compare(inputParams.password, user.password);
        if (match) {
          const saloon = await Saloon.findOne(
            {
              user: user._id,
            },
            { _id: 1, verificationStatus: 1, status: 1, name: 1, nameAr: 1 }
          );
          if (!saloon) {
            return res.status(400).send({
              message: "Login Failed",
            });
          }
          if (
            (saloon.verificationStatus == true &&
              saloon.status == "Inactive") ||
            (saloon.verificationStatus == false && saloon.status == "Active") ||
            (saloon.verificationStatus == false && saloon.status == "Inactive")
          ) {
            return res.status(400).send({
              message: "Salon not Verified",
            });
          }
          const privateKey = process.env.JWT_SECRET;
          const token = jwt.sign(
            { USER_ID: user._id, USER_TYPE: user.type },
            privateKey
          );

          return res.status(200).send({
            message: "Login Success",
            data: { user, saloon, token },
          });
        }
        else {
          return res.status(400).send({
            message: "Login Failed.Password Mismatch",
          });
        }
      }
      else {
        return res.status(400).send({
          message: "Login Failed. User does not exist",
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

  forgotPassword: async (req, res) => {
    try {
      let inputParams = req.body;
      if (inputParams.username && inputParams.type) {
        const user = await User.findOne({
          username: inputParams.username,
          type: inputParams.type,
        }).exec();

        if (user) {
          const key = uuidv4();
          user.forgotPassword = {
            key,
            date: Date.now(),
          };
          user.save();
          const params = new URLSearchParams({
            key,
            user: user._id,
          }).toString();

          const mailData = {
            from: "admin@evebeauty.qa",
            to: `${user.email}`,
            subject: "Evebeauty Forgot Password",
            html:
              '<p>Click <a href="#' +
              params +
              '">here</a> to reset your password</p>',
          };
          sendMail(mailData);

          return res.status(200).send({
            message: "A reset link has been sent",
          });
        }

        return res.status(400).send({
          message: "User not found",
        });
      } else {
        return res.status(400).send({
          message: "Username and Type field is required",
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

  forgotPasswordValidate: async (req, res) => {
    try {
      const userId = req.query.user;
      const key = req.query.key;
      const user = await User.findOne({
        _id: userId,
        "forgotPassword.key": key,
      });

      if (user) {
        return res.status(200).send({
          message: "Success",
        });
      } else {
        return res.status(400).send({
          message: "Failed",
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

  changePassword: async (req, res, next) => {
    let user;
    try {
      user = await User.findById(req.auth._id);

      if (!user) {
        return res.status(400).json({
          message: "User not found",
        });
      }
      const currentpassword = req.body.currentpassword;

      const match = await bcrypt.compare(currentpassword, user.password);
      if (match) {
        const password1 = req.body.newPassword;
        const password2 = req.body.confirmPassword;
        if (password1 === password2) {
          user.password = bcrypt.hashSync(password1, 10);

          await user.save();
          return res.status(200).json({
            message: "Password has been Changed",
          });
        } else {
          return res.status(400).json({
            message: "Password Mismatch",
          });
        }
      } else {
        return res.status(400).json({
          message: "Current Password is Incorrect!",
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

  verificationStatus: async (req, res) => {
    try {
      const id = req.params.id;
      const saloon = await Saloon.findById(id).select("verificationStatus");

      return res.status(200).send({
        message: "Success",
        data: saloon,
      });
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,

        message,
      });
    }
  },
  validator: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;
    const inputValidation = await validateInputs(inputParams, validationSignin);

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
