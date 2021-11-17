const Subscription = require("../../models/Subscription");
const Mystery = require("../../models/Mystery");
const User = require("../../models/User");

const handleError = require("../../utils/helpers").handleErrors;
const moment = require("moment");
const axios = require("axios");
const _ = require("lodash");
const paginate = require("express-paginate");

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

      const [subscription, itemCount] = await Promise.all([
        Subscription.find(filter.subscription)
          .populate({
            path: "mystery",
            model: Mystery,
            select: { name: 1 },
          })
          .populate({
            path: "user",
            model: User,
            select: { name: 1 },
          })

          .sort({ createdAt: -1 })
          .limit(pagination.limit)
          .skip(pagination.skip),
        Subscription.find(filter.subscription).count(),
      ]);
      const pageCount = Math.ceil(itemCount / pagination.limit);
      console.log(subscription);
      if (!subscription) {
        return res.status(400).send({
          message: "No subscription",
        });
      }
      return res.status(200).send({
        message: "Subscription Details",
        data: subscription,
        pageCount,
        itemCount,
        // pages: paginate.getArrayPages(req)(3, pageCount, pagination.page)
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

async function filterQueries(queryParams) {
  let filter = { ...queryParams };
  const allowed = [
    "status",
    "fromDate",
    "toDate",
    "currdate",
    "createdAt",
    "mystery",
    "user",
    "expiry",
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
  if (filter.mystery) {
    let mysteryWhere = {};
    if (filter.mystery._id) {
      mysteryWhere = {
        _id: filter.mystery._id,
      };
    }

    const mysterys = await Mystery.find(mysteryWhere)
      .lean()
      .exec()
      .then((_a) => {
        return _a.map((_b) => _b._id).filter((_b) => _b);
      });
    // console.log(mysterys);
    delete filter.mystery;
    filter = {
      ...filter,
      mystery: { $in: mysterys },
    };
  }
  return { subscription: filter };
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
