const Saloon = require("../../models/Saloon");
const Booking = require("../../models/Booking");
const User = require("../../models/User");
const Notification = require("../../models/Notification");

const ObjectId = require("mongoose").Types.ObjectId;
const bookingValidation =
  require("../../config/validation-attributes.json").booking;
const validateInputs = require("../../utils/helpers").validateInputs;
const handleError = require("../../utils/helpers").handleErrors;
const _ = require("lodash");
const Staff = require("../../models/Staff");
const Services = require("../../models/Service");
const moment = require("moment");
const Walletpurchase = require("../../models/Walletpurchase");
const Setting = require("../../models/Setting");
const admin = require("../../firebase").admin;
const Coupon = require("../../models/Coupon");
module.exports = {
  list: async (req, res) => {
    try {
      const saloonId = req.params.id;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = await filterQueries(JSON.parse(req.query.filter));
      }

      const booking = await Booking.find({
        saloon: saloonId,
        ...filter.booking,
      })
        .populate({
          path: "coupon",
          model: Coupon,
          select: { discount_type: 1, discount: 1 },
        })
        .populate({
          path: "saloon",
          model: Saloon,
          select: { name: 1, city: 1 },
          populate: {
            path: "city",
          },
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
        .populate({
          path: "user",
          model: User,
          select: { name: 1, nameAr: 1 },
        });

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

  details: async (req, res) => {
    try {
      const id = req.params.id;

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
        })
        .populate({
          path: "user",
          model: User,
          select: { name: 1, nameAr: 1 },
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
  count: async (req, res) => {
    try {
      const saloonId = req.params.id;
      let bookings = {};

      bookings.upcoming = await Booking.count({
        saloon: saloonId,
        date: moment().format("YYYY-MM-DD"),
      });

      bookings.history = await Booking.count({
        saloon: saloonId,
        date: moment().format("YYYY-MM-DD"),
      });

      bookings.total = bookings.upcoming + bookings.history;

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

  statusUpdate: async (req, res) => {
    try {
      const id = req.params.id;
      const inputParams = req.body;

      if (!inputParams.status) {
        return res.status(400).send({
          message: "Status field is required",
        });
      }
      const booking = await Booking.findOne({
        _id: id,
      });

      if (!booking) {
        return res.status(400).send({
          success: false,
          message: "Bookings Not found",
        });
      }
      const user = await User.findById(booking.user);

      if (inputParams.status == "Cancelled") {
        if (booking.status == "Cancelled") {
          return res.status(400).send({
            success: false,
            message: "Already Cancelled",
          });
        }
        const saloon = await Saloon.findById(booking.saloon);
        if (!saloon) {
          return res.status(400).send({
            success: false,
            message: "Salon not found",
          });
        }
        const settings = await Setting.findOne();

        const cancelDeducationAmount = saloon.cancel_deduction_amount
          ? saloon.cancel_deduction_amount
          : settings.cancel_deduction_amount;

        let prices = (booking.totalAmount / 100) * cancelDeducationAmount;
        let refund = booking.totalAmount - prices;
        let wallet;
        if (booking.paymentStatus != "Pay at Salon") {
          user.wallet = user.wallet + refund;
          wallet = new Walletpurchase({
            user: user,
            paymentStatus: "SUCCESS",
            amount: refund,
            type: "TopUp",
            message: "Refund of Booking Cancellation by Salon",
            isWallet: true,
          });
          await user.save();
          await wallet.save();
        }

        booking.status = inputParams.status;
        booking.cancelReason = inputParams.cancelReason || "";
        await booking.save();

        if (booking.status == "Cancelled" && user.fcm_token) {
          const registrationToken = user.fcm_token;

          var message = {
            notification: {
              title: "Booking Cancellation ",
              body: `Hi ${user.name}, Your Booking on ${booking.date} in ${saloon.name.english} has been Cancelled`,
            },
            data: {
              id: `${booking._id}`,
              notificationType: "Cancel",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              title: "Booking Cancellation ",
              body: `Hi ${user.name}, We are sorry your booking request on ${booking.date} in ${saloon.name.english} has been Cancelled`,
            },
          };
          const newNotification = new Notification({
            user: user._id,
            userType: "customer",
            notificationType: "Cancel",
            "name.english": message.notification.title,
            "description.english": message.notification.body,
            booking: booking._id,
            image: "notifications/cancel.png",
          });
          await newNotification.save();
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
      } else {
        booking.status = "Booked";
        await booking.save();
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
  PaymentStatusUpdate: async (req, res) => {
    try {
      const id = req.params.id;
      let booking = await Booking.findOne({
        _id: id,
      });

      if (booking.paymentStatus == "SUCCESS") {
        return res.status(400).send({
          success: false,
          message: "Already paid",
        });
      }
      booking.paymentStatus = "SUCCESS";
      await booking.save();

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
  transaction: async (req, res) => {
    try {
      let booking = await Booking.find({
        saloon: req.params.id,
        paymentStatus: "SUCCESS",
        status: "Booked",
        date: req.query.date,
      }).distinct("_id");

      let wallet = await Walletpurchase.find({
        type: "Booking",
        paymentStatus: "SUCCESS",
        bookingId: {
          $in: booking,
        },
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "user",
          model: User,
          select: { name: 1, nameAr: 1 },
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
  recentBookings: async (req, res) => {
    try {
      const saloonId = req.params.id;

      const booking = await Booking.find({
        saloon: saloonId,
        $or: [{ status: "Booked" }, { status: "Cancelled" }],
        $or: [{ paymentStatus: "SUCCESS" }, { paymentStatus: "Pay at Salon" }],
        date: req.query.date,
      })
        .populate({
          path: "coupon",
          model: Coupon,
          select: { discount_type: 1, discount: 1 },
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
        .populate({
          path: "user",
          model: User,
          select: { name: 1, mainImage: 1, nameAr: 1 },
        });

      var currentTime = moment(moment().format("YYYY-MM-DD"));
      var queryTime = moment(req.query.date);

      let upcomingBookings = [];
      let historyBookings = [];
      let allBookings = [];

      let bookings = [];

      await booking.map((b) => {
        b.booking_info.map((bi) => {
          if (currentTime.toString() === queryTime.toString()) {
            if (
              moment().isBefore(
                moment(bi.time.toString().split("-")[0], "HH:mm a")
              )
            ) {
              if (
                upcomingBookings.find(
                  (book) => b._id.toString() === book._id.toString()
                ) === undefined
              ) {
                upcomingBookings.push(b);
              }
            }
          } else if (currentTime.isBefore(queryTime)) {
            if (
              upcomingBookings.find(
                (book) => b._id.toString() === book._id.toString()
              ) === undefined
            ) {
              upcomingBookings.push(b);
            }
          }
        });
      });
      await booking.map((b) => {
        b.booking_info.map((bi) => {
          if (currentTime.toString() === queryTime.toString()) {
            if (
              moment().isAfter(
                moment(bi.time.toString().split("-")[0], "HH:mm a")
              )
            ) {
              if (
                historyBookings.find(
                  (book) => b._id.toString() === book._id.toString()
                ) === undefined
              ) {
                historyBookings.push(b);
              }
            }
          } else if (currentTime.isAfter(queryTime)) {
            if (
              historyBookings.find(
                (book) => b._id.toString() === book._id.toString()
              ) === undefined
            ) {
              historyBookings.push(b);
            }
          }
        });
      });

      allBookings = await Booking.find({
        saloon: saloonId,
        $or: [{ status: "Booked" }, { status: "Cancelled" }],
        $or: [{ paymentStatus: "SUCCESS" }, { paymentStatus: "Pay at Salon" }],
        date: req.query.date,
      })
        .populate({
          path: "coupon",
          model: Coupon,
          select: { discount_type: 1, discount: 1 },
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
        .populate({
          path: "user",
          model: User,
          select: { name: 1, mainImage: 1, nameAr: 1 },
        });

      if (req.query.type === "upcoming") {
        bookings = upcomingBookings;
      } else if (req.query.type === "history") {
        bookings = historyBookings;
      } else {
        bookings = allBookings;
      }

      return res.status(200).send({
        message: "Success",
        data: bookings,
        allCount: allBookings.length,
        upcomingCount: upcomingBookings.length,
        historyCount: historyBookings.length,
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
  salonFinanceBookTotal: async (req, res) => {
    try {
      const saloonId = req.params.id;
      let bookingsT = [];
      let bookingsW = [];
      let bookingsM = [];
      let bookingsY = [];
      //  let currentDate;

      let dateToday = moment().format("YYYY-MM-DD");
      // console.log(dateToday);
      let currentDate = await Booking.aggregate([
        {
          $match: {
            date: {
              $eq: dateToday,
            },
            status: {
              $eq: "Booked",
            },
            paymentStatus: {
              $eq: "SUCCESS",
            },
            saloon: {
              $eq: ObjectId(saloonId),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toInt: "$totalAmount" } },
            count: {
              $sum: 1,
            },
          },
        },
      ]);

      bookingsT.push({
        date: dateToday,
        total: currentDate,
      });

      const dataT = bookingsT.map((book) => {
        let bookingData = [];
        if (book.total.length > 0) {
          for (let totalInfo of book.total) {
            bookingData.push(book.date, totalInfo.totalAmount, totalInfo.count);
          }
        }

        return bookingData;
      });
      var totalToday = {
        fromDate: dataT[0][0],
        total: dataT[0][1],
        count: dataT[0][2],
      };
      if (currentDate.length == 0) {
        var totalToday = {
          fromDate: dateToday,
          total: 0,
          count: 0,
        };
      }

      let weekEnd = moment().format("YYYY-MM-DD");
      let weekStart = moment().subtract(7, "d").format("YYYY-MM-DD");
      let WeekSum = await Booking.aggregate([
        {
          $match: {
            date: {
              $gte: weekStart,
              $lte: weekEnd,
            },
            status: {
              $eq: "Booked",
            },
            paymentStatus: {
              $eq: "SUCCESS",
            },
            saloon: {
              $eq: ObjectId(saloonId),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toInt: "$totalAmount" } },
            count: {
              $sum: 1,
            },
          },
        },
      ]);
      bookingsW.push({
        fromDate: weekStart,
        toDate: weekEnd,
        total: WeekSum,
      });

      const dataW = bookingsW.map((book) => {
        let bookingData = [];
        if (book.total.length > 0) {
          for (let totalInfo of book.total) {
            bookingData.push(
              book.fromDate,
              book.toDate,
              totalInfo.totalAmount,
              totalInfo.count
            );
          }
        }

        return bookingData;
      });

      var totalWeek = {
        fromDate: dataW[0][0],
        toDate: dataW[0][1],
        total: dataW[0][2],
        count: dataW[0][3],
      };
      if (WeekSum.length == 0) {
        var totalWeek = {
          fromDate: weekStart,
          toDate: weekEnd,
          total: 0,
          count: 0,
        };
      }

      let monthEnd = moment().format("YYYY-MM-DD");
      let monthStart = moment().subtract(1, "months").format("YYYY-MM-DD");
      let monthSum = await Booking.aggregate([
        {
          $match: {
            date: {
              $gte: monthStart,
              $lte: monthEnd,
            },
            status: {
              $eq: "Booked",
            },
            paymentStatus: {
              $eq: "SUCCESS",
            },
            saloon: {
              $eq: ObjectId(saloonId),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toInt: "$totalAmount" } },
            count: {
              $sum: 1,
            },
          },
        },
      ]);
      bookingsM.push({
        fromDate: monthStart,
        toDate: monthEnd,
        total: monthSum,
      });

      const dataM = bookingsM.map((book) => {
        let bookingData = [];
        if (book.total.length > 0) {
          for (let totalInfo of book.total) {
            bookingData.push(
              book.fromDate,
              book.toDate,
              totalInfo.totalAmount,
              totalInfo.count
            );
          }
        }

        return bookingData;
      });

      var totalMonth = {
        fromDate: dataM[0][0],
        toDate: dataM[0][1],
        total: dataM[0][2],
        count: dataM[0][3],
      };
      if (monthSum.length == 0) {
        var totalMonth = {
          fromDate: monthStart,
          toDate: monthEnd,
          total: 0,
          count: 0,
        };
      }

      let yearEnd = moment().format("YYYY-MM-DD");
      let yearStart = moment().subtract(12, "months").format("YYYY-MM-DD");
      let yearSum = await Booking.aggregate([
        {
          $match: {
            date: {
              $gte: yearStart,
              $lte: yearEnd,
            },
            status: {
              $eq: "Booked",
            },
            paymentStatus: {
              $eq: "SUCCESS",
            },
            saloon: {
              $eq: ObjectId(saloonId),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $toInt: "$totalAmount" } },
            count: {
              $sum: 1,
            },
          },
        },
      ]);
      bookingsY.push({
        fromDate: yearStart,
        toDate: yearEnd,
        total: yearSum,
      });
      const dataY = bookingsY.map((book) => {
        let bookingData = [];
        if (book.total.length > 0) {
          for (let totalInfo of book.total) {
            bookingData.push(
              book.fromDate,
              book.toDate,
              totalInfo.totalAmount,
              totalInfo.count
            );
          }
        }

        return bookingData;
      });

      var totalYear = {
        fromDate: dataY[0][0],
        toDate: dataY[0][1],
        total: dataY[0][2],
        count: dataY[0][3],
      };
      if (yearSum.length == 0) {
        var totalYear = {
          fromDate: yearStart,
          toDate: yearEnd,
          total: 0,
          count: 0,
        };
      }

      return res.status(200).send({
        success: true,
        message: "Success",
        todayTotal: totalToday,
        weekTotal: totalWeek,
        monthTotal: totalMonth,
        yearTotal: totalYear,
      });
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
};

async function filterQueries(queryParams) {
  let filter = { ...queryParams };
  const allowed = ["status", "fromDate", "toDate", "date", "user"];
  filter = _.pick(filter, allowed);
  if (filter.fromDate && filter.toDate) {
    filter.date = {
      $gte: filter.fromDate,
      $lt: filter.toDate,
    };
  }
  delete filter.fromDate;
  delete filter.toDate;
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

  return { booking: filter };
}
