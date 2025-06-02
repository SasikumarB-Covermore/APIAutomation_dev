const XLSX = require('xlsx');


function getSheet(workbook, cover) {
  const sheetName = `${cover.code}_SellPrice`;
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
  const sheet = getSheet(workbook, cover);
  const descriptionRange = XLSX.utils.sheet_to_json(sheet, { header: 1, range: "A2:A30" });
  let foundSellPrice = false;
  for (let i = 0; i < descriptionRange.length; i++) {
    const descCell = descriptionRange[i][0]; // Get the value in the first column
    if (descCell === undefined) {
      break; // Exit the loop if the cell is empty
    } else if (descCell === cover.options[0].description) {

      const sellPriceCell = sheet[`B${i + 2}`]; // Adjust for zero-based index
      let sellPrice = sellPriceCell ? sellPriceCell.v : undefined;

      if (sellPrice === undefined) {
        throw new Error(`The selling price for ${cover.code} with amount label ${cover.amountLabel} was not found.`);
      }

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
  const sheet = getSheet(workbook, cover)
  let foundSellPrice = false;

  // Determine the range for Area
  const areaRange = XLSX.utils.decode_range(sheet['!ref']);
  let areaColIndex = XLSX.utils.decode_col('A');

  // Loop through the rows in the area range
  for (let row = 1; row <= areaRange.e.r; row++) {
    let areaCell = sheet[XLSX.utils.encode_cell({ c: areaColIndex, r: row })];
    if (areaCell && areaCell.v === priceCalcData.area) {
      let ageBandCell = sheet[XLSX.utils.encode_cell({ c: 2, r: row })];
      let excessCell = sheet[XLSX.utils.encode_cell({ c: 3, r: row })];

      let isAgeMatch = isAgeInRange(priceCalcData.age, ageBandCell.v)
      let isExcessMatch = (excessCell.v === priceCalcData.excess)

      if (isAgeMatch && isExcessMatch) {
        let dateBucketCol = calculateDateBucket(sheet, priceCalcData.tripDuration);

        let sellingPriceCell = sheet[XLSX.utils.encode_cell({ c: XLSX.utils.decode_col(dateBucketCol), r: row })];
        let sellingPriceForAgeBracket = sellingPriceCell ? sellingPriceCell.v : 'N/A';
        let sellingPrice = Number(sellingPriceForAgeBracket);
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
  const sheet = getSheet(workbook, cover);
  let foundSellPrice = false;
  const rngArea = XLSX.utils.sheet_to_json(sheet, { range: 'A2:A20000', header: 1 });
  for (let rowIndex = 0; rowIndex < rngArea.length; rowIndex++) {
    const areaCellValue = rngArea[rowIndex][0]; // Column A value
    if (typeof areaCellValue !== 'undefined' && areaCellValue.length > 0 && areaCellValue.replace(/"/g, '') === row.area) {
      const areaRowNum = rowIndex + 2; // Adjusting for 0-index and header

      const ageBandValue = sheet[`C${areaRowNum}`]?.v;
      const excessValue = sheet[`D${areaRowNum}`]?.v;

      let isAgeMatch = isAgeInRange(row.age, ageBandValue)
      let isExcessMatch = (excessValue === Number(row.excess))
      const yesValue = sheet[`E${areaRowNum}`]?.v;
      if (isAgeMatch && isExcessMatch && yesValue === 'Yes') {

        let dateBucketCol = calculateDateBucket(sheet, row.tripDuration);
        let sellingPrice = sheet[`${dateBucketCol}${areaRowNum}`]?.v;
        if (!isNaN(sellingPrice)) {
          foundSellPrice = true
          return {
            age: row.age,
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

function calculateWNTSPrice(workbook, row, cover) {
  const sheet = getSheet(workbook, cover);
  let foundSellPrice = false;
  const rngArea = XLSX.utils.sheet_to_json(sheet, { range: 'A2:A20000', header: 1 });
  for (let rowIndex = 0; rowIndex < rngArea.length; rowIndex++) {
    const areaCellValue = rngArea[rowIndex][0]; // Column A value
    if (typeof areaCellValue !== 'undefined' && areaCellValue.length > 0 && areaCellValue.replace(/"/g, '') === row.area) {
      const areaRowNum = rowIndex + 2; // Adjusting for 0-index and header

      const ageBandValue = sheet[`C${areaRowNum}`]?.v;
      const excessValue = sheet[`D${areaRowNum}`]?.v;

      let isAgeMatch = isAgeInRange(row.age, ageBandValue)
      let isExcessMatch = (excessValue === Number(row.excess))
      console.log("Age band Match check before if ");
      if (isAgeMatch && isExcessMatch) {
        console.log("Age band Match check after if ");
        let dateBucketCol = calculateDateBucket(sheet, row.tripDuration);
        let sellingPrice = sheet[`${dateBucketCol}${areaRowNum}`]?.v;
        if (!isNaN(sellingPrice)) {
          foundSellPrice = true
          return {
            age: row.age,
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
  tripDuration = tripDuration == null ? 0 : tripDuration;
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
  calculateWNTSPrice,
  isAgeInRange,
  calculateDateBucket,
  calculateEMCPrice
}; 