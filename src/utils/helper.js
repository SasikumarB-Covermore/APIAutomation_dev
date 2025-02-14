// src/utils/helper.js
const { faker } = require('@faker-js/faker');
const dynamicDate = require("../utils/apiClient");
const { addDays } = require('date-fns');
const { generateCommonData, generateCommonRefineQouteData, generateCommonIssuePolicyData } = require("../utils/dataGenerator");
const numeral = require('numeral')
const { expect } = require('@playwright/test');  // Import expect
const {
  getTravelPayloadForQuote,
  getTravelPayloadForRefineQuote,
  getTravelPayloadForIssuePolicy,
  getTravelPayloadForUpdateTraveller,
} = require("../utils/payloadStructures");

const path = require('path');
const fs = require("fs");
const { tr } = require('date-fns/locale');

function generateTravelDataNTimes(numAdults = 1, numChild = 0, row) {
  return generateData(numAdults, numChild, row);
}


function generateRefineQouteTravelDataNTimes(numAdults = 1, numChild = 0, row) {
  return generateRefineQouteData(numAdults, numChild, row);
}

function generateIssuePolicyTravelDataNTimes(numAdults = 1, numChild = 0, row) {
  return generateIssuePolicyData(numAdults, numChild, row);
}

function generateData(numAdults, numChild, row) {
  const quotePayload = [];
  const updatePayload = [];
  let isPrimary;
  if (numAdults > 0) {
    addPayloadsForGroup(numAdults, 'adult', quotePayload, updatePayload, row);
  }

  if (numChild > 0) {
    isPrimary = false;
    addPayloadsForGroup(numChild, 'child', quotePayload, updatePayload, row, isPrimary);
  }

  return [quotePayload, updatePayload];
}

function generateRefineQouteData(numAdults, numChild, row) {
  const quotePayload = [];
  const updatePayload = [];
  let isPrimary;
  if (numAdults > 0) {
    addPayloadsForGroupRefineQoute(numAdults, 'adult', quotePayload, updatePayload, row);
  }

  if (numChild > 0) {
    isPrimary = false;
    addPayloadsForGroupRefineQoute(numChild, 'child', quotePayload, updatePayload, row, isPrimary);
  }

  return [quotePayload, updatePayload];
}

function generateIssuePolicyData(numAdults, numChild, row) {
  const quotePayload = [];
  const updatePayload = [];
  let isPrimary;
  if (numAdults > 0) {
    addPayloadsForGroupIssuePolicy(numAdults, 'adult', quotePayload, updatePayload, row);
  }

  if (numChild > 0) {
    isPrimary = false;
    addPayloadsForGroupIssuePolicy(numChild, 'child', quotePayload, updatePayload, row, isPrimary);
  }

  return [quotePayload, updatePayload];
}

function addPayloadsForGroup(count, type, quotePayload, updatePayload, row, isPrimary) {
  for (let i = 1; i <= count; i++) {
    const identifier = `${type}${i}`;
    const commonData = generateCommonData(identifier, row, isPrimary);
    quotePayload.push(flattenObject(getTravelPayloadForQuote(commonData)));
    updatePayload.push(flattenObject(getTravelPayloadForUpdateTraveller(commonData)));
  }
}

function addPayloadsForGroupRefineQoute(count, type, quotePayload, updatePayload, row, isPrimary) {
  for (let i = 1; i <= count; i++) {
    const identifier = `${type}${i}`;
    const commonData = generateCommonRefineQouteData(identifier, row, isPrimary);
    quotePayload.push(flattenObject(getTravelPayloadForRefineQuote(commonData)));
    updatePayload.push(flattenObject(getTravelPayloadForUpdateTraveller(commonData)));
  }
}

function addPayloadsForGroupIssuePolicy(count, type, quotePayload, updatePayload, row, isPrimary) {
  for (let i = 1; i <= count; i++) {
    const identifier = `${type}${i}`;
    const commonData = generateCommonIssuePolicyData(identifier, row, isPrimary);
    quotePayload.push(flattenObject(getTravelPayloadForIssuePolicy(commonData)));
    updatePayload.push(flattenObject(getTravelPayloadForUpdateTraveller(commonData)));
  }
}

