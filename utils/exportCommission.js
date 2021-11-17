const xlsx = require("xlsx");
const path = require("path");

const exportCommission = (data, workSheetColumnNames, workSheetName, filePath) => {
  const workBook = xlsx.utils.book_new();
  const workSheetData = [workSheetColumnNames, ...data];
  const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
  //console.log('worksheet name');
  //console.log(workSheet);
  xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName);
  xlsx.writeFile(workBook, path.resolve(filePath));
};

const exportCommissionToExcel = (
  commission,
  workSheetColumnNames,
  workSheetName,
  filePath
) => {
  const data = commission.map((commissioninfo) => {
    return [commissioninfo.name, commissioninfo.commission];
  });
  //console.log('array detect');
  // console.log(data);
  exportCommission(data, workSheetColumnNames, workSheetName, filePath);
};

module.exports = exportCommissionToExcel;
