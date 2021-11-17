const express = require("express");
const router = express.Router();

const City = require("../../models/City");
const PaymentOption = require("../../models/PaymentOption");

const { handleErrors } = require("../../utils/helpers").handleErrors;

router.get("/cities", async (req, res) => {
  try {
    const city = await City.find();

    return res.status(200).send({
      message: "Success",
      data: city,
    });
  } catch (error) {
    let message = await handleErrors(error);

    console.error(error);
    return res.status(400).send({
      error: error,

      message,
    });
  }
});

// router.post("/city", async (req, res) => {
//   try {
//     await City.deleteMany();
//     await PaymentOption.deleteMany();

//     const city = [
//       "Al Khartiyat",
//       "Al Kheesa",
//       "Al Khor",
//       "-Al Dhakhira / Al Thakhira",
//       "-Simaisma",
//       "Al Sakhama",
//       "Al-Shahaniya",
//       "Doha",
//       "-Abu Hamour",
//       "-Ain Khaled",
//       "-Al Aziziya",
//       "-Al Bidda",
//       "-Al Dafna",
//       "-Al Doha Al Jadeeda",
//       "-Al Duhail",
//       "-Al Gharrafa",
//       "-Al Hilal",
//       "-Al Jasra",
//       "-Al Jebailat",
//       "-Al Khulaifat",
//       "-Al Khuwair",
//       "-Al Luqta / Old Al Rayyan",
//       "-Al Maamoura",
//       "-Al Mansoura / Fereej Bin Dirham",
//       "-Al Markhiya",
//       "-Al Mesaimeer",
//       "-Al Messila",
//       "-Al Mirqab",
//       "-Al Muntazah",
//       "-Al Najada",
//       "-Al Nasr",
//       "-Al Qassar",
//       "-Al Qutaifiya",
//       "-Al Rumaila",
//       "-Al Sadd",
//       "-Al Tarfa / Jelaiah",
//       "-Al Thumama",
//       "-Al Waab / Al Aziziya / New Al Ghanim",
//       "-Al-Sailiya",
//       "-Aspire Zone",
//       "-Barwa City",
//       "-Barwa Village",
//       "-Doha International Airport",
//       "-Doha Port",
//       "-Education City",
//       "-Fareej Al Ali",
//       "-Fereej Abdel Aziz",
//       "-Fereej Al Ameer / Muraikh",
//       "-Fereej Bin Mahmoud",
//       "-Fereej Bin Omran",
//       "-Fereej Kulaib",
//       "-Industrial Area",
//       "-Katara Cultural Village",
//       "-Luaib",
//       "-LUSAIL",
//       "-Madinat Khalifa North / Dahl Al Hamam",
//       "-Madinat Khalifa South",
//       "-Mehairja",
//       "-Muither",
//       "-Mushaireb",
//       "-Najma",
//       "-New Al Ghanim",
//       "-New Al Rayyan / Al Wajba",
//       "-New Salata / Al Asiri",
//       "-Nuaija",
//       "-Old Airport",
//       "-Old Al Ghanim",
//       "-Old Al Hitmi",
//       "-Old Salata",
//       "-Onaiza",
//       "-Other",
//       "-Qatar National Convention Center",
//       "-Rawdat Al Khail",
//       "-Souq Waqif",
//       "-The Pearl Qatar",
//       "-Umm Al Amad",
//       "-Umm Ghwailina",
//       "-Umm Lekhba",
//       "-Umm Salal Ali",
//       "-Umsalal Mohammed",
//       "-Wadi Al Sail",
//       "-West Bay",
//       "Dukhan",
//       "Mesaeidd",
//       "Wakrah",
//       "-Al Wukair",
//     ];
//     city.map((c) => City.create({ name: { english: c } }));
//     const payment = [
//       "Visa",
//       "Maestro",
//       "AmericanExpress",
//       "Mastercard",
//       "Maestrocard",
//       "Onecard",
//       "Cash",
//     ];
//     payment.map((p) => PaymentOption.create({ type: p }));

//     return res.status(200).send({
//       message: "Success",
//     });
//   } catch (error) {
//     let message = await handleErrors(error);

//     console.error(error);
//     return res.status(400).send({
//       error: error,

//       message,
//     });
//   }
// });

module.exports = router;
