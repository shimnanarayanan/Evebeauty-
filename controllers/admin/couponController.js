const Coupon = require("../../models/Coupon");
const UserCoupons = require("../../models/UserCoupon");
const User = require("../../models/User");

const handleError = require("../../utils/helpers").handleErrors;
const moment = require("moment");
const axios = require("axios");

module.exports = {
  create: async (req, res, next) => {
    try {
      let inputParams = req.body;
      // const code = CouponCode(10);

      const couponCode = await Coupon.findOne({
        couponCode: inputParams.couponCode,
      });

      if (couponCode) {
        return res.status(400).send({
          message: "Couponcode Already added",
        });
      }

      const coupon = await Coupon.create(inputParams);

      return res.status(200).send({
        message: "Coupon added successfully.",
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  list: async (req, res, next) => {
    try {
      let pagination;

      if (!req.query.pagination) {
        pagination = {};
      } else {
        pagination = JSON.parse(req.query.pagination);
      }
      const [coupon] = await Promise.all([
        Coupon.find().limit(pagination.limit).skip(pagination.skip),
      ]);

      return res.status(200).send({
        message: "Coupon Details",
        data: coupon,
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
  details: async (req, res, next) => {
    try {
      const id = req.params.id;

      const coupon = await Coupon.findById(id)
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            data.usercoupon = await UserCoupons.find({
              coupon: data._id,
            }).populate({
              path: "user",
              model: User,
              select: { name: 1 },
            });
          }
          return data;
        });
      return res.status(200).send({
        message: "Coupon Details",
        data: coupon,
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

  update: async (req, res) => {
    try {
      let inputParams = req.body;
      const id = req.params.id;

      let coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(400).send({
          message: "Coupon not found!",
        });
      }

      const newcoupon = await Coupon.findOneAndUpdate(
        { _id: id },
        inputParams,
        {
          new: true,
        }
      );
      return res.status(200).send({
        message: "Coupon updated successfully.",
        data: newcoupon,
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
  delete: async (req, res) => {
    try {
      const id = req.params.id;

      Coupon.findOneAndRemove({ _id: id }).exec(function (err, data) {
        if (err) {
          return res.status(400).send({
            error: err,
            message: "Coupon delete failed.",
          });
        }
        console.log(data);
        if (!data) {
          return res.status(400).send({
            error: err,
            message: "Coupon delete failed.",
          });
        }

        return res.status(200).send({
          message: "Coupon deleted successfully.",
        });
      });
    } catch (error) {
      return res.status(400).send({
        error: error,
        message: "Coupon delete failed.",
      });
    }
  },
};

function CouponCode(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
