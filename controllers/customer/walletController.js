const Saloon = require("../../models/Saloon");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
// const ObjectId = require("mongoose").Types.ObjectId;
const Walletpurchase = require("../../models/Walletpurchase");
const ObjectId = require("mongoose").Types.ObjectId;
const bookingValidation =
  require("../../config/validation-attributes.json").booking;
const language = require("../../config/language.json");

const validateInputs = require("../../utils/helpers").validateInputs;
const handleError = require("../../utils/helpers").handleErrors;
const capitalizeFirstLetter =
  require("../../utils/helpers").capitalizeFirstLetter;
const Staff = require("../../models/Staff");
const Coupon = require("../../models/Coupon");
const Services = require("../../models/Service");
const Notification = require("../../models/Notification");
const Setting = require("../../models/Setting");
const admin = require("../../firebase").admin;
const _ = require("lodash");
const moment = require("moment");
const axios = require("axios");

module.exports = {
  purchaseWallet: async (req, res) => {
    try {
      const id = req.auth._id;

      const newwallet = new Walletpurchase({
        user: req.auth._id,
        paymentStatus: "Pending",
        amount: req.body.amount,
        type: "TopUp",
        isWallet: true,
      });
      await newwallet.save();

      return res.status(200).send({
        message: "Success",
        data: newwallet,
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
            let wallet = await Walletpurchase.findOneAndUpdate(
              { _id: orderId },
              inputParams,
              {
                new: true,
              }
            );

            if (wallet.paymentStatus === "Pending") {
              wallet.paymentStatus = value.data.payment.Paymentstate;
              if (value.data.payment.Paymentstate === "SUCCESS") {
                wallet.message = "Wallet TopUp";

                const user = await User.findById(id);
                if (user) {
                  user.wallet = user.wallet + wallet.amount;
                  await user.save();
                }
              }
              await wallet.save();
            }

            return res.status(200).send({
              message: "Payment Details",
              data: wallet,
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

  walletPayment: async (req, res) => {
    try {
      let inputParams = req.body;
      const id = req.auth._id;
      let bookingAmount = inputParams.amount;
      let bookid = inputParams.bookingID;

      let book = await Booking.findById(bookid);

      if (!book) {
        return res.status(400).send({
          message: "BookingId Not found ",
        });
      }
      let status = book.status;

      if (status === "Booked") {
        return res.status(400).send({
          message: "Already booked",
        });
      }

      const userCust = await User.findById(book.user);
      if (userCust) {
        if (bookingAmount <= userCust.wallet) {
          userCust.wallet = userCust.wallet - bookingAmount;
          await userCust.save();
        } else {
          return res.status(400).send({
            message: "Insufficient Balance",
          });
        }
      }

      const newwallet = new Walletpurchase({
        user: req.auth._id,
        paymentStatus: "SUCCESS",
        bookingId: bookid,
        amount: bookingAmount,
        type: "Booking",
        isWallet: true,
      });
      await newwallet.save();

      let booking = await Booking.findOneAndUpdate(
        { _id: bookid },
        inputParams,
        {
          new: true,
        }
      );

      booking.paymentStatus = "SUCCESS";
      booking.status = "Booked";
      await booking.save();

      if (inputParams.inviteBy) {
        let user = await User.findById(req.auth._id);
        let data = {
          userID: user.storeId,
        };
        let token = req.header("Authorization").split(" ")[1];
        let config = {
          headers: { Authorization: `Bearer ${token}` },
        };

        await axios
          .post(
            "https://storepaneldev.evebeauty.qa/api/cart/userOrderCount",
            data,
            config
          )
          .then(async function (response) {
            if (response.data.data.orderCount == 0) {
              let userbookings = await Booking.find({
                user: req.auth._id,
              });
              if (userbookings.length == 1) {
                let inviteuser = await User.findOne({
                  _id: inputParams.inviteBy,
                  status: "Active",
                });
                const settings = await Setting.findOne();
                let referAmount = settings.referalAmount;
                inviteuser.wallet = inviteuser.wallet + settings.referalAmount;
                await inviteuser.save();
                const newwallet = new Walletpurchase({
                  user: inviteuser,
                  paymentStatus: "SUCCESS",
                  amount: referAmount,
                  type: "TopUp",
                  message: "Referal Amount",
                  isWallet: true,
                });
                await newwallet.save();
                let messageBodyEn = language.referalBody.en
                  .replace(
                    "{Name}",
                    inviteuser.name == null
                      ? inviteuser.nameAr
                      : inviteuser.name
                  )
                  .replace("{Amount}", referAmount);

                let messageBodyAr = language.referalBody.ar
                  .replace(
                    "{Name}",
                    inviteuser.nameAr == null
                      ? inviteuser.name
                      : inviteuser.nameAr
                  )
                  .replace("{Amount}", referAmount);

                if (inviteuser.fcm_token) {
                  const registrationToken = inviteuser.fcm_token;

                  var message = {
                    notification: {
                      title:
                        inviteuser.language == "en"
                          ? language.referalTitle.en
                          : language.referalTitle.ar,
                      body:
                        inviteuser.language == "en"
                          ? messageBodyEn
                          : messageBodyAr,
                    },
                    data: {
                      notificationType: "Referal",
                      click_action: "FLUTTER_NOTIFICATION_CLICK",
                      title:
                        inviteuser.language == "en"
                          ? language.referalTitle.en
                          : language.referalTitle.ar,
                      body:
                        inviteuser.language == "en"
                          ? messageBodyEn
                          : messageBodyAr,
                    },
                  };

                  admin
                    .messaging()
                    .sendToDevice(registrationToken, message)
                    .then((response) => {
                      console.log("Success");
                    })
                    .catch((error) => {
                      console.log(error);
                    });
                }
                const newNotification = new Notification({
                  user: inviteuser._id,
                  userType: "customer",
                  notificationType: "Referal",
                  "name.english": language.referalTitle.en,
                  "description.english": messageBodyEn,
                  "name.arabic": language.referalTitle.ar,
                  "description.arabic": messageBodyAr,
                  image: "notifications/evebeauty.png",
                });
                await newNotification.save();

                user.wallet = user.wallet + settings.referalAmount;
                await user.save();
                const wallet = new Walletpurchase({
                  user: user,
                  paymentStatus: "SUCCESS",
                  amount: referAmount,
                  type: "TopUp",
                  message: "Referal Amount",
                  isWallet: true,
                });
                await wallet.save();
              }
            }
          });
      }

      await booking
        .populate({
          path: "coupon",
          model: Coupon,
          select: { discount_type: 1, discount: 1 },
        })
        .populate({
          path: "saloon",
          populate: [
            { path: "city" },

            {
              path: "paymentOptions",
            },
          ],
        })
        .populate({
          path: "booking_info.service",
          model: Services,
          select: { name: 1 },
        })
        .populate({
          path: "booking_info.staff",
          model: Staff,
          select: { name: 1 },
        })
        .execPopulate();
      let saloon = await Saloon.findById(booking.saloon);
      let saloonFcm = await User.findById(saloon.user);

      if (booking || userCust.fcm_token) {
        timeOfBook = booking.date;
        let messageBodyEn = language.confirmationBody.en
          .replace(
            "{Name}",
            userCust.name == null ? userCust.nameAr : userCust.name
          )
          .replace("{SalonName}", saloon.name.english)
          .replace("{Time}", timeOfBook);

        let messageBodyAr = language.confirmationBody.ar
          .replace(
            "{Name}",
            userCust.nameAr == null ? userCust.name : userCust.nameAr
          )
          .replace("{SalonName}", saloon.name.arabic)
          .replace("{Time}", timeOfBook);

        if (userCust.fcm_token) {
          const registrationToken = userCust.fcm_token;
          var message = {
            notification: {
              title:
                userCust.language == "en"
                  ? language.confirmationTitle.en
                  : language.confirmationTitle.ar,
              body: userCust.language == "en" ? messageBodyEn : messageBodyAr,
            },
            data: {
              id: `${booking._id}`,
              notificationType: "Booking",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              title:
                userCust.language == "en"
                  ? language.confirmationTitle.en
                  : language.confirmationTitle.ar,
              body: userCust.language == "en" ? messageBodyEn : messageBodyAr,
            },
          };
          admin
            .messaging()
            .sendToDevice(registrationToken, message)
            .then((response) => {
              console.log("Success");
            })
            .catch((error) => {
              console.log(error);
            });
        }

        const newNotification = new Notification({
          user: userCust._id,
          userType: "customer",
          notificationType: "Booking",
          "name.english": language.confirmationTitle.en,
          "description.english": messageBodyEn,
          "name.arabic": language.confirmationTitle.ar,
          "description.arabic": messageBodyAr,
          booking: booking._id,
          image: "notifications/booking.png",
        });
        await newNotification.save();

        const newNotification2 = new Notification({
          userType: "admin",
          notificationType: "Booking",
          "name.english": "New Booking Recieved",
          "description.english": `New booking request has been received from ${userCust.name} on ${timeOfBook} in ${saloon.name.english}`,
          booking: booking._id,
          image: "notifications/booking.png",
        });
        await newNotification2.save();
      }
      if (booking || saloonFcm.fcm_token) {
        timeOfBook = booking.date;
        if (saloonFcm.fcm_token) {
          const registrationToken = saloonFcm.fcm_token;
          var message = {
            notification: {
              title: "New Booking Confirmation",
              body: `Hi ${saloon.name.english}, We have received a booking request from ${userCust.name} on ${timeOfBook}`,
            },
            data: {
              id: `${booking._id}`,
              notificationType: "Booking",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              title: "New Booking Confirmation",
              body: `Hi ${saloon.name.english}, We have received a booking request from ${userCust.name} on ${timeOfBook}`,
            },
          };

          admin
            .messaging()
            .sendToDevice(registrationToken, message)
            .then((response) => {
              console.log("Success");
            })
            .catch((error) => {
              console.log(error);
            });
        }

        const newNotification3 = new Notification({
          userType: "saloon",
          notificationType: "Booking",
          "name.english": "New Booking Recieved",
          "description.english": `Hi ${saloon.name.english}, received a booking request from ${userCust.name} on ${timeOfBook}`,
          booking: booking._id,
          saloon: saloon._id,
          image: "notifications/booking.png",
        });
        await newNotification3.save();
      }

      return res.status(200).send({
        message: "Success",
        data: booking,
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

  StoreWalletPayment: async (req, res) => {
    try {
      let inputParams = req.body;
      const id = req.auth._id;
      let bookingAmount = inputParams.amount;
      let newwallet;

      if (inputParams.isWallet) {
        const userCust = await User.findById(id);
        if (userCust) {
          if (bookingAmount <= userCust.wallet) {
            userCust.wallet = userCust.wallet - bookingAmount;
            await userCust.save();
          } else {
            return res.status(400).send({
              message: "Insufficient Balance",
            });
          }
        }

        newwallet = new Walletpurchase({
          user: req.auth._id,
          paymentStatus: "SUCCESS",
          amount: bookingAmount,
          products: inputParams.products,
          type: "Store",
          isWallet: true,
        });
        await newwallet.save();
      } else {
        newwallet = new Walletpurchase({
          user: req.auth._id,
          paymentStatus: "SUCCESS",
          amount: bookingAmount,
          products: inputParams.products,
          type: "Store",
          isWallet: false,
        });
        await newwallet.save();
      }

      return res.status(200).send({
        message: "Success",
        data: newwallet,
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

  StoreCancelWalletRefund: async (req, res) => {
    try {
      let inputParams = req.body;

      let refund = inputParams.amount;
      let newwallet;

      const user = await User.findOne({ storeId: inputParams.userID });
      let userId = user._id;

      if (user) {
        user.wallet = user.wallet + +refund;
        await user.save();
      }
      let products = {
        name: inputParams.orderId,
        price: inputParams.amount,
      };

      newwallet = new Walletpurchase({
        user: userId,
        paymentStatus: "SUCCESS",
        amount: refund,
        type: "TopUp",
        message: "Order Cancel Refund",
        isWallet: true,
      });
      newwallet.products.push(products);
      await newwallet.save();

      return res.status(200).send({
        message: "Success",
        data: newwallet,
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

  UserWallet: async (req, res) => {
    try {
      let wallet = await Walletpurchase.find({
        user: req.auth._id,
        paymentStatus: "SUCCESS",
        isWallet: true,
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "bookingId",

          populate: [
            { path: "saloon", model: "Saloon", select: { name: 1 } },
            {
              path: "booking_info.service",
              model: "Services",
              select: { name: 1 },
            },
            {
              path: "coupon",
              model: "Coupon",
              select: { discount_type: 1, discount: 1 },
            },
          ],
        });
      return res.status(200).send({
        message: "Success",
        data: wallet,
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
  Usertransactions: async (req, res) => {
    try {
      let wallet = await Walletpurchase.find({
        user: req.auth.id,
        paymentStatus: "SUCCESS",
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "bookingId",

          populate: [
            { path: "saloon", model: "Saloon", select: { name: 1 } },
            {
              path: "booking_info.service",
              model: "Services",
              select: { name: 1 },
            },
            {
              path: "coupon",
              model: "Coupon",
              select: { discount_type: 1, discount: 1 },
            },
          ],
        });
      return res.status(200).send({
        message: "Success",
        data: wallet,
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
  Transactionlist: async (req, res) => {
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
      let [wallet, itemCount] = await Promise.all([
        Walletpurchase.find({
          user: req.params.id,
          // paymentStatus: "SUCCESS",
          ...filter.wallet,
        })
          .populate({
            path: "bookingId",
            populate: [
              { path: "saloon", model: "Saloon", select: { name: 1 } },
              {
                path: "booking_info.service",
                model: "Services",
                select: { name: 1 },
              },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(pagination.limit)
          .skip(pagination.skip),
        Walletpurchase.find(filter.wallet).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);
      return res.status(200).send({
        message: "Success",
        data: wallet,
        // pageCount,
        // itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page),
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

  TransactionDetails: async (req, res) => {
    try {
      let wallet = await Walletpurchase.findById(req.params.id).populate({
        path: "bookingId",
        populate: [
          { path: "saloon", model: "Saloon", select: { name: 1 } },
          {
            path: "booking_info.service",
            model: "Services",
            select: { name: 1 },
          },
        ],
      });
      return res.status(200).send({
        message: "Success",
        data: wallet,
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
  // filter.status = "Active";
  const allowed = ["createdAt"];
  filter = _.pick(filter, allowed);
  if (filter) {
    if (filter.createdAt) {
      const fromDate = moment(filter.createdAt, "YYYY-MM-DD HH:mm:ss");
      const toDate = moment(filter.createdAt, "YYYY-MM-DD HH:mm:ss").add(
        1,
        "d"
      );
      // console.log("datewaise");
      filter.createdAt = {
        $gte: fromDate,
        $lt: toDate,
      };
    }
  }
  return { wallet: filter };
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
