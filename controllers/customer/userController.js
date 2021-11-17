const { validationResult } = require("express-validator");
const User = require("../../models/User");
const Saloon = require("../../models/Saloon");
const handleError = require("../../utils/helpers").handleErrors;
const removeFile = require("../../utils/helpers").removeFile;
const _ = require("lodash");
const filePath = "uploads/profiles";
const axios = require("axios");

module.exports = {
  update: async (req, res) => {
    try {
      let inputParams = JSON.parse(req.body.user);
      const id = req.auth._id;

      let user = await User.findById(id);
      if (!user) {
        return res.status(400).send({
          message: "User not found!",
        });
      }
      if (inputParams.name) {
        inputParams.name = inputParams.name.trim().toLowerCase();
      }

      if (inputParams.phone || inputParams.phoneAr) {
        let userPhoneExist = await User.findOne({
          $or: [
            { phone: inputParams.phone || inputParams.phoneAr },
            { phoneAr: inputParams.phoneAr || inputParams.phone },
          ],
          _id: { $nin: id },

          type: "customer",
        });

        if (userPhoneExist) {
          return res.status(400).send({
            message: "Phone number is already registered!",
          });
        }

      }

      if (inputParams.email) {
        let userEmailExist = await User.findOne({
          email: inputParams.email,
          type: "customer",
          _id:{$nin:id}
        });
        if (userEmailExist) {
          return res.status(400).send({
            message: "Email is already registered!",
          });
        }
      }

      inputParams = assignFiles(req.files, inputParams, user);
      if( inputParams.phone ||  inputParams.phoneAr){
        inputParams.phone = inputParams.phone ? inputParams.phone : inputParams.phoneAr
        inputParams.phoneAr = inputParams.phoneAr ? inputParams.phoneAr : inputParams.phone
      }
   

      const newUser = await User.findOneAndUpdate({ _id: id }, inputParams, {
        new: true,
      });

      let data={
          name:newUser.name ? newUser.name :newUser.nameAr,
          phone:newUser.phone ? newUser.phone :newUser.phoneAr,
          email:newUser.email
      }
   
     let token = req.header("Authorization").split(" ")[1];
      let config = {
        headers: { Authorization: `Bearer ${token}` },
      };

     await axios
        .put(
          "https://storepaneldev.evebeauty.qa/api/Myaccount/updateUser",
          data,
          config
        )  .then(function (response) {
          console.log(response);
        });

       

      return res.status(200).send({
        message: "User updated successfully.",
        data: newUser,
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
  details: async (req, res) => {
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
  referFriend: async (req, res) => {
    try {
      const id = req.auth._id;
      const API_KEY = "AIzaSyDjwgItEQUvTtWGn5yLKdDZymmppJrHlfc";

      let data = {
        // longDynamicLink: "https://evebeauty.page.link/?link=http://www.evebeauty.qa/?inviteBy="+id+"&apn=com.telet.evebeauty&ibi=com.telet.evebeauty&isi=1558837521&ofl=https://play.google.com/store/apps/details?id=com.telet.evebeauty",
        longDynamicLink:
          "https://evebeauty.page.link/?link=http://www.evebeauty.qa/?inviteBy=" +
          id +
          "&apn=com.telet.evebeauty&ibi=com.telet.evebeauty&isi=1558837521&ifl=https://apps.apple.com/qa/app/eve-beauty/id1558837521&ofl=https://play.google.com/store/apps/details?id=com.telet.evebeauty&ofl=https://apps.apple.com/qa/app/eve-beauty/id1558837521",
      };
      axios
        .post(
          "https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=" +
          API_KEY,
          data
        )
        .then(function (shortlink) {
          return res.status(200).send({
            message: "Refer Details",
            data: shortlink.data.shortLink,
          });
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
};

function assignFiles(files, inputParams, editObj = false) {
  let newParams = { ...inputParams };
  if (!editObj) {
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
    }
  } else {
    if (files.mainImage) {
      newParams.mainImage = `${filePath}/${files.mainImage[0].filename}`;
      removeFile(editObj.mainImage);
    }
  }

  return newParams;
}
