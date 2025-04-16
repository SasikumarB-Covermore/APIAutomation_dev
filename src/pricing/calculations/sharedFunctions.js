const XLSX = require('xlsx');


function getSheet(workbook, cover) {
  const sheetName = `${cover.code}_SellPrice`;
  //console.log("Sheet name for thw add ons " + sheetName);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }
  return sheet;
}

function createPrice(sellPrice, isDiscount = false) {
  return {
    gross: sellPrice,
    displayPrice: sellPrice,
    isDiscount: isDiscount
  };
}

//The policy Level Add-ons
function calculatePriceByValue(workbook, cover) {
  //console.log("Cover detail " + JSON.stringify(cover));
  const sheet = getSheet(workbook, cover);
  //console.log("Workbook sheet name " + JSON.stringify(sheet));
  const descriptionRange = XLSX.utils.sheet_to_json(sheet, { header: 1, range: "A2:A30" });
  console.log("descriptionRange  " + descriptionRange);
  let foundSellPrice = false;
  //console.log("descriptionRange length " + descriptionRange.length);
  for (let i = 0; i < descriptionRange.length; i++) {
    const descCell = descriptionRange[i][0]; // Get the value in the first column
    console.log(" $$$ " + descCell + " === " + cover.options[0].description);
    if (descCell === undefined) {
      break; // Exit the loop if the cell is empty
    } else if (descCell === cover.options[0].description) {

      const sellPriceCell = sheet[`B${i + 2}`]; // Adjust for zero-based index
      let sellPrice = sellPriceCell ? sellPriceCell.v : undefined;

      if (sellPrice === undefined) {
        throw new Error(`The selling price for ${cover.code} with amount label ${cover.amountLabel} was not found.`);
      }

      //console.log(`The calculated ${cover.code}_SellPrice for ${cover.amountLabel} is ${sellPrice}`);
      foundSellPrice = true; // Mark that the selling price was found

      return {
        code: cover.code,
        price: createPrice(sellPrice)
      };
    }
  }

  if (!foundSellPrice) {
    throw new Error(`The selling price for ${cover.code} with amount label ${cover.amountLabel} was not found.`);
  }

}


//The traveller Level Add-ons 
function calculatePriceByAgeband(workbook, priceCalcData, cover) {
  //console.log("Workbook " + JSON.stringify(workbook));
  console.log("price cal data " + JSON.stringify(priceCalcData));
  console.log("cover " + JSON.stringify(cover));

  const sheet = getSheet(workbook, cover)
  let foundSellPrice = false;

  // Determine the range for Area
  const areaRange = XLSX.utils.decode_range(sheet['!ref']);
  let areaColIndex = XLSX.utils.decode_col('A');

  // Loop through the rows in the area range
  for (let row = 1; row <= areaRange.e.r; row++) {
    //console.log("loop check ");
    let areaCell = sheet[XLSX.utils.encode_cell({ c: areaColIndex, r: row })];
    //console.log("loop check " + JSON.stringify(areaCell));
    if (areaCell && areaCell.v === priceCalcData.area) {
      //console.log("1 if check ");
      let ageBandCell = sheet[XLSX.utils.encode_cell({ c: 2, r: row })];
      let excessCell = sheet[XLSX.utils.encode_cell({ c: 3, r: row })];

      let isAgeMatch = isAgeInRange(priceCalcData.age, ageBandCell.v)
      let isExcessMatch = (excessCell.v === priceCalcData.excess)

      if (isAgeMatch && isExcessMatch) {
        console.log("2 if check ");
        let dateBucketCol = calculateDateBucket(sheet, priceCalcData.tripDuration);

        let sellingPriceCell = sheet[XLSX.utils.encode_cell({ c: XLSX.utils.decode_col(dateBucketCol), r: row })];
        let sellingPriceForAgeBracket = sellingPriceCell ? sellingPriceCell.v : 'N/A';
        let sellingPrice = Number(sellingPriceForAgeBracket);
        console.info(`The calculated Selling price for ${cover.code}:`, sellingPrice)
        if (!isNaN(sellingPrice)) {
          foundSellPrice = true;
          return {
            code: cover.code,
            price: createPrice(sellingPrice)
          }
        } else {
          throw new Error(`The selling price for the ${cover.code} has not been found in simple files`);
        }
      }
    }
  }
  if (!foundSellPrice) {
    throw new Error(`The selling price for ${cover.code} was not found.`);
  }
}

