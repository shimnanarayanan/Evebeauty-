const Saloon = require("../../models/Saloon");
const Staff = require("../../models/Staff");
const Services = require("../../models/Service");
const Offer = require("../../models/Offer");
const Mystery = require("../../models/Mystery");
const Category = require("../../models/Category");
const _ = require("lodash");
const moment = require("moment");
const handleError = require("../../utils/helpers").handleErrors;
const Coupon = require("../../models/Coupon");
const UserCoupon = require("../../models/UserCoupon");
const UserCoupons = require("../../models/UserCoupon");
const request = require("request");
const User = require("../../models/User");
const axios = require("axios");
var FormData = require('form-data');
module.exports = {
  Offerlist: async (req, res, next) => {
    try {
      let saloon = await Saloon.findById(req.params.saloon);

      if (!saloon) {
        return res.status(404).json({
          message: "Saloon Id not Found",
        });
      }
      let offer = await Offer.find(
        {
          saloon: req.params.saloon,
          status: "Active",
          endDate: { $gte: moment().subtract(1, "day").toDate() },
        },
        { saloon: 0 }
      )
        .sort({
          order: 1,
        })
        .populate({
          path: "service",
          model: Services,
          select: { name: 1 },
        });

      return res.status(200).send({
        message: "Offer details",
        data: offer,
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
  OfferlistByCategory: async (req, res, next) => {
    try {
      let service = await Services.find({
        category: req.body.category,
        status: "Active",
      });

      let offer = await Offer.find({
        service: service,
        status: "Active",
        endDate: { $gte: moment().subtract(1, "day").toDate() },
      });
      return res.status(200).send({
        message: "Offer details",
        data: offer,
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
  ServicelistBySaloon: async (req, res, next) => {
    try {
      let saloon = await Saloon.findById(req.params.id);

      if (!saloon) {
        return res.status(404).json({
          message: "Saloon Id not Found",
        });
      }
      let services = await Services.find({
        saloon: req.params.id,
        status: "Active",
      })
        .populate({
          path: "category",
          match: { status: "Active" },
          select: { _id: 0, Icon: 0 },
        })
        .populate({
          path: "Staff",

          // select: { services: 0 },
        })
        .populate("Offer");

      let filteredService = services.filter((value, index, array) => {
        return value.category != null;
      });

      return res.status(200).send({
        message: "Service details",
        data: filteredService,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  ServicelistBySaloonIos: async (req, res, next) => {
    try {
      let service = await Services.find({
        saloon: req.params.id,
        status: "Active",
      }).populate("Staff");

      let category = await Category.find({ status: "Active" });
      let merged = [];
      let homeCate = {
        name: {
          english: "Home Service",
          arabic: "",
        },
        _id: null,
        services: [],
        homeService: true,
      };

      for (cat of category) {
        let cate = {
          name: cat.name,
          _id: cat._id,
          services: [],
          homeService: cat.homeService,
        };

        for (ser of service) {
          if (
            ser.category.toString() === cat._id.toString() &&
            !ser.homeService
          ) {
            cate.services.push(ser);
          }
        }
        if (cate.services.length != 0) {
          merged.push(cate);
        }
      }

      for (ser of service) {
        if (ser.homeService) {
          homeCate.services.push(ser);
        }
      }
      if (homeCate.services.length != 0) {
        merged.push(homeCate);
      }

      return res.status(200).send({
        message: "Service details",
        data: merged,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  Servicelist: async (req, res, next) => {
    try {
      let services = await Services.find({
        category: req.params.category,
        status: "Active",
      });

      return res.status(200).send({
        message: "Service details",

        data: services,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  Mysterylist: async (req, res, next) => {
    try {

      if (req.auth.type == "customer") {

        let user = await User.findById(req.auth._id);
          let data = {
          firebaseToken: user.fcm_token || "",
        };
       
        let token = req.header("Authorization").split(" ")[1];
        let config = {
          headers: { 'Authorization': `Bearer ${token}`}
        };

          axios
          .post(
            "https://storepaneldev.evebeauty.qa/api/General/FCMTokenChekAndUpdate",
            data,
            config
          )
        
      }

      const mystery = await Mystery.find({ status: "Active" });

      return res.status(200).send({
        message: "Mystery Details",
        data: mystery,
      });
    } catch (error) {
      let message = await handleError(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },
  Categorylist: async (req, res, next) => {
    try {
      let filter;
      let category;
      if (!req.query.filter) {
        filter = {};
        category = await Category.find({ status: "Active" });
      } else {
        filter = filterQueries(JSON.parse(req.query.filter));
        category = await Category.find(filter.category);
      }

      return res.status(200).send({
        message: "Category Details",
        data: category,
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

  Couponlist: async (req, res, next) => {
    try {
      let amount = req.body.amount;
      let userId = req.auth._id;
      let coupon = await Coupon.find({
        status: "Active",
        // min_amount: { $lte: amount },
        max_amount_of_discount: { $gte: amount },
        toDate: { $gte: moment().subtract(1, "day").toDate() },
      })
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            for (i in data) {
              let userCoupons = await UserCoupons.find({
                coupon: data[i]._id,
              });
              console.log(userCoupons);
              let totalUsage = 0;

              userCoupons.map((element) => {
                totalUsage = totalUsage + element.total_usage;
              });

              let currentUserCoupon = await UserCoupons.findOne({
                user: userId,
                coupon: data[i]._id,
              });
              data[i].eligible =
                data[i].total_users > totalUsage &&
                data[i].usage_peruser >
                (currentUserCoupon == null
                  ? 0
                  : currentUserCoupon.total_usage);
            }
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

  CouponDetail: async (req, res, next) => {
    try {
      let userId = req.auth._id;
      let amount = req.query.amount;

      let couponCheck = await Coupon.findOne({
        couponCode: req.params.id,
        status: "Active",
        // max_amount_of_discount: { $gte: amount },
        toDate: { $gte: moment().subtract(1, "day").toDate() },
      });

      if (!couponCheck) {
        return res.status(400).send({
          message: "Invalid Coupon",
        });
      }
      if (couponCheck.max_amount_of_discount < amount) {
        return res.status(400).send({
          message: "Coupon not applicable",
        });
      }

      let coupon = await Coupon.findOne({
        couponCode: req.params.id,
        status: "Active",
        max_amount_of_discount: { $gte: amount },
        toDate: { $gte: moment().subtract(1, "day").toDate() },
      })
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            let userCoupons = await UserCoupons.find({
              coupon: data._id,
            });

            let totalUsage = 0;

            userCoupons.map((element) => {
              totalUsage = totalUsage + element.total_usage;
            });

            let currentUserCoupon = await UserCoupons.findOne({
              user: userId,
              coupon: data._id,
            });
            data.eligible =
              // data.total_users > totalUsage &&
              data.usage_peruser >
              (currentUserCoupon == null ? 0 : currentUserCoupon.total_usage);
            data.total = data.total_users > totalUsage;
          }
          return data;
        });

      if (!coupon.eligible) {
        return res.status(400).send({
          message: "Coupon already used",
        });
      }

      if (!coupon.total) {
        return res.status(400).send({
          message: "Coupon usage limit has been reached",
        });
      }

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
};

function filterQueries(queryParams) {
  let filter = { ...queryParams };
  filter.status = "Active";
  const allowed = ["status", "homeService"];
  filter = _.pick(filter, allowed);

  return { category: filter };
}
