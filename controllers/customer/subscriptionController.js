const Subscription = require("../../models/Subscription");
const Mystery = require("../../models/Mystery");

const handleError = require("../../utils/helpers").handleErrors;
const moment = require("moment");
const axios = require("axios");
var cron = require("node-cron");


module.exports = {
  subscribe: async (req, res) => {
    try {
      let mystery = await Mystery.findById(req.params.id);
      let price = mystery.price;

      const currentDate = moment();

      const paymenterm = req.body.month;
      let futureMonth = moment(currentDate).add(paymenterm, "M");

      let futureMonthEnd = moment(futureMonth).endOf("month");

      if (
        currentDate.date() != futureMonth.date() &&
        futureMonth.isSame(futureMonthEnd.format("YYYY-MM-DD"))
      ) {
        futureMonth = futureMonth.add(1, "d");
      }

      let amount = paymenterm * price;

      const newsubscribe = new Subscription({
        user: req.auth._id,
        mystery: req.params.id,
        month: paymenterm,
        amount: amount,
        expiry: futureMonth,
        status: "Pending",
      });
      await newsubscribe.save();

      // setTimeout(async function () {
      //   let dataToPost = {
      //     token: "4c83944b-2313-4545-add1-528651af46fa",
      //     orderId: newsubscribe._id,
      //     dataType: "json",
      //   };

      //   await axios
      //     .post("https://maktapp.credit/v3/CheckStatus", dataToPost)
      //     .then(async function (value) {
      //       let response = await CheckResponseStatus(value.data.result);

      //       if (response == "success") {
      //         let subscribe = await Subscription.findById({
      //           _id: newsubscribe._id,
      //         });

      //         if (value.data.payment.Paymentstate === "SUCCESS") {
      //           subscribe.paymentStatus = value.data.payment.Paymentstate;
      //           subscribe.cardToken = value.data.payment.token;
      //           subscribe.status = "Subscribed";

      //           await subscribe.save();
      //           await subscribe.populate("mystery").execPopulate();
      //         } else {
      //           await Subscription.findOneAndRemove({
      //             _id: newsubscribe._id,
      //           }).exec(function (err) {
      //             if (err) {
      //               console.log(err);
      //             }
      //           });
      //         }
      //       } else {
      //         await Subscription.findOneAndRemove({
      //           _id: newsubscribe._id,
      //         }).exec(function (err) {
      //           if (err) {
      //             console.log(err);
      //           }
      //         });
      //       }
      //     });
      // }, 900000);

      return res.status(200).send({
        message: "Subscription added successfully.",
        data: newsubscribe,
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
      console.log(inputParams);
      let dataToPost = {
        token: "4c83944b-2313-4545-add1-528651af46fa",
        orderId: req.query.orderId,
        transactionID: req.body.transactionId,
        dataType: "json",
      };

      await axios
        .post("https://maktapp.credit/v3/CheckStatus", dataToPost)
        .then(async function (value) {
          let response = await CheckResponseStatus(value.data.result);
          console.log(value);

          if (response == "success") {
            let subscribe = await Subscription.findOneAndUpdate(
              { _id: req.query.orderId },
              inputParams,
              {
                new: true,
              }
            );

            subscribe.paymentStatus = value.data.payment.Paymentstate;
            subscribe.cardToken = value.data.payment.token;
            subscribe.status = "Subscribed";

            await subscribe.save();
            await subscribe.populate("mystery").execPopulate();

            return res.status(200).json({
              message: "Subscription details",
              data: subscribe,
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

  cancelSubscription: async (req, res) => {
    try {
      let inputParams = req.body;
      let subscribe = await Subscription.findById(inputParams.subscription);

      let cardToken = subscribe.cardToken;

      if (!subscribe) {
        return res.status(400).json({
          message: "Subscription Not Found",
        });
      }
      let dataToPost = {
        token: "4c83944b-2313-4545-add1-528651af46fa",
        cardToken: cardToken,
        dataType: "json",
      };

      await axios
        .post("https://maktapp.credit/v3/StopRecurring", dataToPost)
        .then(async function (value) {
          let response = await CheckResponseStatus(value.data.result);
          console.log(value);

          if (response == "success") {
            subscribe.cardToken = "";
            subscribe.status = "Cancelled";

            await subscribe.save();
            await subscribe.populate("mystery").execPopulate();

            return res.status(200).json({
              message: "Subscription Cancelled",
              data: subscribe,
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

  userMystery: async (req, res) => {
    try {
      let subscription = await Subscription.find({
        user: req.auth._id,
        paymentStatus: "SUCCESS",
        status: "Subscribed",
      }).populate("mystery");

      return res.status(200).send({
        message: "Subscription Details",
        data: subscription,
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
cron.schedule("5 * * * *", async function () {
  let today = moment();
  // console.log("today");
  // console.log(today);
  let subscriptionDate = await Subscription.find({ status: "Pending" });

  for (i = 0; i <= subscriptionDate.length; i++) {
    if (subscriptionDate[i]) {
      let orderBId = subscriptionDate[i]._id;

      let subscribedDate = moment(
        moment(subscriptionDate[i].createdAt, "YYYY-MM-DD HH:mm").format(
          "YYYY-MM-DD HH:mm:ss"
        )
      );
      // console.log(subscribedDate);
      const diff = today.diff(subscribedDate, "minutes");
      // console.log(diff);

      if (diff > 60) {
        await Subscription.findOneAndRemove({ _id: orderBId }).exec(function (err) {
          // console.log(data)
          if (err) {
            console.log(err);
          }
        });
      }
    }
  }
});
