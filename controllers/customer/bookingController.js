const Saloon = require("../../models/Saloon");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const ObjectId = require("mongoose").Types.ObjectId;
const Walletpurchase = require("../../models/Walletpurchase");
const bookingValidation =
  require("../../config/validation-attributes.json").booking;
const language = require("../../config/language.json");
const validateInputs = require("../../utils/helpers").validateInputs;
const handleError = require("../../utils/helpers").handleErrors;
const capitalizeFirstLetter =
  require("../../utils/helpers").capitalizeFirstLetter;
const _ = require("lodash");
const Staff = require("../../models/Staff");
const Services = require("../../models/Service");
const moment = require("moment");
const axios = require("axios");
const Offer = require("../../models/Offer");
const Coupon = require("../../models/Coupon");
const UserCoupons = require("../../models/UserCoupon");
const Notification = require("../../models/Notification");
const Setting = require("../../models/Setting");
const admin = require("../../firebase").admin;
var cron = require("node-cron");

module.exports = {
  listStaffbyServices: async (req, res, next) => {
    try {
      let services = await Services.findById(req.params.id);

      if (!services) {
        return res.status(404).json({
          message: "Service Id not Found",
        });
      }
      let staff = await Staff.find(
        {
          services: services,
          status: "Active",
        },
        { name: 1 }
      );

      return res.status(200).send({
        message: "Staff details",
        services: services.name,
        data: staff,
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
  availability: async (req, res, next) => {
    try {
      let inputParams = req.body;
      const day = moment(inputParams.date, "YYYY-MM-DD")
        .format("dddd")
        .toLowerCase();

      const holidays = await Saloon.findOne(
        {
          _id: inputParams.saloon,
          holidays: capitalizeFirstLetter(day),
        },
        { holidays: 1 }
      );

      if (holidays) {
        return res.status(400).send({
          message: "Holiday",
        });
      }

      let date = moment(inputParams.date, "YYYY-MM-DD").format("YYYY-MM-DD");
      const saloon = await Saloon.findById(
        inputParams.saloon,
        `workingHours.${day}`
      );
      console.log(saloon);
      const service = await Services.findById(inputParams.service);

      const staff = await Staff.findById(inputParams.staff);
      let slots = service.time_limit;

      let m = slots % 60;

      let h = (slots - m) / 60;

      let HHMM = h.toString() + ":" + (m < 10 ? "0" : "") + m.toString();
      console.log(HHMM);

      console.log(slots);
      let from = saloon.workingHours[day].from;
      let to = saloon.workingHours[day].to;
      let value = {
        interval: HHMM,
        startTime: from,
        endTime: to,
      };

      let inputDataFormat = "HH:mm:ss";
      let outputFormat = "HH:mm a";
      let tmp = moment(value.interval, inputDataFormat);
      console.log(tmp);
      let dif = tmp - moment().startOf("day");
      let startIntervalTime = moment(value.startTime, inputDataFormat).add(
        dif,
        "ms"
      );
      let endIntervalTime = moment(value.startTime, inputDataFormat);
      let finishTime = moment(value.endTime, inputDataFormat);
      let intervals = [];
      while (startIntervalTime <= finishTime) {
        var format =
          endIntervalTime.format(outputFormat) +
          "-" +
          startIntervalTime.format(outputFormat);
        intervals.push(format);
        startIntervalTime.add(dif, "ms");
        endIntervalTime.add(dif, "ms");
      }

      let booking = await Booking.aggregate([
        {
          $match: {
            saloon: ObjectId(inputParams.saloon),
            date: date,
            status: "Booked",
          },
        },
        {
          $project: {
            booking_info: {
              $filter: {
                input: "$booking_info",
                as: "booking_info",
                cond: {
                  $eq: ["$$booking_info.staff", ObjectId(inputParams.staff)],
                },
              },
            },
          },
        },
      ]);

      // console.log("Booking: ", booking);
      avail = (ts, booked) =>
        ts
          .map((intervals) => {
            const [start, end] = intervals.split("-"),
              isBooked = !booked
                .map((item) => item.split("-"))
                .every(
                  ([bookedStart, bookedEnd]) =>
                    bookedStart >= end || bookedEnd <= start
                );

            if (isBooked === false) {
              return `${start}-${end}`;
            } else {
              return;
            }
          })
          .filter((notUndefined) => notUndefined !== undefined);

      let timesArray = [];
      await booking.map((b) =>
        b.booking_info.map((bi) => timesArray.push(bi.time))
      );

      let avl = avail(intervals, timesArray);
      let current_time = moment().format("HH:mm a");

      let filtered = avl.filter((value, index, array) => {
        if (
          moment().format("YYYY-MM-DD") ===
          moment(inputParams.date).format("YYYY-MM-DD")
        ) {
          return moment().isBefore(moment(value, "HH:mm a"));
        }
        return true;
      });

      return res.status(200).send({
        message: "Available slots.",
        data: filtered,
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

  booking: async (req, res, next) => {
    try {
      let booking;
      let currentBookingId;
      console.log(req.body.bookings);
      if (req.body.bookings === null || req.body.bookings.length == 0) {
        return res.status(400).send({
          message: "Select atleast one Service",
        });
      }
      for (let i = 0; i < req.body.bookings.length; i++) {
        let inputParams = req.body.bookings[i];

        let alreadyBooked = await Booking.findOne({
          saloon: inputParams.saloon,
          // status: "Booked",
          // user: inputParams.user,
          date: inputParams.date,
          "booking_info.staff": inputParams.staff,
          "booking_info.service": inputParams.service,
          "booking_info.time": inputParams.time,
          status: { $ne: "Cancelled" },
        });

        let services = await Services.findById(inputParams.service);

        if (alreadyBooked) {
          return res.status(400).send({
            message: "Already booked",
          });
        }

        booking = await Booking.findById(currentBookingId);
        if (!booking) {
          booking = await new Booking({
            saloon: inputParams.saloon,
            user: inputParams.user,
            date: inputParams.date,
          });
          currentBookingId = booking._id;
        }

        let offer = await Offer.findOne({
          saloon: inputParams.saloon,
          service: inputParams.service,
          endDate: { $gte: moment().subtract(1, "day").toDate() },
        });

        let rate = services.price;
        let price, amount, discountPercentage, discountAmount;
        if (offer) {
          let offers = offer.discount_amount;
          amount = rate;
          let prices = (amount / 100) * offers;
          price = amount - prices;
          discount = "Offer Applied";
          discountAmount = prices;
          discountPercentage = offer.discount_amount;
        } else {
          price = rate;
          discount = "No Offer Applied";
        }

        booking.booking_info = booking.booking_info.concat({
          staff: inputParams.staff,
          service: inputParams.service,
          time: inputParams.time,
          price: price,
          offer: discount,
          discountAmount: discountAmount || "",
          discountPercentage: discountPercentage || "",
        });

        let priceArray = [];
        await booking.booking_info.map((b) => priceArray.push(b.price));
        let pric2 = priceArray.map((i) => Number(i));
        let sum = pric2.reduce(function (pric2, b) {
          return pric2 + b;
        }, 0);

        booking.totalAmount = sum;

        if (inputParams.couponCode) {
          let coupon = await Coupon.findOne({
            couponCode: inputParams.couponCode,
          });
          let couponId = coupon._id;
          let discount = coupon.discount;
          let totalAmount;
          if (coupon.discount_type == "fixed") {
            totalAmount = sum - discount;
          } else {
            let prices = (discount / 100) * sum;
            totalAmount = sum - prices;
          }
          booking.subTotal = sum;
          booking.totalAmount = totalAmount;
          booking.coupon = couponId;
          await booking.save();
          let userCoupon = await UserCoupons.findOne({
            user: req.auth._id,
            coupon: couponId,
          });
          if (userCoupon) {
            userCoupon.total_usage = userCoupon.total_usage + 1;
            await userCoupon.save();
          } else {
            const newUserCoupon = new UserCoupons({
              user: req.auth._id,
              coupon: couponId,
              total_usage: 1,
            });
            await newUserCoupon.save();
          }
        }

        await booking.save();
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
          select: { name: 1, price: 1 },
        })
        .populate({
          path: "booking_info.staff",
          model: Staff,
          select: { name: 1 },
        })
        .execPopulate();

      return res.status(200).send({
        message: "Booking details",
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

  payment: async (req, res) => {
    try {
      let inputParams = req.body;

      let dataToPost = {
        token: "4c83944b-2313-4545-add1-528651af46fa",
        orderId: req.query.orderId,
        transactionID: req.body.transactionID,
        dataType: "json",
      };

      await axios
        .post("https://maktapp.credit/v3/CheckStatus", dataToPost)
        .then(async function (value) {
          let response = await CheckResponseStatus(value.data.result);
          console.log(response);

          if (response == "success") {
            let booking = await Booking.findOneAndUpdate(
              { _id: req.query.orderId },
              inputParams,
              {
                new: true,
              }
            );

            if (value.data.payment.Paymentstate === "SUCCESS") {
              booking.paymentStatus = value.data.payment.Paymentstate;
              booking.status = "Booked";
              await booking.save();

              let priceArray = [];
              await booking.booking_info.map((b) => priceArray.push(b.price));

              let pric2 = priceArray.map((i) => Number(i));

              let sum = pric2.reduce(function (pric2, b) {
                return pric2 + b;
              }, 0);

              const newwallet = new Walletpurchase({
                user: req.auth._id,
                paymentStatus: value.data.payment.Paymentstate,
                amount: sum,
                transactionID: req.body.transactionID,
                bookingId: req.query.orderId,
                type: "Booking",
                isWallet: false,
              });

              await newwallet.save();

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
                        inviteuser.wallet =
                          inviteuser.wallet + settings.referalAmount;
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

            let phone = saloon.phone;

            let user = await User.findById(booking.user);
            let username = user.name;

            // console.log(booking.booking_info);
            let service = await Services.find({
              _id: booking.booking_info.service,
            });

            // await axios
            //   .get(
            //     "https://messaging.ooredoo.qa/bms/soap/Messenger.asmx/HTTP_SendSms?customerID=4361&userName=evebeauty&userPassword=Cov20%23e8&originator=Eve Beauty&smsText=" +
            //       username +
            //       " has taken appointment for SERVICE at " +
            //       booking.date +
            //       "&recipientPhone=" +
            //       phone +
            //       "&messageType=Latin&defDate=20140430193247&blink=false&flash=false&Private=false"
            //   )
            //   .then(function (response) {
            //     console.log("success", response);
            //   });

            if (booking || user.fcm_token) {
              let timeOfBook = booking.date;

              let messageBodyEn = language.confirmationBody.en
                .replace("{Name}", user.name == null ? user.nameAr : user.name)
                .replace("{SalonName}", saloon.name.english)
                .replace("{Time}", timeOfBook);

              let messageBodyAr = language.confirmationBody.ar
                .replace(
                  "{Name}",
                  user.nameAr == null ? user.name : user.nameAr
                )
                .replace("{SalonName}", saloon.name.arabic)
                .replace("{Time}", timeOfBook);

              if (user.fcm_token) {
                const registrationToken = user.fcm_token;
                var message = {
                  notification: {
                    title:
                      user.language == "en"
                        ? language.confirmationTitle.en
                        : language.confirmationTitle.ar,
                    body: user.language == "en" ? messageBodyEn : messageBodyAr,
                  },
                  data: {
                    id: `${booking._id}`,
                    notificationType: "Booking",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    title:
                      user.language == "en"
                        ? language.confirmationTitle.en
                        : language.confirmationTitle.ar,
                    body: user.language == "en" ? messageBodyEn : messageBodyAr,
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
                user: user._id,
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
                "name.english": "New Booking Received",
                "description.english": `New booking request has been received from ${user.name} on ${timeOfBook} in ${saloon.name.english}`,
                booking: booking._id,
                image: "notifications/booking.png",
              });
              await newNotification2.save();
            }
            if (booking || saloonFcm.fcm_token) {
              let timeOfBook = booking.date;
              if (saloonFcm.fcm_token) {
                const registrationTokenSalon = saloonFcm.fcm_token;
                var message = {
                  notification: {
                    title: "New Booking Received",
                    body: `${user.name} has booked  on ${timeOfBook}`,
                  },
                  data: {
                    id: `${booking._id}`,
                    notificationType: "Booking",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    title: "New Booking Received",
                    body: `${user.name} has booked  on ${timeOfBook}`,
                  },
                };
                admin
                  .messaging()
                  .sendToDevice(registrationTokenSalon, message)
                  .then((response) => {
                    console.log("Success");
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              }
              const newNotification3 = new Notification({
                // user: user._id,
                userType: "saloon",
                notificationType: "Booking",
                "name.english": "New Booking Received",
                "description.english": `${user.name} has booked on ${timeOfBook}`,
                booking: booking._id,
                saloon: saloon._id,
                image: "notifications/booking.png",
              });
              await newNotification3.save();
            }

            return res.status(200).json({
              message: "Booking Details",
              data: booking,
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

  SalonPayment: async (req, res) => {
    try {
      let inputParams = req.body;
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

      let booking = await Booking.findOneAndUpdate(
        { _id: bookid },
        inputParams,
        {
          new: true,
        }
      );

      booking.paymentStatus = "Pay at Salon";
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
      let user = await User.findById(booking.user);

      if (booking || user.fcm_token) {
        let timeOfBook = booking.date;
        let messageBodyEn = language.confirmationBody.en
          .replace("{Name}", user.name == null ? user.nameAr : user.name)
          .replace("{SalonName}", saloon.name.english)
          .replace("{Time}", timeOfBook);

        let messageBodyAr = language.confirmationBody.ar
          .replace("{Name}", user.nameAr == null ? user.name : user.nameAr)
          .replace("{SalonName}", saloon.name.arabic)
          .replace("{Time}", timeOfBook);

        if (user.fcm_token) {
          const registrationToken = user.fcm_token;
          var message = {
            notification: {
              title:
                user.language == "en"
                  ? language.confirmationTitle.en
                  : language.confirmationTitle.ar,
              body: user.language == "en" ? messageBodyEn : messageBodyAr,
            },
            data: {
              id: `${booking._id}`,
              notificationType: "Booking",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              title:
                user.language == "en"
                  ? language.confirmationTitle.en
                  : language.confirmationTitle.ar,
              body: user.language == "en" ? messageBodyEn : messageBodyAr,
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
          user: user._id,
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
          "name.english": "New Booking Received",
          "description.english": `New booking request has been received from ${user.name} on ${timeOfBook} in ${saloon.name.english}`,
          booking: booking._id,
          image: "notifications/booking.png",
        });
        await newNotification2.save();
      }
      if (booking || saloonFcm.fcm_token) {
        let timeOfBook = booking.date;
        if (saloonFcm.fcm_token) {
          const registrationTokenSalon = saloonFcm.fcm_token;
          var message = {
            notification: {
              title: "New Booking Received",
              body: `${user.name} has booked  on ${timeOfBook}`,
            },
            data: {
              id: `${booking._id}`,
              notificationType: "Booking",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              title: "New Booking Received",
              body: `${user.name} has booked  on ${timeOfBook}`,
            },
          };
          admin
            .messaging()
            .sendToDevice(registrationTokenSalon, message)
            .then((response) => {
              console.log("Success");
            })
            .catch((error) => {
              console.log(error);
            });
        }
        const newNotification3 = new Notification({
          // user: user._id,
          userType: "saloon",
          notificationType: "Booking",
          "name.english": "New Booking Received",
          "description.english": `${user.name} has booked on ${timeOfBook}`,
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

  cancelBookings: async (req, res) => {
    try {
      const id = req.params.id;
      const userId = req.auth._id;
      let booking = await Booking.findOne({
        _id: id,
        status: { $ne: "Cancelled" },
      });

      if (!booking) {
        return res.status(400).send({
          message: "Bookings not found",
        });
      }

      let saloon = await Saloon.findOne({ _id: booking.saloon });
      if (!saloon) {
        return res.status(400).send({
          message: "Salon not found",
        });
      }
      const settings = await Setting.findOne();

      const cancelTime = saloon.cancel_time
        ? saloon.cancel_time
        : settings.cancel_time;

      const cancelDeducationAmount = saloon.cancel_deduction_amount
        ? saloon.cancel_deduction_amount
        : settings.cancel_deduction_amount;

      let prices = (booking.totalAmount / 100) * cancelDeducationAmount;
      let refund = booking.totalAmount - prices;

      let user = await User.findOne({ _id: userId, status: "Active" });
      user.wallet = user.wallet + refund;

      const startDate = moment(
        moment(booking.createdAt, "YYYY-MM-DD HH:mm").format(
          "YYYY-MM-DD HH:mm:ss"
        )
      );

      const endDate = moment();
      const diff = endDate.diff(startDate, "minutes");

      if (endDate.isAfter(startDate)) {
        if (cancelTime == 0) {
          booking.status = "Cancelled";
          booking.cancelReason = req.body.cancelReason || "";
          await booking.save();

          if (booking.paymentStatus != "Pay at Salon") {
            await user.save();

            const wallet = new Walletpurchase({
              user: user,
              paymentStatus: "SUCCESS",
              amount: refund,
              type: "TopUp",
              message: "Refund of Booking Cancellation",
              isWallet: true,
            });
            await wallet.save();
          }

          return res.status(200).send({
            message: "Cancelation Success",
          });
        } else {
          if (diff <= cancelTime) {
            booking.status = "Cancelled";
            booking.cancelReason = req.body.cancelReason || "";
            await booking.save();

            if (booking.paymentStatus != "Pay at Salon") {
              await user.save();
              const wallet = new Walletpurchase({
                user: user,
                paymentStatus: "SUCCESS",
                amount: refund,
                type: "TopUp",
                message: "Refund of Booking Cancellation",
                isWallet: true,
              });
              await wallet.save();
            }

            let saloons = await Saloon.findById(booking.saloon);
            let saloonFcm = await User.findById(saloons.user);

            if (booking.status == "Cancelled" || user.fcm_token) {
              let messageBodyEn = language.bookingCancelBody.en
                .replace("{Name}", user.name == null ? user.nameAr : user.name)
                .replace("{SalonName}", saloons.name.english)
                .replace("{Time}", booking.date);

              let messageBodyAr = language.bookingCancelBody.ar
                .replace(
                  "{Name}",
                  user.nameAr == null ? user.name : user.nameAr
                )
                .replace("{SalonName}", saloons.name.arabic)
                .replace("{Time}", booking.date);

              if (user.fcm_token) {
                const registrationToken = user.fcm_token;

                var message = {
                  notification: {
                    title:
                      user.language == "en"
                        ? language.bookingCancelTitle.en
                        : language.bookingCancelTitle.ar,
                    body: user.language == "en" ? messageBodyEn : messageBodyAr,
                  },
                  data: {
                    id: `${booking._id}`,
                    notificationType: "Cancel",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    title:
                      user.language == "en"
                        ? language.bookingCancelTitle.en
                        : language.bookingCancelTitle.ar,
                    body: user.language == "en" ? messageBodyEn : messageBodyAr,
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
                user: user._id,
                userType: "customer",
                notificationType: "Cancel",
                "name.english": language.bookingCancelTitle.en,
                "description.english": messageBodyEn,
                "name.arabic": language.bookingCancelTitle.ar,
                "description.arabic": messageBodyAr,
                booking: booking._id,
                image: "notifications/cancel.png",
              });
              await newNotification.save();
            }
            if (booking.status == "Cancelled" || saloonFcm.fcm_token) {
              if (saloonFcm.fcm_token) {
                const registrationToken = saloonFcm.fcm_token;
                var message = {
                  notification: {
                    title: "Booking Cancellation ",
                    body: `Hi ${saloons.name.english}, ${user.name} Booking on ${booking.date} has been Cancelled`,
                  },
                  data: {
                    id: `${booking._id}`,
                    notificationType: "Cancel",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    title: "Booking Cancellation ",
                    body: `Hi ${saloons.name.english}, ${user.name} Booking on ${booking.date} has been Cancelled`,
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
            }

            const newNotification3 = new Notification({
              userType: "saloon",
              notificationType: "Cancel",
              "name.english": "Booking Cancellation",
              "description.english": `Hi ${saloons.name.english}, ${user.name} Booking on ${booking.date} has been Cancelled`,
              booking: booking._id,
              saloon: saloons._id,
              image: "notifications/cancel.png",
            });
            await newNotification3.save();
            return res.status(200).send({
              message: "Cancellation Success",
            });
          }
        }
        if (diff >= cancelTime) {
          return res.status(400).send({
            message: "Cancellation Failed",
          });
        }
      } else {
        return res.status(400).send({
          message: "Cancellation Failed",
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

  history: async (req, res) => {
    try {
      // const userId = req.query.user;
      let bookings = {};
      bookings.upcoming = await Booking.find({
        user: req.auth._id,
        date: { $gte: moment().format() },
        status: { $ne: "Cancelled" },
      })
        .sort({ createdAt: -1 })
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
          select: { name: 1, price: 1 },
        })
        .populate({
          path: "booking_info.staff",
          model: Staff,
          select: { name: 1 },
        });
      bookings.history = await Booking.find({
        user: req.auth._id,
        $or: [{ date: { $lt: moment().format() } }, { status: "Cancelled" }],
      })
        .sort({ createdAt: -1 })
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
          select: { name: 1, price: 1 },
        })
        .populate({
          path: "booking_info.staff",
          model: Staff,
          select: { name: 1 },
        });

      return res.status(200).send({
        message: "Success",
        data: bookings,
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
      const id = req.params.id;

      let bookingId = await Booking.findById(id);
      if (!bookingId) {
        return res.status(400).send({
          message: "BookingId Not found",
        });
      }

      const booking = await Booking.findOne({
        _id: id,
      })
        .populate({
          path: "coupon",
          model: Coupon,
          select: { discount_type: 1, discount: 1 },
        })
        .populate({
          path: "saloon",
          model: Saloon,
          select: { name: 1 },
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
        });

      return res.status(200).send({
        message: "Booking Details",
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
  StoreReferal: async (req, res) => {
    try {
      let inputParams = req.params.userId;
      let userbookings = await Booking.findOne({
        user: inputParams,
      });
      if (!userbookings) {
        let user = await User.findById(inputParams);
        let referedUser = user.referredBy;
        const settings = await Setting.findOne();
        let inviteuser = await User.findById(referedUser);
        let referAmount = settings.referalAmount;
        inviteuser.wallet = inviteuser.wallet + referAmount;
        await inviteuser.save();
        const wallet = new Walletpurchase({
          user: inviteuser,
          paymentStatus: "SUCCESS",
          amount: referAmount,
          type: "TopUp",
          message: "Referal Amount",
          isWallet: true,
        });
        await wallet.save();

        let messageBodyEn = language.referalBody.en
          .replace(
            "{Name}",
            inviteuser.name == null ? inviteuser.nameAr : inviteuser.name
          )
          .replace("{Amount}", referAmount);

        let messageBodyAr = language.referalBody.ar
          .replace(
            "{Name}",
            inviteuser.nameAr == null ? inviteuser.name : inviteuser.nameAr
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
              body: inviteuser.language == "en" ? messageBodyEn : messageBodyAr,
            },
            data: {
              notificationType: "Referal",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              title:
                inviteuser.language == "en"
                  ? language.referalTitle.en
                  : language.referalTitle.ar,
              body: inviteuser.language == "en" ? messageBodyEn : messageBodyAr,
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

        user.wallet = user.wallet + referAmount;
        await user.save();
        const newwallet = new Walletpurchase({
          user: user,
          paymentStatus: "SUCCESS",
          amount: referAmount,
          type: "TopUp",
          message: "Referal Amount",
          isWallet: true,
        });
        await newwallet.save();
      }
      return res.status(200).send({
        message: "Success",
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
  validateBooking: async (req, res, next) => {
    // Validate input parameters

    let inputParams = req.body;
    const inputValidation = await validateInputs(
      inputParams,
      bookingValidation
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

function CheckResponseStatus(result) {
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
// cron.schedule("5 * * * *", async function () {
//   let today = moment();
//   // console.log("today");
//   // console.log(today);
//   let bookingDate = await Booking.find({ status: "Pending" });

//   for (i = 0; i <= bookingDate.length; i++) {
//     if (bookingDate[i]) {
//       let orderBId = bookingDate[i]._id;

//       let bookDate = moment(
//         moment(bookingDate[i].createdAt, "YYYY-MM-DD HH:mm").format(
//           "YYYY-MM-DD HH:mm:ss"
//         )
//       );
//       console.log(bookDate);
//       const diff = today.diff(bookDate, "minutes");
//       console.log(diff);

//       if (diff > 60) {
//         await Booking.findOneAndRemove({ _id: orderBId }).exec(function (err) {
//           // console.log(data)
//           if (err) {
//             console.log(err);
//           }
//         });
//       }
//     }
//   }
// });

cron.schedule("* * * * *", async function () {
  let today = moment();
  let bookingDate = await Booking.find({ status: "Pending" });
  for (i = 0; i <= bookingDate.length; i++) {
    if (bookingDate[i]) {
      let orderBId = bookingDate[i]._id;
      let dataToPost = {
        token: "4c83944b-2313-4545-add1-528651af46fa",
        orderId: orderBId,
        dataType: "json",
      };
      await axios
        .post("https://maktapp.credit/v3/CheckStatus", dataToPost)
        .then(async function (value) {
          let response = await CheckResponseStatus(value.data.result);
          console.log(response);
          if (response == "success") {
            let booking = await Booking.findById({ _id: orderBId });
            // console.log(booking);
            if (value.data.payment.Paymentstate === "SUCCESS") {
              let bookDate = moment(
                moment(booking.createdAt, "YYYY-MM-DD HH:mm").format(
                  "YYYY-MM-DD HH:mm:ss"
                )
              );
              const diff = today.diff(bookDate, "minutes");
              if (diff > 60) {
                booking.paymentStatus = value.data.payment.Paymentstate;
                booking.status = "Booked";
                await booking.save();
                let priceArray = [];
                await booking.booking_info.map((b) => priceArray.push(b.price));
                let pric2 = priceArray.map((i) => Number(i));
                let sum = pric2.reduce(function (pric2, b) {
                  return pric2 + b;
                }, 0);
                const newwallet = new Walletpurchase({
                  user: booking.user,
                  paymentStatus: value.data.payment.Paymentstate,
                  amount: sum,
                  bookingId: orderBId,
                  type: "Booking",
                  isWallet: false,
                });
                await newwallet.save();
              }
            } else {
              let booking = await Booking.findById({ _id: orderBId });
              let bookDate = moment(
                moment(booking.createdAt, "YYYY-MM-DD HH:mm").format(
                  "YYYY-MM-DD HH:mm:ss"
                )
              );
              const diff = today.diff(bookDate, "minutes");
              if (diff > 60) {
                await Booking.findOneAndRemove({ _id: orderBId }).exec(
                  function (err) {
                    if (err) {
                      console.log(err);
                    }
                  }
                );
              }
            }
          } else {
            let booking = await Booking.findById({ _id: orderBId });
            let bookDate = moment(
              moment(booking.createdAt, "YYYY-MM-DD HH:mm").format(
                "YYYY-MM-DD HH:mm:ss"
              )
            );

            const diff = today.diff(bookDate, "minutes");

            if (diff > 60) {
              await Booking.findOneAndRemove({ _id: orderBId }).exec(function (
                err
              ) {
                if (err) {
                  console.log(err);
                }
              });
            }
          }
        });
    }
  }
});
//fcm push notification end
