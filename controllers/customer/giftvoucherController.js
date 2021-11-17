const User = require("../../models/User");
const Giftvoucher = require("../../models/Giftvoucher");
const ObjectId = require("mongoose").Types.ObjectId;
const Walletpurchase = require("../../models/Walletpurchase");
const Booking = require("../../models/Booking");
const validateInputs = require("../../utils/helpers").validateInputs;
const handleError = require("../../utils/helpers").handleErrors;
const capitalizeFirstLetter =
  require("../../utils/helpers").capitalizeFirstLetter;
const _ = require("lodash");
const moment = require("moment");
const axios = require("axios");

module.exports = {
  purchaseGiftvoucher: async (req, res) => {
    try {
      const id = req.auth._id;

      const code = giftcardcodeRandom(10);

      const newGiftvoucher = new Giftvoucher({
        user: req.auth._id,
        paymentStatus: "Pending",
        amount: req.body.amount,
        redeemStatus: "Not Redeem",
        giftCode: code,
      });
      await newGiftvoucher.save();
      let now = moment();

      let expiredVoucher = now.add("1", "year");

      newGiftvoucher.expireDate = expiredVoucher;
      await newGiftvoucher.save();

      return res.status(200).send({
        message: "Success",
        data: newGiftvoucher,
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
  payment: async (req, res) => {
    try {
      const id = req.auth._id;
      const orderId = req.query.orderId;
      let inputParams = req.body;

      let dataToPost = {
        token: "4c83944b-2313-4545-add1-528651af46fa",
        orderId: orderId,
        transactionID: req.body.transactionID,
        dataType: "json",
      };

      await axios
        .post("https://maktapp.credit/v3/CheckStatus", dataToPost)
        .then(async function (value) {
          let response = await CheckResponseStatus(value.data.result);
          console.log(value);

          if (response == "success") {
            let giftvoucher = await Giftvoucher.findOneAndUpdate(
              { _id: orderId },
              inputParams,
              {
                new: true,
              }
            );
            if (giftvoucher.paymentStatus === "Pending") {
              giftvoucher.paymentStatus = value.data.payment.Paymentstate;
              await giftvoucher.save();

              const newwallet = new Walletpurchase({
                user: giftvoucher.user,
                paymentStatus: value.data.payment.Paymentstate,
                amount: giftvoucher.amount,
                type: "Gift Voucher",
                isWallet: false,
              });
              await newwallet.save();
            }

            return res.status(200).send({
              message: "Payment Details",
              data: giftvoucher,
            });
          } else {
            return res.status(400).json({
              message: response,
            });
          }
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

  redeemGiftVoucher: async (req, res) => {
    try {
      let inputParams = req.body;
      let code = inputParams.giftCode;

      const id = req.auth._id;

      let giftvoucher = await Giftvoucher.findOne({ giftCode: code });
      if (!giftvoucher) {
        return res.status(400).send({
          message: "Gift voucher not found",
        });
      }

      let purchasedUser = giftvoucher.user;
      let voucherExpireDate = giftvoucher.expireDate;

      if (!purchasedUser) {
        return res.status(400).send({
          message: "User not found",
        });
      }

      if (moment(voucherExpireDate).isSame(moment(), "day")) {
        giftvoucher.redeemStatus = "Voucher Expired";
        await giftvoucher.save();
        return res.status(400).send({
          message: "Voucher Expired ",
        });
      }

      let redeemStatus = giftvoucher.redeemStatus;

      if (redeemStatus === "Redeemed") {
        return res.status(400).send({
          message: "Voucher Redeemed ",
        });
      }
      let redeemAmt = giftvoucher.amount;

      const user = await User.findById(id);
      if (user) {
        user.wallet = user.wallet + redeemAmt;
        await user.save();
        const newwallet = new Walletpurchase({
          user: user,
          paymentStatus: "SUCCESS",
          amount: redeemAmt,
          type: "TopUp",
          message: "Gift Voucher Redeemed Amount",
          isWallet: true,
        });
        await newwallet.save();
      }

      let giftvoch = await Giftvoucher.findOne({ giftCode: code });
      giftvoch.redeemStatus = "Redeemed";
      giftvoch.redeemedUserId = id;
      await giftvoch.save();

      return res.status(200).send({
        message: "Success",
        data: giftvoch,
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

  list: async (req, res) => {
    try {
      let filter, pagination, sort;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = await filterQueries(JSON.parse(req.query.filter));
      }
      if (!req.query.pagination) {
        pagination = {};
      } else {
        pagination = JSON.parse(req.query.pagination);
      }
      if (!req.query.sort) {
        sort = {};
      } else {
        sort = handleReportSort(JSON.parse(req.query.sort));
      }

      const [giftvoucher, itemCount] = await Promise.all([
        Giftvoucher.find(filter.giftvoucher)
          .populate({
            path: "redeemedUserId",
            model: User,
            select: { password: 0, mainImage: 0 },
          })
          .populate({
            path: "user",
            model: User,
            select: { password: 0, mainImage: 0 },
          })

          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip),
        Giftvoucher.find(filter.giftvoucher).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);
      console.log(giftvoucher);
      if (!giftvoucher) {
        return res.status(400).send({
          message: "No giftvoucher",
        });
      }
      return res.status(200).send({
        message: "Giftvoucher Details",
        data: giftvoucher,
        pageCount,
        itemCount,
        // pages: pagination.getArrayPages(req)(3, pageCount, pagination.page),
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

  userPurchasedGiftvoucher: async (req, res) => {
    try {
      let giftvoucher = await Giftvoucher.find({
        user: req.auth.id,
        paymentStatus: "SUCCESS",
      }).sort({ createdAt: -1 });

      return res.status(200).send({
        message: "Success",
        data: giftvoucher,
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
      let giftvoucher = await Giftvoucher.findById(req.params.id)
        .populate({
          path: "redeemedUserId",
          model: User,
          select: { password: 0, mainImage: 0 },
        })
        .populate({
          path: "user",
          model: User,
          select: { password: 0, mainImage: 0 },
        });
      return res.status(200).send({
        message: "Giftvoucher details",
        data: giftvoucher,
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

async function CheckResponseStatus(result) {
  let msg = "";
  switch (result) {
    case -1:
      msg =
        "Unauthorized -- API key is invaild(not Valid GUID), or no merchant for this token";
      break;
    case -2:
      msg = "Not Found -- The specified orderId could not be found.";
      break;
    case -3:
      msg =
        "Not Support -- merchnat application doesn't support the sent currency code.";
      break;
    case -7:
      msg =
        "Not Found -- there isn't any recurring or autosave payment in Fatora gateway for this merchant with the request parameter.";
      break;
    case -8:
      msg = "Invalid -- Token is not valid guid.";
      break;
    case -10:
      msg =
        "Bad Request -- required parameters requested aren't sent in request.";
      break;
    case -20:
      msg =
        "Not Found -- There isn't application data for the merchant for the sent currency in payment gateway.";
      break;
    case -21:
      msg = "Not Support -- payment gateway doesn't support void payment";
      break;
    default:
      msg = "success";
      break;
  }
  // alert(msg);

  return msg;
}

async function filterQueries(queryParams) {
  let filter = { ...queryParams };
  const allowed = [
    "redeemStatus",
    "fromDate",
    "toDate",
    "currdate",
    "createdAt",
    "user",
    "expireDate",
  ];
  filter = _.pick(filter, allowed);
  if (filter.fromDate && filter.toDate) {
    filter.createdAt = {
      $gte: filter.fromDate,
      $lte: filter.toDate,
    };
  }
  delete filter.fromDate;
  delete filter.toDate;

  if (filter.expiry) {
    const exfromDate = moment(filter.expiry, "YYYY-MM-DD HH:mm:ss");
    const extoDate = moment(filter.expiry, "YYYY-MM-DD HH:mm:ss").add(1, "d");
    // console.log("datewaise");

    filter.expiry = {
      $gte: exfromDate,
      $lt: extoDate,
    };
  }

  if (filter.user) {
    let userWhere = {};
    if (filter.user._id) {
      userWhere = {
        _id: filter.user._id,
      };
    }
    if (filter.user.name) {
      userWhere = {
        ...userWhere,
        name: {
          $regex: filter.user.name,
          $options: "i",
        },
      };
    }
    const users = await User.find(userWhere)
      .lean()
      .exec()
      .then((_a) => {
        return _a.map((_b) => _b._id).filter((_b) => _b);
      });
    console.log(users);
    delete filter.user;
    filter = {
      ...filter,
      user: { $in: users },
    };
  }

  return { giftvoucher: filter };
}

function handleReportSort(sortParams) {
  let sort = { ...sortParams };
  const allowed = ["createdAt"];
  sort = _.pick(sort, allowed);
  try {
    return sort;
  } catch (error) {
    console.error(error);
  }
}

function giftcardcodeRandom(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