// Flatten any array-like structure to plain objects
function flattenObject(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
}

function extractAddOnsFromPayload(requestPayload) {
  let prolicyLevelAddOns = requestPayload["additionalCovers"]
  let travelLevelAddOns = (requestPayload["travellers"] != {}) ? requestPayload["travellers"][0]["additionalCovers"] : []
  return {
    prolicyLevelAddOns,
    travelLevelAddOns
  };
}

function extractAddOnsFromAPIResponse(row, responseBody) {
  const productID = row.productID;
  const excess = row.excess;
  // Ensure the productID and excess exist in the responseBody
  if (!responseBody.product[productID]) {
    throw new Error(`Product ID ${productID} not found in the response`);
  }

  if (!responseBody.product[productID].excess[excess]) {
    throw new Error(`Excess ${excess} not found for Product ID ${productID}`);
  }

  const durationKey = Object.keys(responseBody.product[productID].excess[excess].duration)[0];
  const policyAddOnsList = responseBody.product[productID].excess[excess].duration[durationKey].additionalCoverPrices;

  // Extract traveller-level covers from response dynamically
  let responseTravelCodes = responseBody.product[productID].excess[excess].duration[durationKey].travellers.flatMap(traveller =>
    traveller.additionalCoverPrices
  );
  const jsonKey = (item) => JSON.stringify(item);
  const travelAddOnsList = removeDuplicatesByKey(responseTravelCodes, jsonKey);

  return { travelAddOnsList, policyAddOnsList }
}

function parseAPIResponse(row, responseBody) {
  const productID = row.productID;
  const excess = row.excess;
  // Ensure the productID and excess exist in the responseBody
  if (!responseBody.product[productID]) {
    throw new Error(`Product ID ${productID} not found in the response`);
  }

  if (!responseBody.product[productID].excess[excess]) {
    throw new Error(`Excess ${excess} not found for Product ID ${productID}`);
  }

  const durationKey = Object.keys(responseBody.product[productID].excess[excess].duration)[0];
  // Extract traveller-level covers from response dynamically
  let reponseProduct = responseBody.product[productID].excess[excess].duration[durationKey]
  return reponseProduct
}


function removeDuplicatesByKey(inputArray, keyFunction) {
  const unique = [];
  const obj = {};
  inputArray.forEach(item => {
    let key = keyFunction(item)
    if (!obj[key]) {
      unique.push(item);
      obj[key] = item;
    }
  });
  return unique;
}



function createQuotePayload(sessionToken, row, payLoadQuote, policyAddOns) {
  return {
    sessionToken: sessionToken,
    isResident: row.isResident,
    productID: row.productID,
    multiTripDuration: row.multiTripDuration,
    excess: row.excess,
    trip: {
      departureDate: row.departureDate,
      returnDate: row.returnDate,
      destinationCountryCodes: [row.destinationCountryCodes]
    },
    travellers: payLoadQuote,
    additionalCovers: policyAddOns
  }
}

function validateTheAddOnsPrice(itemToMatch, itemsArray) {
  return itemsArray.find(item =>
    item.code === itemToMatch.code &&
    item.price.displayPrice === itemToMatch.price
  );
}



function calculateDepartureDate(leadTime) {
  const currentDate = new Date();

  // Calculate departure date by adding leadTime to the current date
  const parsedLeadTime = parseInt(leadTime, 10);
  const deptDate = new Date(currentDate);
  deptDate.setDate(currentDate.getDate() + parsedLeadTime);


  // Format the departure date as YYYY-MM-DD
  return deptDate.toISOString().split('T')[0];
}

function calculateReturnDate(departureDate, duration) {
  const depDate = new Date(departureDate); // Ensure departureDate is a Date object

  if (duration <= 1) {
    return depDate.toISOString().split('T')[0]; // Return the same day in YYYY-MM-DD format
  } else {
    const retnDate = new Date(depDate);

    retnDate.setTime(retnDate.getTime() + (duration - 1) * 24 * 60 * 60 * 1000); // Add days in milliseconds

    return retnDate.toISOString().split('T')[0]; // Return formatted return date
  }
}


