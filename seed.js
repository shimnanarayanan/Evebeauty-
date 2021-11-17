const dotenv = require("dotenv");
dotenv.config();

const db = require("./utils/db");

const City = require("./models/City");
const PaymentOption = require("./models/PaymentOption");

seeder();

async function seeder() {
  try {
    await deleteDocuments();

    const cities = [
      {
        name: {
          english: "Al Khartiyat",
          arabic: "صنيع لحميدي",
        },
      },
      {
        name: {
          english: "Al Kheesa",
          arabic: "روضة الحمامة ",
        },
      },
      {
        name: {
          english: "Al Khor",
          arabic: "الخور والذخيرة",
        },
      },
      {
        name: {
          english: "-Al Dhakhira / Al Thakhira",
          arabic: "ام بركة",
        },
      },
      {
        name: {
          english: "-Simaisma",
          arabic: "الخور",
        },
      },
      {
        name: {
          english: "Al Sakhama",
          arabic: "وادي الوسعة",
        },
      },
      {
        name: {
          english: "Al-Shahaniya",
          arabic: "الشيحانية",
        },
      },
      {
        name: {
          english: "Doha",
          arabic: "الدوحة",
        },
      },
      {
        name: {
          english: "-Abu Hamour",
          arabic: "بوهامور",
        },
      },
      {
        name: {
          english: "-Ain Khaled",
          arabic: " فريج الخليفات الجديد ",
        },
      },
      {
        name: {
          english: "-Al Aziziya",
          arabic: " فريج المرة ",
        },
      },
      {
        name: {
          english: "-Al Bidda",
          arabic: "البدع",
        },
      },
      {
        name: {
          english: "-Al Dafna",
          arabic: "الدفنة",
        },
      },
      {
        name: {
          english: "-Al Doha Al Jadeeda",
          arabic: "الدوحة",
        },
      },
      {
        name: {
          english: "-Al Duhail",
          arabic: "دحيل",
        },
      },
      {
        name: {
          english: "-Al Gharrafa",
          arabic: "غرافة الريان",
        },
      },
      {
        name: {
          english: "-Al Hilal",
          arabic: "الهلال",
        },
      },
      {
        name: {
          english: "-Al Jasra",
          arabic: "الجسرة",
        },
      },
      {
        name: {
          english: "-Al Jebailat",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Al Khulaifat",
          arabic: "راس بو عبود",
        },
      },
      {
        name: {
          english: "-Al Khuwair",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Al Luqta / Old Al Rayyan",
          arabic: "فريج الزعيم / الريان العتيق",
        },
      },
      {
        name: {
          english: "-Al Maamoura",
          arabic: "مسيمير ",
        },
      },
      {
        name: {
          english: "-Al Mansoura / Fereej Bin Dirham",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Al Markhiya",
          arabic: "المرخية",
        },
      },
      {
        name: {
          english: "-Al Mesaimeer",
          arabic: "بوهامور",
        },
      },
      {
        name: {
          english: "-Al Messila",
          arabic: "المسيلة",
        },
      },
      {
        name: {
          english: "-Al Mirqab",
          arabic: "المرقاب الجديد",
        },
      },
      {
        name: {
          english: "-Al Muntazah",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Al Najada",
          arabic: "فريج",
        },
      },
      {
        name: {
          english: "-Al Nasr",
          arabic: "السد",
        },
      },
      {
        name: {
          english: "-Al Qassar",
          arabic: "الدفنة ",
        },
      },
      {
        name: {
          english: "-Al Qutaifiya",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Al Rumaila",
          arabic: "رميلة",
        },
      },
      {
        name: {
          english: "-Al Sadd",
          arabic: "السد",
        },
      },
      {
        name: {
          english: "-Al Tarfa / Jelaiah",
          arabic: "الطرفة",
        },
      },
      {
        name: {
          english: "-Al Thumama",
          arabic: "الوكير",
        },
      },
      {
        name: {
          english: "-Al Waab / Al Aziziya / New Al Ghanim",
          arabic: " فريج الغانم الجديد / فريج المرة / فريج المناصير",
        },
      },
      {
        name: {
          english: "-Al-Sailiya",
          arabic: "السيلية ",
        },
      },
      {
        name: {
          english: "-Aspire Zone",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Barwa City",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Barwa Village",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Doha International Airport",
          arabic: "مطار الدوحة الدولي",
        },
      },
      {
        name: {
          english: "-Doha Port",
          arabic: "ميناء الدوحة",
        },
      },
      {
        name: {
          english: "-Education City",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Fareej Al Ali",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Fereej Abdel Aziz",
          arabic: "فريج عبد العزيز",
        },
      },
      {
        name: {
          english: "-Fereej Al Ameer / Muraikh",
          arabic: "مريخ /  محيرجة",
        },
      },
      {
        name: {
          english: "-Fereej Bin Mahmoud",
          arabic: "فريج بن محمو",
        },
      },
      {
        name: {
          english: "-Fereej Bin Omran",
          arabic: "مدينة حمد الطبية",
        },
      },
      {
        name: {
          english: "-Fereej Kulaib",
          arabic: "فريج كليب",
        },
      },
      {
        name: {
          english: "-Industrial Area",
          arabic: "المنطقة الصناعية",
        },
      },
      {
        name: {
          english: "-Katara Cultural Village",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Luaib",
          arabic: "محيرجة",
        },
      },
      {
        name: {
          english: "-LUSAIL",
          arabic: "لوسيل ",
        },
      },
      {
        name: {
          english: "-Madinat Khalifa North / Dahl Al Hamam",
          arabic: "دحل الحمام",
        },
      },
      {
        name: {
          english: "-Madinat Khalifa South",
          arabic: "مدينة خليفة الجنوبية",
        },
      },
      {
        name: {
          english: "-Mehairja",
          arabic: "لوعيب ",
        },
      },
      {
        name: {
          english: "-Muither",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Mushaireb",
          arabic: "فريج محمد بن جاسم",
        },
      },
      {
        name: {
          english: "-Najma",
          arabic: "نجمة",
        },
      },
      {
        name: {
          english: "-New Al Ghanim",
          arabic: "بوسدرة",
        },
      },
      {
        name: {
          english: "-New Al Rayyan / Al Wajba",
          arabic: "معيذر / الوجبة",
        },
      },
      {
        name: {
          english: "-New Salata / Al Asiri",
          arabic: "اسلطة الجديدة",
        },
      },
      {
        name: {
          english: "-Nuaija",
          arabic: "نعيجة",
        },
      },
      {
        name: {
          english: "-Old Airport",
          arabic: "المطار العتيق",
        },
      },
      {
        name: {
          english: "-Old Al Ghanim",
          arabic: "الغانم العتيق",
        },
      },
      {
        name: {
          english: "-Old Al Hitmi",
          arabic: "الرفاع",
        },
      },
      {
        name: {
          english: "-Old Salata",
          arabic: "المرقاب",
        },
      },
      {
        name: {
          english: "-Onaiza",
          arabic: "عنيزة",
        },
      },
      {
        name: {
          english: "-Other",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Qatar National Convention Center",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Rawdat Al Khail",
          arabic: "روضة الخيل",
        },
      },
      {
        name: {
          english: "-Souq Waqif",
          arabic: "السوق",
        },
      },
      {
        name: {
          english: "-The Pearl Qatar",
          arabic: "",
        },
      },
      {
        name: {
          english: "-Umm Al Amad",
          arabic: " بو فسيلة",
        },
      },
      {
        name: {
          english: "-Umm Ghwailina",
          arabic: "ام غويلينة",
        },
      },
      {
        name: {
          english: "-Umm Lekhba",
          arabic: "ام لخبا",
        },
      },
      {
        name: {
          english: "-Umm Salal Ali",
          arabic: "ام صلال علي",
        },
      },
      {
        name: {
          english: "-Umsalal Mohammed",
          arabic: "ام صلال",
        },
      },
      {
        name: {
          english: "-Wadi Al Sail",
          arabic: "وادي السيل",
        },
      },
      {
        name: {
          english: "-West Bay",
          arabic: "",
        },
      },
      {
        name: {
          english: "Dukhan",
          arabic: "دخان",
        },
      },
      {
        name: {
          english: "Mesaeidd",
          arabic: "",
        },
      },
      {
        name: {
          english: "Wakrah",
          arabic: "الوكير",
        },
      },
      {
        name: {
          english: "-Al Wukair",
          arabic: "الوكير",
        },
      },
    ];

    const paymentOptions = [
      {
        type: "Visa",
        typeAr: "فيزا",
      },
      {
        type: "Maestro",
        typeAr: "مايسترو",
      },
      {
        type: "AmericanExpress",
        typeAr: "امريكان اكسبرس",
      },
      {
        type: "Mastercard",
        typeAr: "ماستركارد",
      },
      {
        type: "Maestrocard",
        typeAr: "مايستركارد",
      },
      {
        type: "Onecard",
        typeAr: "أنكارد",
      },
      {
        type: "Cash",
        typeAr: "نقد",
      },
    ];

    await City.insertMany(cities);
    await PaymentOption.insertMany(paymentOptions);

    console.log("seeded successfully...");
  } catch (error) {
    console.error(error);
  }
}

async function deleteDocuments() {
  try {
    await City.deleteMany();
    await PaymentOption.deleteMany();
  } catch (error) {
    console.error(error);
  }
}
