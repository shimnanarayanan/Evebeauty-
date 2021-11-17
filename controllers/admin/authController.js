const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const City = require("../../models/City");

const Saloon = require("../../models/Saloon");

const Country = require("../../models/Country");
const Menu = require("../../models/Menu");

const handleError = require("../../utils/helpers").handleErrors;
const validateInputs = require("../../utils/helpers").validateInputs;

const validationAttributes =
  require("../../config/validation-attributes.json").signin;
const FormData = require("form-data");
const axios = require("axios");
const request = require("request");

module.exports = {
  login: async (req, res) => {
    try {
      let inputParams = req.body;

      const user = await User.findOne({
        username: inputParams.username.toLowerCase(),
        type: inputParams.type,
      }).exec();
      // console.log(user);
      if (inputParams.type == "admin" || inputParams.type == "superadmin") {
        if (user) {
          const match = await bcrypt.compare(
            inputParams.password,
            user.password
          );
          if (match) {
            const privateKey = process.env.JWT_SECRET;
            const token = jwt.sign(
              { USER_ID: user._id, USER_TYPE: user.type },
              privateKey
            );

            const options = {
              method: "POST",
              url: "https://storepaneldev.evebeauty.qa/api/DirectLogin/tokenUpdate",

              formData: {
                userName: inputParams.username,
                token: token,
              },
            };
            request(options, function (error, response) {
              if (error) throw new Error(error);
              console.log(response.body);
            });

            return res.json({ token });
          } else {
            return res.status(400).send({
              message: "Login Failed.Password Mismatch",
            });
          }
        } else {
          return res.status(400).send({
            message: "Login Failed. User does not exist",
          });
        }
      } else {
        return res.status(400).send({
          message: "Login Failed",
        });
      }
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        success: false,
        message,
      });
    }
  },
  changePassword: async (req, res, next) => {
    let user;
    try {
      console.log(req.auth._id);
      user = await User.findById({
        _id: req.auth._id,
      });

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
        success: false,
        message,
      });
    }
  },
  profile: async (req, res) => {
    try {
      const id = req.auth._id;
      console.log(id);
      let user = await User.findById(id).select("-password");

      return res.status(200).send({
        message: "User Details",
        data: user,
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
