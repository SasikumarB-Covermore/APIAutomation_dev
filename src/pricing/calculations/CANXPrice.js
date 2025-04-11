const XLSX = require('xlsx');
const { calculateDateBucket, isAgeInRange } = require("./sharedFunctions");
const { ro } = require('@faker-js/faker');

function numberWithCommas(x) {
  x = x.toString();
  var pattern = /(-?\d+)(\d{3})/;
  while (pattern.test(x))
    x = x.replace(pattern, "$1,$2");
  return x;
}

function calculateCANXPrice(simpleFileWorkbook, requestPayload, row) {
  let totalSellingPrice = 0
  requestPayload["travellers"].forEach((traveller, i) => {
    row.age = traveller.age
    const foundCover = requestPayload?.additionalCovers?.find(cover => cover.code === 'CANX');
    row.CANXAmount = foundCover?.amountLabel
    const rate = calcCANX(simpleFileWorkbook, 'CANX_Rates', row);
    const discount = calcCANX(simpleFileWorkbook, 'CANX_Discount', row);
    const commission = calcCANX(simpleFileWorkbook, 'CANX_Commission', row);
    const value = calcCANXValue(simpleFileWorkbook, row);
    if ([rate, discount, commission, value].some(val => val === null || val === undefined)) {
      console.log("Traveller Age", traveller.age)
      console.log("rate:", rate);
      console.log("discount:", discount);
      console.log("commission:", commission);
      console.log("CANX_value:", value);
      throw new Error('One or more values are null or undefined');
    }
    //A3*B3*(1-D3)/(1-C3)
    const effectiveRate = rate * value;
    const netDiscount = 1 - discount;
    const netCommission = 1 - commission;
    let baseCANXPrice = effectiveRate * netDiscount / netCommission
    let canxSellPriceAdult = 0;
    //console.log("check travaller " + JSON.stringify(traveller));
    //console.log("Traveller treat as Adult " + traveller.treatAsAdult + "== true");
    //console.log("Child charge rate " + row.childChargeRate);
    if (traveller.treatAsAdult != "true") {
      //console.log("Check adult = Yes");
      canxSellPriceAdult = row.childChargeRate === 0 ? 0 : (row.childChargeRate !== 1 ? baseCANXPrice * row.childChargeRate : baseCANXPrice);
    } else {
      //console.log("Check adult = NO");
      canxSellPriceAdult = baseCANXPrice;
    }
    //console.log(`Calculated CANX Price for Age of ${traveller.age} is :`, canxSellPriceAdult);
    totalSellingPrice += canxSellPriceAdult;
  })
  const canxSellPrice = calcCANXSellPrice(totalSellingPrice, row.numAdults)
  return {
    code: 'CANX',
    price: { gross: canxSellPrice, displayPrice: canxSellPrice, isDiscount: false }
  }
}



function calcCANXSellPrice(totalSellingPrice, numAdults) {
  if (totalSellingPrice !== undefined && numAdults) {
    return Math.round(totalSellingPrice / numAdults)
  }
}


function calcCANXValue(workbook, row) {
  const sheet = workbook.Sheets['CANX_Value'];
  if (!sheet) {
    throw new Error(`Sheet "CANX_Value" not found.`);
  }

  // Read the range A2:A20000
  const range = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 'A2:A20000' });
  //console.log("value sheet lenght " + range.length);
  for (let i = 0; i < range.length; i++) {
    const cellValue = range[i][0]; // A column values
    //console.log("cell value form simple file " + cellValue);
    //console.log("cell value form simple file" + cellValue + " ==== " + "$" + numberWithCommas(row.CANX));
    if (cellValue === undefined) {
      //console.log("cell value form simple file check");
      break; // Exit if the cell is empty
    } else if (cellValue == "$" + numberWithCommas(row.CANX)) {
      //console.log("cell value form simple file check");
      const CANX_VAL_ROW = i + 2; // Adjust for 0-based index
      if (row.numAdults >= 2) {
        return sheet[`C${CANX_VAL_ROW}`]?.v; // C column value
      } else {
        return sheet[`B${CANX_VAL_ROW}`]?.v; // B column value
      }
    }
  }
}

function calcCANX(workbook, sheetName, row) {
  //console.log("\n Data comes from " + sheetName + "\n and " + JSON.stringify(row));
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }
  const rngArea = XLSX.utils.sheet_to_json(sheet, { range: 'A2:A20000', header: 1 });
  let colValue;
  for (let rowIndex = 0; rowIndex < rngArea.length; rowIndex++) {
    const areaCellValue = rngArea[rowIndex][0]; // Column A value
    if (areaCellValue === row.area) {
      const areaRowNum = rowIndex + 2; // Adjusting for 0-index and header

      const ageBandValue = sheet[`C${areaRowNum}`]?.v;
      const excessValue = sheet[`D${areaRowNum}`]?.v;

      let isAgeMatch = isAgeInRange(row.age, ageBandValue)
      let isExcessMatch = (excessValue === Number(row.excess))
      if (isAgeMatch && isExcessMatch) {
        let dateBucketCol = calculateDateBucket(sheet, row.leadTime);
        colValue = sheet[`${dateBucketCol}${areaRowNum}`]?.v;
        break;
      }
    }
  }
  return colValue;
}


function calculateCFAR(simpleFileWorkbook, requestPayload, row) {

  const calculatedCANXPrice = calculateCANXPrice(simpleFileWorkbook, requestPayload, row);
  //console.log("cal CANX price " + JSON.stringify(calculatedCANXPrice));

  // Check if the calculated price is valid
  if (!calculatedCANXPrice || !calculatedCANXPrice.price || typeof calculatedCANXPrice.price.gross !== 'number') {
    throw new Error('Failed to calculate CFAR price. The CANX price is invalid or undefined.');
  }

  const price = calculatedCANXPrice.price.gross;

  const cfarRatesSheet = simpleFileWorkbook.Sheets['CANXPC_Rates'];
  if (!cfarRatesSheet) {
    throw new Error('CANXPC_Rates Sheet has not found.');
  }

  // Check if the CFAR rate is defined
  const cfarRateCell = cfarRatesSheet['B2'];
  if (!cfarRateCell || typeof cfarRateCell.v !== 'number') {
    throw new Error('CFAR rate is missing or invalid in the CANXPC_Rates sheet.');
  }

  // Get the CFAR rate
  const cfarRate = cfarRateCell.v;

  // Calculate the CFAR price
  let cfarPrice = price * cfarRate;


  //let cfarPrice = (price * (1 - (-0.1428571))) * cfarRate
  return {
    code: 'CANXPC',
    price: { gross: cfarPrice, displayPrice: cfarPrice, isDiscount: false }
  };

}




// function calculateLeadTimeInDays(targetDate) {
//   // Get today's date
//   const today = new Date();

//   // Parse the target date
//   const target = new Date(targetDate);

//   // Calculate the difference in milliseconds
//   const diffInMs = target - today;

//   // Check if the target date is in the past
//   if (diffInMs < 0) {
//       return "The target date is in the past.";
//   }

//   // Calculate the difference in days
//   const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); // Milliseconds to days

//   return diffInDays;
// }



module.exports = {
  calculateCANXPrice, calculateCFAR
};