// Function to create the payload based on various conditions
function createPayload(row, payLoadQuote, policyAddOns = [], emcOptions = null) {

  const departureDate = calculateDepartureDate(row.leadTime);

  const returnDate = calculateReturnDate(departureDate, row.duration);

  if (!Array.isArray(payLoadQuote)) {
    console.warn('Warning: payLoadQuote is not an array. Wrapping it in an array.');
    payLoadQuote = [payLoadQuote];
  }


  // Default payload structure
  let payload = {
    issuer: {
      code: "MBN0002",
      userName: "qat",
      externalStoreCode: ""
    },
    trip: {
      destinationCountryCodes: [row.destinationCountryCodes],
      startDate: departureDate,
      endDate: returnDate
    },
    travellers: payLoadQuote,
    purchasePath: "Leisure_Medibank",
    isResident: row.isResident,
  };

  // If add-ons are present, add them to the payload
  if (policyAddOns && policyAddOns.length > 0) {

    payload.additionalCovers = policyAddOns;
  }

  // If EMC options are provided, update travellers' details
  if (emcOptions) {
    payload.travellers = payload.travellers.map(traveller => {
      if (traveller.identifier === emcOptions.identifier) {
        return {
          ...traveller,
          emcAccepted: emcOptions.emcAccepted,
          assessmentID: emcOptions.assessmentID
        };
      }
      return traveller;
    });
  }

  if (row.discount !== undefined) {
    payload["promoCodes"] = [row.promoCode ? row.promoCode : ""]
  }
  return payload;
}


