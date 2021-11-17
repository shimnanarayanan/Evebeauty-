const xlsx = require('xlsx');
const path = require('path');

const exportExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
    const workBook = xlsx.utils.book_new();
    const workSheetData = [
        workSheetColumnNames,
        ... data
    ];
    const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
    //console.log('worksheet name');
    //console.log(workSheet);
    xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName);
    xlsx.writeFile(workBook, path.resolve(filePath));
}

const exportUsersToExcel = (booking, workSheetColumnNames, workSheetName, filePath) => {
    // console.log(booking);
    const data = booking.map(book => {
        let bookingData = [];
        let bookingSaloon,bookingCity,bookingUser;
        if(book.saloon==null){
            bookingSaloon = "Not exist";
        }else{
            bookingSaloon = book.saloon.name.english ;
        }
        if(book.user==null){
            bookingUser = "Not Exist";
         }else{
            bookingUser = book.user.name ;
         }
        if(book.saloon==null){
            bookingCity = "Not Exist";
        }else{
            bookingCity = book.saloon.city.name.english ;
        }
        
                 bookingData.push(bookingUser, bookingSaloon,bookingCity, book.date, book.status);
         
        // return [book.ids, book.user.name, book.saloon.name.english, book.location, book.booking_info.service.name, book.date, book.booking_info, book.status];
        return bookingData;
        
    });
    //console.log('array detect');
   // console.log(data);
    exportExcel(data, workSheetColumnNames, workSheetName, filePath);
}

module.exports = exportUsersToExcel;