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
    console.log("Canx rate " + rate + " discount " + discount + " commission " + commission + " value " + value);
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
    let baseCANXPrice = effectiveRate * netDiscount / netCommission;
    let canxSellPriceAdult = 0;
    if (traveller.treatAsAdult != "true") {
      canxSellPriceAdult = row.childChargeRate === 0 ? 0 : (row.childChargeRate !== 1 ? baseCANXPrice * row.childChargeRate : baseCANXPrice);
    } else {
      canxSellPriceAdult = baseCANXPrice;
    }
    totalSellingPrice += canxSellPriceAdult;
  });
  const canxSellPrice = calcCANXSellPrice(totalSellingPrice, row.numAdults, row.numChild);
  return {
    code: 'CANX',
    price: { gross: canxSellPrice, displayPrice: canxSellPrice, isDiscount: false }
  }
}

function calculateCANXPriceForGetQuote(simpleFileWorkbook, response, row) {
  let canxAddon;
  response.quoteSummary.products.forEach(product => {
    product.premiumMatrix.forEach(matrix => {
      if (matrix.isSelected == true) {
        let totalSellingPrice = 0
        response.quoteSummary.travellers.forEach((traveller, i) => {
          row.age = traveller.age
          const foundCover = response.quoteSummary.products?.additionalCovers?.find(cover => cover.code === 'CANX');
          row.CANXAmount = foundCover?.amountLabel
          const rate = calcCANXForGetQuote(simpleFileWorkbook, 'CANX_Rates', row, matrix.excess);
          const discount = calcCANXForGetQuote(simpleFileWorkbook, 'CANX_Discount', row, matrix.excess);
          const commission = calcCANXForGetQuote(simpleFileWorkbook, 'CANX_Commission', row, matrix.excess);
          const value = calcCANXValueForGetQuote(simpleFileWorkbook, row);
          //console.log("Canx rate " + rate + " discount " + discount + " commission " + commission + " value " + value);
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
          let baseCANXPrice = effectiveRate * netDiscount / netCommission;
          let canxSellPriceAdult = 0;
          if (traveller.treatAsAdult != true) {
            canxSellPriceAdult = row.childChargeRate === 0 ? 0 : (row.childChargeRate !== 1 ? baseCANXPrice * row.childChargeRate : baseCANXPrice);
          } else {
            canxSellPriceAdult = baseCANXPrice;
          }
          //console.log("check Canx Sell price for Adult " + canxSellPriceAdult);
          totalSellingPrice += canxSellPriceAdult;
        });
        const canxSellPrice = calcCANXSellPrice(totalSellingPrice, row.numAdults, row.numChild);
        //console.log("Checking Canx Sellprice " + canxSellPrice);
        canxAddon = {
          code: 'CANX',
          price: { gross: canxSellPrice, displayPrice: canxSellPrice, isDiscount: false }
        }
      }
    });
  });
  return canxAddon;
}



function customRound(num) {
  const diff = num - Math.floor(num); 2
  if (diff === 0.5) {
    return Math.floor(num);
  } else {
    return Math.round(num);
  }
}

function calcCANXSellPrice(totalSellingPrice, numAdults, numChild) {
  if (totalSellingPrice !== undefined && numAdults) {
    console.log("total Selling price " + totalSellingPrice + " and number of adults " + numAdults);
    let canxSellPrice = 0;
    if (numAdults > 0) {
      canxSellPrice = totalSellingPrice / numAdults;
    } else {
      canxSellPrice = totalSellingPrice / numChild;
    }

    let canxSellPriceRoundOff = customRound(canxSellPrice);
    return canxSellPriceRoundOff;
    //return Math.round(totalSellingPrice / numAdults)
  }
}



function calcCANXValue(workbook, row) {
  const sheet = workbook.Sheets['CANX_Value'];
  if (!sheet) {
    throw new Error(`Sheet "CANX_Value" not found.`);
  }

  // Read the range A2:A20000
  const range = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 'A2:A20000' });
  for (let i = 0; i < range.length; i++) {
    const cellValue = range[i][0]; // A column values
    if (cellValue === undefined) {
      break; // Exit if the cell is empty
    } else if (cellValue == "$" + numberWithCommas(row.CANX)) {
      const CANX_VAL_ROW = i + 2; // Adjust for 0-based index
      if (row.numAdults >= 2 || row.numChild >= 2) {
        return sheet[`C${CANX_VAL_ROW}`]?.v; // C column value
      } else {
        return sheet[`B${CANX_VAL_ROW}`]?.v; // B column value
      }
    }
  }
}

function calcCANXValueForGetQuote(workbook, row) {
  const sheet = workbook.Sheets['CANX_Value'];
  if (!sheet) {
    throw new Error(`Sheet "CANX_Value" not found.`);
  }

  // Read the range A2:A20000
  const range = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 'A2:A20000' });
  for (let i = 0; i < range.length; i++) {
    const cellValue = range[i][0]; // A column values
    if (cellValue === undefined) {
      break; // Exit if the cell is empty
    } else if (cellValue == "$" + numberWithCommas(row.planName.includes("Dom") ? "10000" : "Unlimited")) {
      const CANX_VAL_ROW = i + 2; // Adjust for 0-based index
      if (row.numAdults >= 2 || row.numChild >= 2) {
        return sheet[`C${CANX_VAL_ROW}`]?.v; // C column value
      } else {
        return sheet[`B${CANX_VAL_ROW}`]?.v; // B column value
      }
    }
  }
}

function calcCANX(workbook, sheetName, row) {
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

function calcCANXForGetQuote(workbook, sheetName, row, excess) {
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
      let isExcessMatch = (excessValue === Number(excess))
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


module.exports = {
  calculateCANXPrice, calculateCANXPriceForGetQuote, calculateCFAR
};