// Function to create the payload for Refine Quote 
function createPayloadForRefineQuote(row, payLoadRefineQuote, policyAddOns = [], emcOptions = null, responseBody) {

  const departureDate = calculateDepartureDate(row.leadTime);

  const returnDate = calculateReturnDate(departureDate, row.duration);

  if (!Array.isArray(payLoadRefineQuote)) {
    console.warn('Warning: payLoadRefineQuote is not an array. Wrapping it in an array.');
    payLoadRefineQuote = [payLoadRefineQuote];
  }


  // Default payload structure
  let payload = {
    issuer: {
      code: "MBN0002",
      userName: "qat",
      externalStoreCode: ""
    },

    //travellers: payLoadRefineQuote,
    products: [
      {
        // additionalCoverAddons: [
        //   {
        //     CODE: responseBody.quoteSummary.products[0].additionalCoverAddons[0].code,
        //     OPTIONS: [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]],
        //     ADDONDURATION: [
        //       responseBody.quoteSummary.products[0].availableCoverAddons[0].addOnDuration
        //     ]

        //   }
        // ],
        // premiumMatrix: [
        //   {
        //     excess: row.excess,
        //     maxDurationDays: null,
        //     totalGrossPremium: "210.00",
        //     totalAdjustedGrossPremium: "210.00",
        //     premiumPerDay: "6.56",
        //     isSelected: true,
        //     commission: "77.70"
        //   }
        // ],
        productCode: row.productCode,
        planCode: row.planCode
      }
    ],
    quoteId: responseBody.quoteId,
    sessionId: responseBody.sessionId,
    isResident: true
  };

  //Create Paload based on planName (Domestic or International)
  let additionalCoverAddons = [];
  let premiumMatrix = [];
  if (row.planName == "Dom-ST") {
    console.log("*****Refine quote pauload for " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "D") {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].availableCoverAddons[0].addOnDuration];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "DM") {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].availableCoverAddons[0].addOnDuration];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }
    console.log("additionalCoverAddons for Dom-ST " + JSON.stringify(additionalCoverAddons));
  } else if (row.planName == "Dom-AMT-Family") {
    console.log("*****Refine quote pauload for " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "DMF" && row.duration == 15) {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].availableCoverAddons[0].addOnDuration];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "DMF" && row.duration == 30) {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].availableCoverAddons[0].addOnDuration];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }
  } else if (row.planName == "Int-ST") {
    console.log("*****Refine quote pauload for " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "MCA" && row.excess == 0) {
      let code = responseBody.quoteSummary.products[0].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[0].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[0].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[0].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCA" && row.excess == 100) {
      let code = responseBody.quoteSummary.products[0].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[0].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[0].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[0].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });

    } else if (row.productCode == "MBC" && row.planCode == "MCA" && row.excess == 250) {
      let code = responseBody.quoteSummary.products[0].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[0].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[0].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[0].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBM" && row.planCode == "MMA" && row.excess == 0) {
      let code = responseBody.quoteSummary.products[1].availableCoverAddons[3].code;
      let applyAtLevel = responseBody.quoteSummary.products[1].availableCoverAddons[3].applyAtLevel;
      let name = responseBody.quoteSummary.products[1].availableCoverAddons[3].name;
      let helpText = responseBody.quoteSummary.products[1].availableCoverAddons[3].helpText;
      let options = [responseBody.quoteSummary.products[1].availableCoverAddons[3].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[1].availableCoverAddons[3].addOnDuration];
      let excess = responseBody.quoteSummary.products[1].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[1].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[1].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[1].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[1].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[1].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBM" && row.planCode == "MMA" && row.excess == 100) {
      let code = responseBody.quoteSummary.products[1].availableCoverAddons[3].code;
      let applyAtLevel = responseBody.quoteSummary.products[1].availableCoverAddons[3].applyAtLevel;
      let name = responseBody.quoteSummary.products[1].availableCoverAddons[3].name;
      let helpText = responseBody.quoteSummary.products[1].availableCoverAddons[3].helpText;
      let options = [responseBody.quoteSummary.products[1].availableCoverAddons[3].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[1].availableCoverAddons[3].addOnDuration];
      let excess = responseBody.quoteSummary.products[1].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[1].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[1].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[1].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[1].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[1].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBM" && row.planCode == "MMA" && row.excess == 250) {
      let code = responseBody.quoteSummary.products[1].availableCoverAddons[3].code;
      let applyAtLevel = responseBody.quoteSummary.products[1].availableCoverAddons[3].applyAtLevel;
      let name = responseBody.quoteSummary.products[1].availableCoverAddons[3].name;
      let helpText = responseBody.quoteSummary.products[1].availableCoverAddons[3].helpText;
      let options = [responseBody.quoteSummary.products[1].availableCoverAddons[3].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[1].availableCoverAddons[3].addOnDuration];
      let excess = responseBody.quoteSummary.products[1].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[1].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[1].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[1].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[1].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[1].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }

  } else if (row.planName == "Int-AMT-Single") {
    console.log("*****Refine quote pauload for " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 0 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
      console.log("$$$$$ additionalCoverAddons for Int-AMT-Single/MBC/MCM/0/30 " + JSON.stringify(additionalCoverAddons));
      console.log("$$$$$ premiumMatrix for Int-AMT-Single/MBC/MCM/0/30 " + JSON.stringify(premiumMatrix));
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 0 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 0 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 100 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[3].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[3].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[3].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[3].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[3].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[3].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 100 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[4].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[4].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[4].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[4].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[4].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[4].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 100 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[5].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[5].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[5].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[5].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[5].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[5].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[5].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 250 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[6].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[6].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[6].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[6].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[6].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[6].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[6].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 250 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[7].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[7].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[7].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[7].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[7].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[7].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[7].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 250 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[2].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[8].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[8].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[8].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[8].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[8].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[8].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[8].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }

  } else if (row.planName == "Int-AMT-Family") {
    console.log("*****Refine quote pauload for " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 0 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 0 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 0 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 100 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[3].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[3].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[3].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[3].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[3].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 100 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[4].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[4].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[4].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[4].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[4].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[4].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 100 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[5].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[5].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[5].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[5].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[5].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[5].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 250 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[6].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[6].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[6].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[6].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[6].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[6].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 250 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[7].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[7].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[7].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[7].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[7].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[7].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 250 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[2].availableCoverAddons[4].code;
      let applyAtLevel = responseBody.quoteSummary.products[2].availableCoverAddons[4].applyAtLevel;
      let name = responseBody.quoteSummary.products[2].availableCoverAddons[4].name;
      let helpText = responseBody.quoteSummary.products[2].availableCoverAddons[4].helpText;
      let options = [responseBody.quoteSummary.products[2].availableCoverAddons[4].options[0]];
      let addOnDuration = [responseBody.quoteSummary.products[2].availableCoverAddons[4].addOnDuration];
      let excess = responseBody.quoteSummary.products[2].premiumMatrix[8].excess;
      let maxDurationDays = responseBody.quoteSummary.products[2].premiumMatrix[8].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[8].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[2].premiumMatrix[8].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[2].premiumMatrix[8].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[2].premiumMatrix[8].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }
  }
  payload.products[0].additionalCoverAddons = additionalCoverAddons;
  payload.products[0].premiumMatrix = premiumMatrix;
  //console.log("Check LUGG Add on form Data sheet " + row.LUGG);
  var travalersArray = responseBody.quoteSummary.travellers;
  //console.log("helper payload " + JSON.stringify(travalersArray));
  let travellers = [];
  for (let i = 0; i < Object.keys(travalersArray).length; i++) {
    let age = JSON.stringify(travalersArray[i].age);
    let dateOfBirth = travalersArray[i].dateOfBirth;
    let isPrimary = JSON.stringify(travalersArray[i].isPrimary);
    let treatAsAdult = JSON.stringify(travalersArray[i].treatAsAdult);
    let gender = faker.person.sexType().substring(0, 1);
    let title = JSON.stringify(travalersArray[i].gender) === 'm' ? 'Mr' : 'Ms';
    let firstName = 'Test_' + faker.person.firstName(gender);
    let lastName = 'Test_' + faker.person.lastName();
    let memberID = "";
    let externalCustomerId = "";
    travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, lastName, gender, memberID, externalCustomerId })
  }
  //console.log("helper payload " + JSON.stringify(travellers));
  payload.travellers = travellers;

  // if (policyAddOns && policyAddOns.length > 0) {

  //   payload.additionalCovers = policyAddOns;
  // }

  // If EMC options are provided, update travellers' details
  if (emcOptions) {
    payload.travellers = payload.travellers.map(traveller => {
      if (traveller.identifier === emcOptions.identifier) {
        return {
          ...traveller,
          emcAccepted: emcOptions.emcAccepted,
          assessmentID: emcOptions.assessmentID
        };
      }
      return traveller;
    });
  }

  if (row.discount !== undefined) {
    payload["promoCodes"] = [row.promoCode ? row.promoCode : ""]
  }
  return payload;
}

