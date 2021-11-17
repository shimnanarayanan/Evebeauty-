const Saloon = require("../../models/Saloon");
const exportUsersToExcel = require("../../utils/exportService");
const exportCommissionToExcel = require("../../utils/exportCommission");
const Booking = require("../../models/Booking");
const City = require("../../models/City");
const Notification = require("../../models/Notification");
const Country = require("../../models/Country");
const User = require("../../models/User");
const bookingValidation = require("../../config/validation-attributes.json")
  .booking;
const language = require("../../config/language.json");
const validateInputs = require("../../utils/helpers").validateInputs;
const handleError = require("../../utils/helpers").handleErrors;
const _ = require("lodash");
const Staff = require("../../models/Staff");
const Services = require("../../models/Service");
const moment = require("moment");
const paginate = require("express-paginate");
const admin = require("../../firebase").admin;
var cron = require("node-cron");
module.exports = {
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

      const [booking, itemCount] = await Promise.all([
        Booking.find(filter.booking)
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
          })
          .collation({ locale: "en" })
          .sort({ createdAt: -1 })
          .limit(pagination.limit)
          .skip(pagination.skip),
        Booking.find(filter.booking).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);
      console.log(booking);
      if (!booking) {
        return res.status(400).send({
          message: "No Bookings",
        });
      }
      return res.status(200).send({
        message: "Success",
        data: booking,
        pageCount,
        itemCount,
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
  excelExport: async (req, res) => {
    try {
      let filter;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = await filterQueries(JSON.parse(req.query.filter));
      }
      
      const booking = await Booking.find(filter.booking)
        .populate({
          path: "saloon",
          model: Saloon,
          select: { name: 1, city: 1 },
          populate: {
            path: "city",
          },
        })
        .populate({
          path: "user",
          model: User,
          select: { name: 1, nameAr: 1 },
        });
      
      const workSheetColumnName = [
        "Customers",
        "Salon",
        "Location",
        "Date",
        "status",
      ];
      const workSheetName = "Booking";
      const filePath2 = "public/excel-bookings.xlsx";
      const filePath = "excel-bookings.xlsx";
      exportUsersToExcel(booking, workSheetColumnName, workSheetName, filePath2);
      
      return res.status(200).send({
        message: "Success",
        data: booking,
        filePath,
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
      customersCount = await Booking.count({
        saloon: saloonId,
      }).distinct("user");
      bookings.customer = customersCount.length;
      bookings.booking = await Booking.count({
        saloon: saloonId,
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
  countAll: async (req, res) => {
    try {
      const saloonId = req.params.id;
      let bookings = {};
      let customersAll = await User.count({ type: "customer" }).distinct("_id");
      bookings.customer = customersAll.length;
      bookings.booking = await Booking.count();

      bookings.saloon = await Saloon.count();
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
  search: async (req, res) => {
    try {
      let filter;
      if (!req.query.filter) {
        filter = {};
      } else {
        filter = filterQueries(JSON.parse(req.query.filter));
      }
      const booking = await Booking.find(filter.booking)
        // .sort({
        //   createdAt: -1,
        // })
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
      console.log(booking);
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
  financeBookTotal: async (req, res) => {
    try {
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
  commission: async (req, res) => {
    try {
      const saloons = await Saloon.find({}, { commission: 1 });

      let salonCount = saloons.length;
      let totalPercenage = 0;
      for (s = 0; s < salonCount; s++) {
        let saloonId = saloons[s].id;
        let commission = saloons[s].commission;
        dateToday = moment().format("YYYY-MM-DD");

        const bookings = await Booking.find({
          saloon: saloonId,
          date: dateToday,
        });
        let bookingCount = bookings.length;
        let totalA = 0;
        for (b = 0; b < bookingCount; b++) {
          parseTotal = parseFloat(bookings[b].totalAmount);
          totalA += parseTotal;
        }

        totalPercent = parseFloat((totalA * commission) / 100);
        if (isNaN(totalPercent)) {
          totalPercent = 0;
        }

        totalPercenage += totalPercent;
      }
      if (totalPercenage == "0") {
        totalPercenage = 0;
      } else {
        totalPercenage = totalPercenage.toFixed(2);
      }
      let todayCommission = {
        fromDate: dateToday,
        commission: totalPercenage,
      };

      weekEnd = moment().format("YYYY-MM-DD");
      weekStart = moment().subtract(7, "d").format("YYYY-MM-DD");

      let totalPercenageWeek = 0;
      for (s = 0; s < salonCount; s++) {
        let saloonId = saloons[s].id;
        let commission = saloons[s].commission;

        const bookings = await Booking.find({
          saloon: saloonId,
          date: { $gte: weekStart, $lte: weekEnd },
        });
        let bookingCount = bookings.length;

        let totalA = 0;
        for (b = 0; b < bookingCount; b++) {
          parseTotal = parseFloat(bookings[b].totalAmount);
          totalA += parseTotal;
        }

        totalPercent = parseFloat((totalA * commission) / 100);
        if (isNaN(totalPercent)) {
          totalPercent = 0;
        }

        totalPercenageWeek += totalPercent;
      }
      if (totalPercenageWeek == "0") {
        totalPercenageWeek = 0;
      } else {
        totalPercenageWeek = totalPercenageWeek.toFixed(2);
      }
      let weekWiseCommission = {
        fromDate: weekStart,
        toDate: weekEnd,
        commission: totalPercenageWeek,
      };

      monthEnd = moment().format("YYYY-MM-DD");
      monthStart = moment().subtract(1, "months").format("YYYY-MM-DD");

      let totalPercenageMonth = 0;
      for (s = 0; s < salonCount; s++) {
        let saloonId = saloons[s].id;
        let commission = saloons[s].commission;

        const bookings = await Booking.find({
          saloon: saloonId,
          date: { $gte: monthStart, $lte: monthEnd },
        });
        let bookingCount = bookings.length;

        let totalA = 0;
        for (b = 0; b < bookingCount; b++) {
          parseTotal = parseFloat(bookings[b].totalAmount);
          totalA += parseTotal;
        }

        totalPercent = parseFloat((totalA * commission) / 100);
        if (isNaN(totalPercent)) {
          totalPercent = 0;
        }

        totalPercenageMonth += totalPercent;
      }
      if (totalPercenageMonth == "0") {
        totalPercenageMonth = 0;
      } else {
        totalPercenageMonth = totalPercenageMonth.toFixed(2);
      }
      let monthWiseCommission = {
        fromDate: monthStart,
        toDate: monthEnd,
        commission: totalPercenageMonth,
      };

      let yearEnd = moment().format("YYYY-MM-DD");
      let yearStart = moment().subtract(12, "months").format("YYYY-MM-DD");

      let totalPercenageYear = 0;
      for (s = 0; s < salonCount; s++) {
        let saloonId = saloons[s].id;
        let commission = saloons[s].commission;

        const bookings = await Booking.find({
          saloon: saloonId,
          date: { $gte: yearStart, $lte: yearEnd },
        });
        let bookingCount = bookings.length;

        let totalA = 0;
        for (b = 0; b < bookingCount; b++) {
          parseTotal = parseFloat(bookings[b].totalAmount);
          totalA += parseTotal;
        }

        totalPercent = parseFloat((totalA * commission) / 100);
        if (isNaN(totalPercent)) {
          totalPercent = 0;
        }

        totalPercenageYear += totalPercent;
      }
      if (totalPercenageYear == "0") {
        totalPercenageYear = 0;
      } else {
        totalPercenageYear = totalPercenageYear.toFixed(2);
      }
      let yearWiseCommission = {
        fromDate: yearStart,
        toDate: yearEnd,
        commission: totalPercenageYear,
      };

      return res.status(200).send({
        success: true,
        message: "Success",
        todayTotalCommission: todayCommission,
        weekTotalCommission: weekWiseCommission,
        monthTotalCommission: monthWiseCommission,
        yearTotalCommission: yearWiseCommission,
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
  commissionFilter: async (req, res) => {
    try {
      const saloons = await Saloon.find({}, { commission: 1, name: 1 });

      let salonCount = saloons.length;
      let totalPercenage = 0;
      const newarr = [];
      for (s = 0; s < salonCount; s++) {
        let saloonId = saloons[s].id;
        // console.log(saloonId);
        let salooName = saloons[s].name.english;
        let commission = saloons[s].commission;

        dateToday = moment().format("YYYY-MM-DD");
        if (!req.query.filter) {
          filter = {};
        } else {
          filter = await filterQueries(JSON.parse(req.query.filter));
        }

        bookings = await Booking.find({ saloon: saloonId, ...filter.booking });
        let bookingCount = bookings.length;
        let totalA = 0;
        for (b = 0; b < bookingCount; b++) {
          parseTotal = parseFloat(bookings[b].totalAmount);
          totalA += parseTotal;
        }
        // console.log(totalA)
        // console.log(salooName)
        totalPercent = parseFloat((totalA * commission) / 100);
        if (isNaN(totalPercent)) {
          totalPercent = 0;
        }
        totalPercenage = totalPercent;
        if (totalPercenage == "0") {
          totalPercenage = 0;
        } else {
          totalPercenage = totalPercent.toFixed(2);
        }
        // console.log(totalPercenage)
        myUsers = { id: saloonId, name: salooName, commission: totalPercenage };

        newarr.push(myUsers);
      }
      console.log(newarr.length);
      return res.status(200).send({
        success: true,
        message: "Success",
        data: newarr,
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
  commissionFilterExcelExport: async (req, res) => {
    try {
      const saloons = await Saloon.find({}, { commission: 1, name: 1 });

      let salonCount = saloons.length;
      let totalPercenage = 0;
      const newarr = [];
      for (s = 0; s < salonCount; s++) {
        let saloonId = saloons[s].id;
        // console.log(saloonId);
        let salooName = saloons[s].name.english;
        let commission = saloons[s].commission;

        dateToday = moment().format("YYYY-MM-DD");
        if (!req.query.filter) {
          filter = {};
        } else {
          filter = await filterQueries(JSON.parse(req.query.filter));
        }

        bookings = await Booking.find({ saloon: saloonId, ...filter.booking });
        let bookingCount = bookings.length;
        let totalA = 0;
        for (b = 0; b < bookingCount; b++) {
          parseTotal = parseFloat(bookings[b].totalAmount);
          totalA += parseTotal;
        }
        // console.log(totalA)
        // console.log(salooName)
        totalPercent = parseFloat((totalA * commission) / 100);
        if (isNaN(totalPercent)) {
          totalPercent = 0;
        }
        totalPercenage = totalPercent;
        if (totalPercenage == "0") {
          totalPercenage = 0;
        } else {
          totalPercenage = totalPercent.toFixed(2);
        }
        // console.log(totalPercenage)
        myUsers = { id: saloonId, name: salooName, commission: totalPercenage };

        newarr.push(myUsers);
      }
      const workSheetColumnName = ["salon", "commission"];
      const workSheetName = "Commission";
      const filePath2 = "public/excel-commission.xlsx";
      const filePath = "excel-commission.xlsx";
      exportCommissionToExcel(newarr, workSheetColumnName, workSheetName, filePath2);
      
      return res.status(200).send({
        success: true,
        message: "Success",
        data: newarr,
        filePath,
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
  const allowed = [
    "status",
    "fromDate",
    "toDate",
    "currdate",
    "date",
    "saloon",
    "user",
    "city",
  ];
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
  if (filter.saloon) {
    let saloonWhere = {};
    if (filter.saloon._id) {
      saloonWhere = {
        _id: filter.saloon._id,
      };
    }
    if (filter.saloon.city) {
      let cityWhere = {};
      if (filter.saloon.city) {
        cityWhere = {
          _id: filter.saloon.city,
        };
      }
      const cities = await City.find(cityWhere)
        .lean()
        .exec()
        .then((_a) => {
          return _a.map((_b) => _b._id).filter((_b) => _b);
        });
      saloonWhere = {
        ...saloonWhere,
        city: { $in: cities },
      };
    }
    const saloons = await Saloon.find(saloonWhere)
      .lean()
      .exec()
      .then((_a) => {
        return _a.map((_b) => _b._id).filter((_b) => _b);
      });
    console.log(saloons);
    delete filter.saloon;
    filter = {
      ...filter,
      saloon: { $in: saloons },
    };
  }
  return { booking: filter };
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

//fcm push notification start

cron.schedule("* * * * *", async function () {
  let today = moment().format("YYYY-MM-DD");

  let bookingDate = await Booking.find()
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
      select: { name: 1 },
    });
  // console.log(bookingDate);

  for (i = 0; i <= bookingDate.length; i++) {
    if (bookingDate[i]) {
      if (bookingDate[i].status == "Booked") {
        let bookDate = moment(bookingDate[i].date).format("YYYY-MM-DD");

        if (bookDate == today) {
          let todayCompare = moment().format("YYYY-MM-DD HH:mm");
          let id = bookingDate[i].user._id;
          let userInfo = await User.findById(id);

          let saloonInfo = bookingDate[i].saloon.name.english;
          let saloon = await Saloon.findById(bookingDate[i].saloon);
          let saloonFcm = await User.findById(saloon.user);

          for (j = 0; j < bookingDate[i].booking_info.length; j++) {
            let time1 = bookingDate[i].booking_info[j].time.split("-");
            // console.log(time1);
            const timeOfStart = moment(time1, "HH:mm");
            const appointmentTime = timeOfStart.format("MMMM Do YYYY, h:mm a");
            const startTime = moment(timeOfStart)
              .subtract(60, "minutes")
              .format("YYYY-MM-DD HH:mm");

            if (startTime == todayCompare) {
              let email = userInfo.email;

              if (bookingDate[i].status == "Booked" || userInfo.fcm_token) {
                let messageBodyEn = language.bookingReminderBody.en
                  .replace(
                    "{Name}",
                    userInfo.name == null ? userInfo.nameAr : userInfo.name
                  )
                  .replace("{salonName}", saloon.name.english)
                  .replace("{Time}", appointmentTime);

                let messageBodyAr = language.bookingReminderBody.ar
                  .replace(
                    "{Name}",
                    userInfo.nameAr == null ? userInfo.name : userInfo.nameAr
                  )
                  .replace("{salonName}", saloon.name.arabic)
                  .replace("{Time}", appointmentTime);
                if (userInfo.fcm_token) {
                  const registrationToken = userInfo.fcm_token;

                  var message = {
                    notification: {
                      title:
                        userInfo.language == "en"
                          ? language.bookingReminderTitle.en
                          : language.bookingReminderTitle.ar,
                      body:
                        userInfo.language == "en"
                          ? messageBodyEn
                          : messageBodyAr,
                    },
                    data: {
                      id: `${bookingDate[i]._id}`,
                      notificationType: "Reminder",
                      click_action: "FLUTTER_NOTIFICATION_CLICK",
                      title:
                        userInfo.language == "en"
                          ? language.bookingReminderTitle.en
                          : language.bookingReminderTitle.ar,
                      body:
                        userInfo.language == "en"
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
                  user: userInfo._id,
                  userType: "customer",
                  notificationType: "Reminder",
                  "name.english": language.bookingReminderTitle.en,
                  "description.english": messageBodyEn,
                  "name.arabic": language.bookingReminderTitle.ar,
                  "description.arabic": messageBodyAr,
                  booking: bookingDate[i]._id,
                  image: "notifications/reminder.png",
                });
                await newNotification.save();
              }
              if (bookingDate[i].status == "Booked" || saloonFcm.fcm_token) {
                if (saloonFcm.fcm_token) {
                  const registrationToken = saloonFcm.fcm_token;

                  var message = {
                    notification: {
                      title: "Booking Reminder",
                      body: `${userInfo.name} has booked on ${appointmentTime}.`,
                    },
                    data: {
                      id: `${bookingDate[i]._id}`,
                      notificationType: "Reminder",
                      click_action: "FLUTTER_NOTIFICATION_CLICK",
                      title: "Booking Reminder",
                      body: `${userInfo.name} has booked on ${appointmentTime}.`,
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
                const saloonNotification = new Notification({
                  userType: "saloon",
                  notificationType: "Reminder",
                  "name.english": "Booking Reminder",
                  "description.english": `${userInfo.name} has booked on ${appointmentTime}.`,
                  booking: bookingDate[i]._id,
                  saloon: bookingDate[i].saloon,
                  image: "notifications/reminder.png",
                });
                await saloonNotification.save();
              }
            }
          }
        }
      }
    }
  }
});

//fcm push notification end
