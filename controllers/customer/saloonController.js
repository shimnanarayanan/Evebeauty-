const Saloon = require("../../models/Saloon");
const City = require("../../models/City");
const Coupon = require("../../models/Coupon");
const Staff = require("../../models/Staff");

const Services = require("../../models/Service");
const Booking = require("../../models/Booking");

const Category = require("../../models/Category");
const Offer = require("../../models/Offer");

const handleError = require("../../utils/helpers").handleErrors;
const ObjectId = require("mongoose").Types.ObjectId;
const _ = require("lodash");
const Recently = require("../../models/Recently");
const moment = require("moment");
const PaymentOption = require("../../models/PaymentOption");
const Favorite = require("../../models/Favorite");
const paginate = require("express-paginate");

module.exports = {
  list: async (req, res) => {
    try {
      let filter;
      let saloon;
      let method;
      let userId = req.auth._id;
      console.log(userId);

      if (!req.query.pagination) {
        pagination = {};
      } else {
        pagination = JSON.parse(req.query.pagination);
      }

      if (req.query.sort_order) {
        if (req.query.sort_order === "desc") {
          method = { "name.english": -1 };
        } else {
          method = { "name.english": 1 };
        }

        [saloon] = await Promise.all([
          Saloon.find({
            status: "Active",
            verificationStatus: true,
          })
            .collation({ locale: "en" })
            .sort(method)
            // .populate("Services")
            .populate("paymentOptions")
            .populate({
              path: "city",
              model: City,
              select: { _id: 0 },
            })
            .limit(pagination.limit)
            .skip(pagination.skip)
            .lean()
            .exec()
            .then(async (data) => {
              console.log(data);
              if (data) {
                if (userId) {
                  for (i in data) {
                    data[i].favorite = (await Favorite.findOne({
                      user: userId,
                      saloon: data[i]._id,
                    }))
                      ? true
                      : false;
                  }
                }
                return data;
              }
            }),
        ]);
      } else if (req.query.filter !== undefined) {
        filter = filterQueries(JSON.parse(req.query.filter));

        [saloon] = await Promise.all([
          Saloon.find(filter.saloon)
            // .populate("Services")
            .populate("paymentOptions")
            .populate({
              path: "city",
              model: City,
              select: { _id: 0 },
            })
            .limit(pagination.limit)
            .skip(pagination.skip)
            .lean()
            .exec()
            .then(async (data) => {
              if (data) {
                if (userId) {
                  for (i in data) {
                    data[i].favorite = (await Favorite.findOne({
                      user: userId,
                      saloon: data[i]._id,
                    }))
                      ? true
                      : false;
                  }
                }
                return data;
              }
            }),
        ]);
      } else {
        [saloon] = await Promise.all([
          Saloon.find({
            status: "Active",
            verificationStatus: true,
          })
            .collation({ locale: "en" })
            .sort({ recommended: -1 })
            // .populate("Services")
            .populate("paymentOptions")
            .populate({
              path: "city",
              model: City,
              select: { _id: 0 },
            })
            .limit(pagination.limit)
            .skip(pagination.skip)
            .lean()
            .exec()
            .then(async (data) => {
              console.log(data);
              if (data) {
                if (userId) {
                  for (i in data) {
                    data[i].favorite = (await Favorite.findOne({
                      user: userId,
                      saloon: data[i]._id,
                    }))
                      ? true
                      : false;
                  }
                }
                return data;
              }
            }),
        ]);
      }

      return res.status(200).send({
        message: "Success",
        data: saloon,
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
  search: async (req, res, next) => {
    // Get all Users
    try {
      const key = req.query.key.toString().trim();
      console.log(key);
      let userId = req.auth._id;
      let saloon = await Saloon.find({
        $or: [
          { "name.english": { $regex: key, $options: "si" } },
          { "name.arabic": { $regex: key, $options: "si" } },
        ],
        status: "Active",
        verificationStatus: true,
      })
        .populate("city")
        .populate("paymentOptions")
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            if (userId) {
              for (i in data) {
                data[i].favorite = (await Favorite.findOne({
                  user: userId,
                  saloon: data[i]._id,
                }))
                  ? true
                  : false;
              }
            }
            return data;
          }
        });

      let services = await Services.find({
        $or: [
          { "name.english": { $regex: key, $options: "si" } },
          { "name.arabic": { $regex: key, $options: "si" } },
        ],
      })
        .populate({
          path: "saloon",
          match: { status: "Active", verificationStatus: true },
          populate: [
            { path: "city" },

            {
              path: "paymentOptions",
            },
          ],
        })
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            if (userId) {
              for (i in data) {
                if (data[i].saloon) {
                  data[i].saloon.favorite = (await Favorite.findOne({
                    user: userId,
                    saloon: data[i].saloon._id,
                  }))
                    ? true
                    : false;
                }
              }
            }
          }
          return data;
        });
      let filteredService = services.filter((value, index, array) => {
        return value.saloon != null;
      });
      filteredService.forEach((element) => {
        if (
          saloon.findIndex((value, index, obj) => {
            return value._id.toString() === element.saloon._id.toString();
          }) == -1
        ) {
          saloon.push(element.saloon);
        }
      });

     
      return res.status(200).send({
        data: saloon,
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
  searchCat: async (req, res, next) => {
    try {
      const key = req.query.key;

      let userId = req.auth._id;

      await Services.find({ category: key }).distinct(
        "saloon",
        function (error, ids) {
          Saloon.find({
            _id: { $in: ids },
            status: "Active",
            verificationStatus: true,
          })
            .populate("city")
            .populate("paymentOptions")
            .lean()
            .exec()
            .then(async (data) => {
              console.log(data);

              if (data) {
                if (userId) {
                  for (i in data) {
                    data[i].favorite = (await Favorite.findOne({
                      user: userId,
                      saloon: data[i]._id,
                    }))
                      ? true
                      : false;
                  }
                }

                return res.status(200).send({
                  data: data,
                });
              }
            });
        }
      );
    } catch (error) {
      let message = await handleError(error);

      console.error(error);
      return res.status(400).send({
        error: error,
        message,
      });
    }
  },

  listById: async (req, res) => {
    try {
      let saloonId = req.params.saloonId;
      let userId = req.auth._id;
      let saloon = await Saloon.findById(saloonId)
        .populate("paymentOptions")
        .populate({
          path: "city",
          model: City,
          select: { _id: 0 },
        })
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            if (userId) {
              data.favorite = (await Favorite.findOne({
                user: userId,
                saloon: data._id,
              }))
                ? true
                : false;
            }
          }
          return data;
        });

      let service = await Services.find({
        saloon: saloonId,
        status: "Active",
      })
        .populate("Staff")
        .populate("Offer");

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

      let saloon2 = {
        _id: saloon._id,
        name: saloon.name,
        coordinates: saloon.coordinates,
        country: saloon.country,
        additionalImages: saloon.additionalImages,
        documents: saloon.documents,
        address: saloon.address,
        city: saloon.city,
        mainImage: saloon.mainImage,
        paymentOptions: saloon.paymentOptions,
        phone: saloon.phone,
        email: saloon.email,
        description: saloon.description,
        favorite: saloon.favorite,
        workingHours: saloon.workingHours,
        holidays: saloon.holidays,
        homeService: saloon.homeService,
        recommended: saloon.recommended,
        categories: [],
      };

      saloon2.categories = merged;

      // if (userId) {
      //   const recently = await Recently.findOne({
      //     user: userId,
      //     saloon: saloonId,
      //   });
      //   if (!recently) {
      //     await Recently.create({
      //       user: userId,
      //       saloon: saloonId,
      //       visited: moment().format(),
      //     });
      //   } else {
      //     recently.visited = moment().format();
      //     recently.save();
      //   }
      // }
      return res.status(200).send({
        message: "Success",
        data: saloon2,
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

  saloonUpcomingBookings: async (req, res) => {
    try {
      const saloon = req.params.saloon;
      let bookings;
      bookings = await Booking.find({
        user: req.auth._id,
        saloon: saloon,
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
  saloonRegistration: async (req, res) => {
    let email, inputParams;
    console.log(req.body);
    try {
      inputParams = req.body;
      email = await Saloon.findOne({
        email: inputParams.email,
      });

      if (email) {
        return res.status(400).json({
          message: "Email already Registered",
        });
      }

      let saloon = await Saloon.create(inputParams);
      return res.status(200).send({
        message: "Saloon Registered successfully.",
        data: saloon._id,
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
  favorites: async (req, res) => {
    try {
      let inputParams = req.body;
      let data = null;

      const saloon = await Favorite.findOne({
        user: inputParams.user,
        saloon: inputParams.saloon,
      });
      if (saloon) {
        data = saloon.remove();
      } else {
        data = await Favorite.create(inputParams);
      }

      return res.status(200).send({
        message: "Success",
        data: data,
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
  userFavorites: async (req, res) => {
    try {
      let userId = req.auth._id;
      const favorites = await Favorite.find({
        user: userId,
      })
        .populate({
          path: "saloon",
          match: { status: "Active", verificationStatus: true },
          populate: [
            { path: "city" },

            {
              path: "paymentOptions",
            },
          ],
        })
        .lean()
        .exec()
        .then(async (data) => {
          if (data) {
            if (userId) {
              for (i in data) {
                if (data[i].saloon) {
                  data[i].saloon.favorite = true;
                }
              }
            }
          }
          return data;
        });

      let filteredSaloon = favorites.filter((value, index, array) => {
        return value.saloon != null;
      });

      return res.status(200).send({
        message: "Success",
        data: filteredSaloon,
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
  recently: async (req, res) => {
    try {
      const recently = await Recently.find({
        user: req.auth._id,
      })
        .populate("saloon")
        .sort({ visited: -1 })
        .limit(5);

      return res.status(200).send({
        message: "Success",
        data: recently,
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
  filter: async (req, res, next) => {
    console.log("Body: ", req.body);
    let service;
    let userId = req.auth._id;
    if (req.body.offer) {
      service = await Offer.find({
        _id: req.body.offer,
      }).distinct("saloon");
    } else {
      service = await Services.find({ category: req.body.category }).distinct(
        "saloon"
      );
    }
    console.log(service);

    let max = req.body.maxdistance * 1000;
    let min = req.body.mindistance * 1000;

    try {
      let pagination;
      if (!req.query.pagination) {
        pagination = {};
      } else {
        pagination = JSON.parse(req.query.pagination);
      }
      let [saloon] = await Promise.all([
        Saloon.find({
          coordinates: {
            $nearSphere: {
              $geometry: {
                type: "Point",
                coordinates: [req.body.coordinates[0], req.body.coordinates[1]],
              },
              $maxDistance: max,
              $minDistance: min,
            },
          },
          _id: { $in: service },
          // homeService: req.body.homeService,
          status: "Active",
          verificationStatus: true,
        })
          .limit(pagination.limit)
          .skip(pagination.skip)
          .lean()
          .exec()
          .then(async (data) => {
            if (data) {
              if (userId) {
                for (i in data) {
                  data[i].favorite = (await Favorite.findOne({
                    user: userId,
                    saloon: data[i]._id,
                  }))
                    ? true
                    : false;
                }
              }
              return data;
            }
          }),
      ]);
      let populateQuery = [{ path: "city" }, { path: "paymentOptions" }];

      await Saloon.populate(saloon, populateQuery);

      console.log("RESULT: ", saloon);
      if (saloon.length === 0) {
        return res.status(404).send({
          message: "No Saloon found",
        });
      }
      return res.status(200).json({
        message: "Saloon details",
        data: {
          count: saloon.length,
          saloon: saloon,
        },
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

  filterDistance: async (req, res) => {
    try {
      let filter, saloon, pagination;
      let userId = req.auth._id;

      if (!req.query.filter) {
        filter = {};
      } else {
        filter = filterQueries(JSON.parse(req.query.filter));
      }
      if (!req.query.pagination) {
        pagination = {};
      } else {
        pagination = JSON.parse(req.query.pagination);
      }
      [saloon] = await Promise.all([
        Saloon.find(filter.saloon)
          .populate("Services")
          .populate("paymentOptions")
          .populate({
            path: "city",
            model: City,
            select: { _id: 0 },
          })
          .limit(pagination.limit)
          .skip(pagination.skip)
          .lean()
          .exec()
          .then(async (data) => {
            if (data) {
              if (userId) {
                for (i in data) {
                  data[i].favorite = (await Favorite.findOne({
                    user: userId,
                    saloon: data[i]._id,
                  }))
                    ? true
                    : false;
                }
              }
              return data;
            }
          }),
      ]);

      return res.status(200).send({
        message: "Success",
        data: saloon,
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
  filter.verificationStatus = true;
  const distance = filter.distance || 20000; //20km
  const allowed = ["status", "coordinates"];
  filter = _.pick(filter, allowed);
  console.log(filter);
  if (filter) {
    if (filter.coordinates) {
      if (filter.coordinates.length == 2) {
        filter.coordinates = {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: [filter.coordinates[0], filter.coordinates[1]],
            },
            $maxDistance: distance,
          },
        };
      }
    } else {
      delete filter.coordinates;
    }
  }
  return { saloon: filter };
}
function filterQueries2(queryParams) {
  let filter = { ...queryParams };

  filter.status = "Active";
  filter.verificationStatus = true;
  const allowed = ["status", "coordinates"];
  filter = _.pick(filter, allowed);
  console.log(filter);
  if (filter) {
    if (filter.coordinates) {
      if (filter.coordinates.length == 2) {
        filter.coordinates = {
          $geoWithin: {
            $centerSphere: [
              [filter.coordinates[0], filter.coordinates[1]],
              30 / 3963.2,
            ],
          },
        };
      }
    } else {
      delete filter.coordinates;
    }
  }
  return { saloon: filter };
}