// Function to create the payload for Refine Quote 
function createPayloadForIssuePolicy(row, payLoadRefineQuote, addrPayLoad, phonePayLoad, emailAddress, policyAddOns = [], emcOptions = null, responseBody) {
  const departureDate = calculateDepartureDate(row.leadTime);

  const returnDate = calculateReturnDate(departureDate, row.duration);

  if (!Array.isArray(payLoadRefineQuote)) {
    console.warn('Warning: payLoadRefineQuote is not an array. Wrapping it in an array.');
    payLoadRefineQuote = [payLoadRefineQuote];
  }

  // Default payload structure
  let payload = {
    issuer: {
      code: "MBN0002",
      userName: "qat",
      externalStoreCode: ""
    },
    contact: {
      address: addrPayLoad,
      phone: [
        {
          type: phonePayLoad.type,
          number: phonePayLoad.number
        }
      ],
      email: emailAddress,
      optInMarketing: false,
    },
    payment: {
      date: dynamicDate.timeStamp,
      amount: responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium,
      referenceNumber: faker.string.uuid(),
      paymentType: "CreditCard",
      cardType: null,
      nameOfCardholder: null,
      TransactionId: null
    },
    //travellers: payLoadRefineQuote,
    products: [
      {
        // additionalCoverAddons: [
        //   {
        //     CODE: responseBody.quoteSummary.products[0].additionalCoverAddons[0].code,
        //     OPTIONS: [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]],
        //     ADDONDURATION: responseBody.quoteSummary.products[0].additionalCoverAddons[0].addOnDuration
        //   }
        // ],
        //premiumMatrix: [responseBody.quoteSummary.products[0].premiumMatrix[0]],
        productCode: responseBody.quoteSummary.products[0].productCode,
        planCode: responseBody.quoteSummary.products[0].planCode
      }
    ],
    quoteId: responseBody.quoteId,
    sessionId: responseBody.sessionId,
    declarationsAccepted: true,
    commissionConsultant: "qat"
  };

  //Create Paload based on planName (Domestic or International)
  let additionalCoverAddons = [];
  let premiumMatrix = [];
  if (row.planName == "Dom-ST") {
    console.log("#####Issue Policy pauload for " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "D") {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].addOnDuration[0]];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION })
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "DM") {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].addOnDuration[0]];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }
    console.log("additionalCoverAddons for Dom-ST " + JSON.stringify(additionalCoverAddons));
  } else if (row.planName == "Dom-AMT-Family") {
    console.log("#####Issue Policy pauload for  " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "DMF" && row.duration == 15) {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].addOnDuration[0]];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "DMF" && row.duration == 30) {
      let CODE = responseBody.quoteSummary.products[0].additionalCoverAddons[0].code;
      let OPTIONS = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].options[0]];
      let ADDONDURATION = [responseBody.quoteSummary.products[0].additionalCoverAddons[0].addOnDuration[0]];
      additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }
  } else if (row.planName == "Int-ST") {
    console.log("#####Issue Policy pauload for  " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "MCA" && row.excess == 0) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCA" && row.excess == 100) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });

    } else if (row.productCode == "MBC" && row.planCode == "MCA" && row.excess == 250) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBM" && row.planCode == "MMA" && row.excess == 0) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBM" && row.planCode == "MMA" && row.excess == 100) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBM" && row.planCode == "MMA" && row.excess == 250) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }

  } else if (row.planName == "Int-AMT-Single") {
    console.log("#####Issue Policy pauload for  " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 0 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 0 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 0 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 100 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[3].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[3].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[3].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[3].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[3].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[3].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 100 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[4].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[4].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[4].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[4].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[4].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[4].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 100 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[5].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[5].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[5].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[5].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[5].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[5].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 250 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[6].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[6].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[6].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[6].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[6].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[6].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 250 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[7].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[7].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[7].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[7].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[7].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[7].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCM" && row.excess == 250 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[8].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[8].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[8].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[8].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[8].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[8].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }

  } else if (row.planName == "Int-AMT-Family") {
    console.log("#####Issue Policy pauload for  " + row.planName);
    if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 0 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[0].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[0].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[0].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[0].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[0].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 0 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[1].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[1].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[1].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[1].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[1].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 0 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[2].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[2].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[2].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[2].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[2].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 100 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[3].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[3].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[3].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[3].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[3].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[3].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 100 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[4].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[4].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[4].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[4].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[4].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[4].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 100 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[5].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[5].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[5].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[5].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[5].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[5].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 250 && row.duration == 30) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[6].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[6].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[6].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[6].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[6].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[6].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 250 && row.duration == 45) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[7].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[7].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[7].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[7].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[7].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[7].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    } else if (row.productCode == "MBC" && row.planCode == "MCMF" && row.excess == 250 && row.duration == 60) {
      let code = responseBody.quoteSummary.products[0].additionalCoverAddons[1].code;
      let applyAtLevel = responseBody.quoteSummary.products[0].additionalCoverAddons[1].applyAtLevel;
      let name = responseBody.quoteSummary.products[0].additionalCoverAddons[1].name;
      let helpText = responseBody.quoteSummary.products[0].additionalCoverAddons[1].helpText;
      let options = [responseBody.quoteSummary.products[0].additionalCoverAddons[1].options[0]];
      let addOnDuration = responseBody.quoteSummary.products[0].additionalCoverAddons[1].addOnDuration;
      let excess = responseBody.quoteSummary.products[0].premiumMatrix[8].excess;
      let maxDurationDays = responseBody.quoteSummary.products[0].premiumMatrix[8].maxDurationDays;
      let totalGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[8].totalGrossPremium;
      let totalAdjustedGrossPremium = responseBody.quoteSummary.products[0].premiumMatrix[8].totalAdjustedGrossPremium;
      let premiumPerDay = responseBody.quoteSummary.products[0].premiumMatrix[8].premiumPerDay;
      let isSelected = true;
      let commission = responseBody.quoteSummary.products[0].premiumMatrix[8].commission;
      additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
    }
  }
  payload.products[0].additionalCoverAddons = additionalCoverAddons;
  payload.products[0].premiumMatrix = premiumMatrix;
  //console.log("Check LUGG Add on form Data sheet " + row.LUGG);
  var travalersArray = responseBody.quoteSummary.travellers;
  //console.log("helper payload " + JSON.stringify(travalersArray));
  let travellers = [];
  for (let i = 0; i < Object.keys(travalersArray).length; i++) {
    let age = JSON.stringify(travalersArray[i].age);
    let dateOfBirth = travalersArray[i].dateOfBirth;
    let isPrimary = JSON.stringify(travalersArray[i].isPrimary);
    let treatAsAdult = JSON.stringify(travalersArray[i].treatAsAdult);
    let gender = faker.person.sexType().substring(0, 1);
    let title = JSON.stringify(travalersArray[i].gender) === 'm' ? 'Mr' : 'Ms';
    let firstName = 'Test_' + faker.person.firstName(gender);
    let lastName = 'Test_' + faker.person.lastName();
    let memberID = "";
    let externalCustomerId = "";
    travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, lastName, gender, memberID, externalCustomerId })
  }
  //console.log("helper payload " + JSON.stringify(travellers));
  payload.travellers = travellers;


  // If add-ons are present, add them to the payload
  if (policyAddOns && policyAddOns.length > 0) {

    payload.additionalCovers = policyAddOns;
  }

  // If EMC options are provided, update travellers' details
  if (emcOptions) {
    payload.travellers = payload.travellers.map(traveller => {
      if (traveller.identifier === emcOptions.identifier) {
        return {
          ...traveller,
          emcAccepted: emcOptions.emcAccepted,
          assessmentID: emcOptions.assessmentID
        };
      }
      return traveller;
    });
  }

  if (row.discount !== undefined) {
    payload["promoCodes"] = [row.promoCode ? row.promoCode : ""]
  }
  return payload;
}