function calculateCRSPrice(workbook, row, cover) {
  console.log("Row " + JSON.stringify(row));
  console.log("cover " + JSON.stringify(cover));
  const sheet = getSheet(workbook, cover);
  //console.log("Sheet " + JSON.stringify(sheet));
  let foundSellPrice = false;
  const rngArea = XLSX.utils.sheet_to_json(sheet, { range: 'A2:A20000', header: 1 });
  //console.log("area cell value " + JSON.stringify(rngArea));
  for (let rowIndex = 0; rowIndex < rngArea.length; rowIndex++) {
    const areaCellValue = rngArea[rowIndex][0]; // Column A value
    // if (typeof areaCellValue !== 'undefined' && areaCellValue.length > 0) {
    //   console.log("area cell value " + JSON.stringify(areaCellValue));
    //   console.log("area cell value " + areaCellValue.replace(/"/g, '') + " === " + row.area);
    // }

    if (typeof areaCellValue !== 'undefined' && areaCellValue.length > 0 && areaCellValue.replace(/"/g, '') === row.area) {
      //console.log("area cell value " + areaCellValue.replace(/"/g, '') + " === " + row.area);
      const areaRowNum = rowIndex + 2; // Adjusting for 0-index and header

      const ageBandValue = sheet[`C${areaRowNum}`]?.v;
      const excessValue = sheet[`D${areaRowNum}`]?.v;

      let isAgeMatch = isAgeInRange(row.age, ageBandValue)
      let isExcessMatch = (excessValue === Number(row.excess))
      const yesValue = sheet[`E${areaRowNum}`]?.v;

      if (isAgeMatch && isExcessMatch && yesValue === 'Yes') {

        let dateBucketCol = calculateDateBucket(sheet, row.tripDuration);
        let sellingPrice = sheet[`${dateBucketCol}${areaRowNum}`]?.v;

        console.info(`The calculated selling price for ${cover.code}:`, sellingPrice)
        if (!isNaN(sellingPrice)) {
          foundSellPrice = true
          return {
            code: cover.code,
            price: createPrice(sellingPrice)
          }
        } else {
          throw new Error(`The selling price ${cover.code} has not been found in the simple files`);
        }
      }
    }
  }
  if (!foundSellPrice) {
    throw new Error(`The selling price for ${cover.code} was not found.`);
  }
}

function calculateEMCPrice(workbook, row, cover) {
  const sheet = getSheet(workbook, cover)
  let foundSellPrice = false;
  const rngArea = XLSX.utils.sheet_to_json(sheet, { range: 'A2:A20000', header: 1 });
  for (let rowIndex = 0; rowIndex < rngArea.length; rowIndex++) {
    const areaCellValue = rngArea[rowIndex][0]; // Column A value
    if (areaCellValue === row.area) {
      const areaRowNum = rowIndex + 2; // Adjusting for 0-index and header

      const ageBandValue = sheet[`C${areaRowNum}`]?.v;

      let isAgeMatch = isAgeInRange(row.age, ageBandValue)
      if (isAgeMatch) {

        let dateBucketCol = calculateDateBucket(sheet, row.tripDuration, 3);
        let sellingPrice = sheet[`${dateBucketCol}${areaRowNum}`]?.v;

        //console.info(`The calculated selling price for ${cover.code}:`, sellingPrice)
        if (!isNaN(sellingPrice)) {
          foundSellPrice = true
          return {
            code: cover.code,
            price: createPrice(sellingPrice)
          }
        } else {
          throw new Error(`The selling price ${cover.code} has not been found in the simple files`);
        }
      }
    }
  }
  if (!foundSellPrice) {
    throw new Error(`The selling price for ${cover.code} was not found.`);
  }
}

// Calculate Date Bucket Column
function calculateDateBucket(sheet, tripDuration, startCol = 4) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let col = startCol; col <= range.e.c; col++) { // Start from column E (index 4)
    let dateBucketCell = sheet[XLSX.utils.encode_cell({ c: col, r: 0 })];
    if (dateBucketCell) {
      let tempDate = dateBucketCell.v.toString().slice(0, -1);
      const dateBucketCol = XLSX.utils.encode_col(col);
      if (parseInt(tempDate) >= parseInt(tripDuration)) {
        return dateBucketCol;
      }
    }
  }
  throw new Error(`No suitable date bucket found for trip duration: ${tripDuration}`);
}


function isAgeInRange(number, rangeStr) {
  // Split the range string into start and end values
  const [start, end] = rangeStr.split('-').map(Number);

  // Check if the number is within the range
  return number >= start && number <= end;
}


module.exports = {
  calculatePriceByValue,
  calculatePriceByAgeband,
  calculateCRSPrice,
  isAgeInRange,
  calculateDateBucket,
  calculateEMCPrice
}; 