function validateResponseStatus(response, validStatusCodes) {
  const statusCode = response.status();

  // Assert that the response status is in the valid range
  expect(response.ok(), `Expected response is OK HTTP status: ${statusCode}`).toBeTruthy();

}


/**
 * Function to validate product details in the response.
 *//*
function validateProductDetails(responseBody, row) {
const product = responseBody.product[row.productID];
if (!product) {
throw new Error(`Product with ID ${row.productID} not found in response.`);
}
if (!product.id.toString().includes(row.productID.toString())) {
throw new Error(`Product ID does not match: expected ${row.productID}, got ${product.id}`);
}
if (product.code !== row.productCode) {
throw new Error(`Product code does not match: expected ${row.productCode}, got ${product.code}`);
}
if (product.planCode !== row.planCode) {
throw new Error(`Plan code does not match: expected ${row.planCode}, got ${product.planCode}`);
}
if (product.pdsUrl !== row.pdsUrl) {
throw new Error(`PDS URL does not match: expected ${row.pdsUrl}, got ${product.pdsUrl}`);
}
}*/

// function validateProductDetails(responseBody, row) {
//   const product = responseBody.product[row.productID];

//   // Use expect for the product existence check
//   expect(product,`Product details are returned`).toBeDefined();  // No need for a custom message here unless it fails

//   // Use expect for the product ID match
//   expect(product.id.toString(), `ProductID returned is ${product.id}`).toContain(row.productID.toString());

//   // Use expect for the product code match
//   expect(product.code,`ProductCode returned is ${product.code}`).toBe(row.productCode);

//   // Use expect for the plan code match
//   expect(product.planCode,`Plan code returned is ${product.planCode}`).toBe(row.planCode);

//   // Use expect for the PDS URL match and handle undefined or empty values
//   const actualPdsUrl = product.pdsUrl || 'undefined/empty';
//   expect(actualPdsUrl,`Url for pds returned is ${product.pdsUrl}`).toBe(row.pdsUrl);
// }


module.exports = {
  generateTravelDataNTimes,
  generateRefineQouteTravelDataNTimes,
  generateIssuePolicyTravelDataNTimes,
  flattenObject,
  createQuotePayload,
  extractAddOnsFromPayload,
  extractAddOnsFromAPIResponse,
  validateTheAddOnsPrice,
  createPayload,
  createPayloadForRefineQuote,
  createPayloadForIssuePolicy,
  validateResponseStatus,
  //validateProductDetails,
  parseAPIResponse,
  calculateDepartureDate,
  calculateReturnDate
};