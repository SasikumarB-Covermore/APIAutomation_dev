// src/utils/helper.js
const { faker } = require('@faker-js/faker');
const dynamicDate = require("../utils/apiClient");
const { generateCommonData, generateCommonRefineQouteData, generateCommonIssuePolicyData } = require("../utils/dataGenerator");
const { expect } = require('@playwright/test');  // Import expect
const { emcAddOns } = require("../utils/addonsGenerator");
const {
  getTravelPayloadForQuote,
  getTravelPayloadForRefineQuote,
  getTravelPayloadForIssuePolicy,
  getTravelPayloadForUpdateTraveller,
} = require("../utils/payloadStructures");
const { json } = require('stream/consumers');


function numberWithCommas(x) {
  x = x.toString();
  var pattern = /(-?\d+)(\d{3})/;
  while (pattern.test(x))
    x = x.replace(pattern, "$1,$2");
  return x;
}

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
  console.log("response body fron refine quote " + JSON.stringify(responseBody));
  const productCode = row.productCode;
  const excess = row.excess;
  // Ensure the productCode and excess exist in the responseBody
  if (!responseBody.products[productCode]) {
    throw new Error(`Product code ${productCode} not found in the response`);
  }

  if (!responseBody.products[productCode].excess[excess]) {
    throw new Error(`Excess ${excess} not found for Product code ${productCode}`);
  }

  const durationKey = Object.keys(responseBody.products[productCode].excess[excess].duration)[0];
  const policyAddOnsList = responseBody.products[productCode].excess[excess].duration[durationKey].additionalCoverPrices;

  // Extract traveller-level covers from response dynamically
  let responseTravelCodes = responseBody.products[productCode].excess[excess].duration[durationKey].travellers.flatMap(traveller =>
    traveller.additionalCoverPrices
  );
  const jsonKey = (item) => JSON.stringify(item);
  const travelAddOnsList = removeDuplicatesByKey(responseTravelCodes, jsonKey);

  return { travelAddOnsList, policyAddOnsList }
}

function parseAPIResponse(row, responseBody) {
  const productCode = row.productCode;
  const excess = row.excess;
  console.log(" checking responce body " + JSON.stringify(responseBody));
  // Ensure the productCode and excess exist in the responseBody
  if (!responseBody.quoteSummary.products[0].productCode) {
    throw new Error(`Product Code ${productCode} not found in the response`);
  }

  if (!responseBody.quoteSummary.products[0].productCode) {
    throw new Error(`Excess ${excess} not found for Productcode ${productCode}`);
  }

  //const durationKey = Object.keys(responseBody.products[productCode].excess[excess].duration)[0];
  // Extract traveller-level covers from response dynamically
  // let travalerLevelPath = responseBody.quoteSummary.travellers;
  // let polisyLevelPath = responseBody.quoteSummary.products[0].additionalCoverAddons;
  // let premiumMatrixPath = responseBody.quoteSummary.products[0].premiumMatrix;
  // let reponseProduct = [];
  // reponseProduct.push(travalerLevelPath,polisyLevelPath,premiumMatrixPath)
  let reponseProduct = responseBody.quoteSummary;
  return reponseProduct;
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
    productCode: row.productCode,
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
      userName: "webuser",
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
      userName: "webuser",
      externalStoreCode: ""
    },
    products: [
      {
        productCode: row.productCode,
        planCode: row.planCode,
        tripTypeCode: row.tripType
      }
    ],
    quoteId: responseBody.quoteId,
    sessionId: responseBody.sessionId,
    isResident: true
  };

  //Create Paload based on planName (Domestic or International)
  let additionalCoverAddons = [];
  let premiumMatrix = [];
  let productArray = responseBody.quoteSummary.products;
  for (let i = 0; i < Object.keys(productArray).length; i++) {
    //console.log(row.planName.includes("Dom"));
    if (row.planName.includes("Dom")) {
      //console.log("1!!!! Plan name from Respose body " + responseBody.quoteSummary.products[i].name + " and plam name from data sheet " + row.planName);
      //console.log(")) " + row.planName + " == " + responseBody.quoteSummary.products[i].name + " && " + row.productCode + " == " + responseBody.quoteSummary.products[i].productCode + " && " + row.planCode + " == " + responseBody.quoteSummary.products[i].planCode);
      if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        //console.log("2!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].additionalCoverAddons[0].code);
        //console.log("1111 " + row.CANX + " == 10000");
        if (row.CANX == "10000") {
          //console.log("2222 " + row.CANX + " == 10000");
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = null;
          let options = [
            {
              value: 5271,
              description: "$10,000",
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        } else if (row.CANX == "Unlimited") {
          //console.log(row.CANX + " == Unlimited");
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              "value": "30818",
              "description": "$Unlimited"
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];

          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        if (row.MTCL == "Yes") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("%%% " + row.MTCL + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].value);
          let code = "MTCL";
          let applyAtLevel = "Policy";
          let name = "Motorcycle / Moped Riding";
          let helpText = null;
          let options = [
            {
              value: 0,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        if (row.WNTS == "WNTS") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("^^^^ " + row.WNTS + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          let code = "WNTS";
          let applyAtLevel = "Policy";
          let name = "Snow Skiing And Snowboarding";
          let helpText = null;
          let options = [
            {
              value: 1,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }

        let excessArray = responseBody.quoteSummary.products[i].premiumMatrix;
        //console.log("Refine quote excee count " + Object.keys(excessArray).length);
        for (let n = 0; n < Object.keys(excessArray).length; n++) {
          //console.log("### " + row.excess + " == " + responseBody.quoteSummary.products[i].premiumMatrix[n].excess + " && " + row.planName + " !=  'Dom-ST  && " + row.duration + " == " + responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays);
          if (row.planName == "Dom-ST" && row.excess == responseBody.quoteSummary.products[i].premiumMatrix[n].excess) {
            let excess = responseBody.quoteSummary.products[i].premiumMatrix[n].excess;
            let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays;
            let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalGrossPremium;
            let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalAdjustedGrossPremium;
            let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[n].premiumPerDay;
            let isSelected = true;
            let commission = responseBody.quoteSummary.products[i].premiumMatrix[n].commission;
            premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
          } else if (row.planName != "Dom-ST" && row.excess == responseBody.quoteSummary.products[i].premiumMatrix[n].excess && row.duration == responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays) {
            let excess = responseBody.quoteSummary.products[i].premiumMatrix[n].excess;
            let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays;
            let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalGrossPremium;
            let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalAdjustedGrossPremium;
            let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[n].premiumPerDay;
            let isSelected = true;
            let commission = responseBody.quoteSummary.products[i].premiumMatrix[n].commission;
            premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
          }
        }
      }
    } else if (row.planName.includes("Int")) {
      //console.log("Int !!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].additionalCoverAddons[0].code);
      //console.log("@@ " + row.planName + " == " + responseBody.quoteSummary.products[i].name + " && " + row.productCode + " == " + responseBody.quoteSummary.products[i].productCode + " && " + row.planCode == responseBody.quoteSummary.products[i].planCode);
      if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        //console.log("Int 1111 " + row.CRS + " == Yes");
        if (row.CANX == "10000") {
          //console.log("2222 " + row.CANX + " == 10000");
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              value: 5271,
              description: "$10,000",
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];

          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        } else if (row.CANX == "Unlimited") {
          //console.log(row.CANX + " == Unlimited");
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              "value": "5870",
              "description": "$Unlimited"
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];

          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        if (row.CRS == "Yes") {
          //console.log("Int 2222 " + row.CRS + " == Yes");
          let code = "CRS";
          let applyAtLevel = "Policy";
          let name = "Cruise Cover";
          let helpText = null;
          let options = [
            {
              "value": "0",
              "description": "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        if (row.MTCL == "Yes") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("%%% " + row.MTCL + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].value);
          let code = "MTCL";
          let applyAtLevel = "Policy";
          let name = "Motorcycle / Moped Riding";
          let helpText = null;
          let options = [
            {
              value: 0,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        if (row.WNTS == "WNTS") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("^^^^ " + row.WNTS + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          let code = "WNTS";
          let applyAtLevel = "Policy";
          let name = "Snow Skiing And Snowboarding";
          let helpText = null;
          let options = [
            {
              value: 1,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }

        let excessArray = responseBody.quoteSummary.products[i].premiumMatrix;
        //console.log("Refine quote excee count " + Object.keys(excessArray).length);
        for (let n = 0; n < Object.keys(excessArray).length; n++) {
          //console.log("### " + row.excess + " == " + responseBody.quoteSummary.products[i].premiumMatrix[n].excess);
          if (row.planName == "Int-ST" && row.excess == responseBody.quoteSummary.products[i].premiumMatrix[n].excess) {
            let excess = responseBody.quoteSummary.products[i].premiumMatrix[n].excess;
            let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays;
            let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalGrossPremium;
            let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalAdjustedGrossPremium;
            let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[n].premiumPerDay;
            let isSelected = true;
            let commission = responseBody.quoteSummary.products[i].premiumMatrix[n].commission;
            premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
          } else if (row.planName != "Int-ST" && row.excess == responseBody.quoteSummary.products[i].premiumMatrix[n].excess && row.duration == responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays) {
            let excess = responseBody.quoteSummary.products[i].premiumMatrix[n].excess;
            let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[n].maxDurationDays;
            let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalGrossPremium;
            let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[n].totalAdjustedGrossPremium;
            let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[n].premiumPerDay;
            let isSelected = true;
            let commission = responseBody.quoteSummary.products[i].premiumMatrix[n].commission;
            premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
          }
        }

      }
    }
  }

  payload.products[0].additionalCoverAddons = additionalCoverAddons;
  payload.products[0].premiumMatrix = premiumMatrix;
  var travalersArray = responseBody.quoteSummary.travellers;
  let travellers = [];
  let additionalCoverAddonsForTraveller = [];
  let EMC = "";
  for (let i = 0; i < Object.keys(productArray).length; i++) {
    //console.log("!!! Data sheet plan name " + row.planName);
    if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
      //console.log("@@@ Data sheet product code " + row.productCode + "@@@ response body product code " + responseBody.quoteSummary.products[i].productCode);
      //console.log("@@@ Data sheet plan code " + row.planCode + "@@@ response body plan code " + responseBody.quoteSummary.products[i].planCode);
      if (row.LUGG != 0) {
        if (row.LUGG == 500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = null;
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 1500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = null;
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 2500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = null;
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 3500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = null;
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 4500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = null;
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        }
      }
      if (row.EMC != 0) {
        if (row.EMC == "EMCT3") {
          console.log("Checking EMCT3 " + row.EMC + " == EMCT3");
          let disease = ["Epilepsy"];
          let totalScore = 3.8;
          let score = [3.8];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;

        } else if (row.EMC == "EMCT5") {
          let disease = ["Knee Dislocation"];
          let totalScore = 1.40;
          let score = [1.40];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;
        } else if (row.EMC == "EMCT6") {
          let disease = ["Asthma"];
          let totalScore = 1.43;
          let score = [1.43];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;
        } else if (row.EMC == "EMCT7") {
          let disease = ["Abnormal heart rhythm"];
          let totalScore = 4.2;
          let score = [4.2];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;
        } else if (row.EMC == "EMCT8") {
          let disease = ["Pulmonary fibrosis"];
          let totalScore = 5.01;
          let score = [5.01];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;
        } else if (row.EMC == "EMCT9") {
          let disease = ["Epilepsy", "Cellulitis"];
          let totalScore = 6.49;
          let score = [3.8, 2.5];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;
        } else if (row.EMC == "EMCT10") {
          //console.log("Checking EMCT10 " + row.EMC + " == EMCT10");
          let disease = ["Epilepsy", "Cellulitis", "Deep vein thrombosis"];
          let totalScore = 7.97;
          let score = [3.8, 2.5, 1.67];
          const emc = emcAddOns(disease, totalScore, score)
          EMC = emc;
        }
      }


    }

  }

  for (let i = 0; i < Object.keys(travalersArray).length; i++) {
    let age = JSON.stringify(travalersArray[i].age);
    let dateOfBirth = travalersArray[i].dateOfBirth;
    let isPrimary = JSON.stringify(travalersArray[i].isPrimary);
    let treatAsAdult = JSON.stringify(travalersArray[i].treatAsAdult);
    let gender = faker.person.sexType().substring(0, 1);
    let title = JSON.stringify(travalersArray[i].gender) === 'm' ? 'Mr' : 'Ms';
    let firstName = 'Test_' + faker.person.firstName(gender);
    let surName = 'Test_' + faker.person.lastName();
    let memberID = "";
    let externalCustomerId = "";
    //console.log("1111### " + EMC + " != '' && " + isPrimary + " == " + "true");
    //console.log("2222### " + additionalCoverAddonsForTraveller.length);

    //console.log("333#### " + isPrimary + " == " + "true" + (typeof additionalCoverAddonsForTraveller !== 'undefined' && additionalCoverAddonsForTraveller.length > 0) + " || " + (EMC != '' && isPrimary == "true"));
    additionalCoverAddons = additionalCoverAddonsForTraveller;
    if ((typeof additionalCoverAddonsForTraveller !== 'undefined' && additionalCoverAddonsForTraveller.length > 0) || (EMC != '' && isPrimary == "true")) {
      if (EMC != '' && isPrimary == "true") {
        travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surName, gender, memberID, externalCustomerId, additionalCoverAddons, EMC });
      } else {
        travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surName, gender, memberID, externalCustomerId, additionalCoverAddons });
      }
      //travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surName, gender, memberID, externalCustomerId, additionalCoverAddons, EMC: (isPrimary == false ? null : EMC) });
    } else {
      travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surName, gender, memberID, externalCustomerId });
    }
  }

  //travellers.push(additionalCoverAddons);
  payload.travellers = travellers;

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
      userName: "webuser",
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
    products: [
      {
        productCode: row.productCode,
        planCode: row.planCode,
        tripTypeCode: row.tripType
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

  let productArray = responseBody.quoteSummary.products;
  for (let i = 0; i < Object.keys(productArray).length; i++) {
    if (row.planName.includes("Dom")) {
      if (row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        //console.log(row.CANX + " == 10000");
        if (row.CANX == "10000") {
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              value: 5271,
              description: "$10,000",
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];

          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        } else if (row.CANX == "Unlimited") {
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              "value": "30818",
              "description": "$Unlimited"
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];

          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        //console.log(row.MTCL + " == $10000");
        if (row.MTCL == "Yes") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("%%% " + row.MTCL + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].value);
          let code = "MTCL";
          let applyAtLevel = "Policy";
          let name = "Motorcycle / Moped Riding";
          let helpText = null;
          let options = [
            {
              value: 0,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        //console.log(row.WNTS + " == WNTS");
        if (row.WNTS == "WNTS") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("^^^^ " + row.WNTS + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          let code = "WNTS";
          let applyAtLevel = "Policy";
          let name = "Snow Skiing And Snowboarding";
          let helpText = null;
          let options = [
            {
              value: 1,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        let excess = responseBody.quoteSummary.products[i].premiumMatrix[0].excess;
        let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[0n].maxDurationDays;
        let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalGrossPremium;
        let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalAdjustedGrossPremium;
        let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[0].premiumPerDay;
        let isSelected = true;
        let commission = responseBody.quoteSummary.products[i].premiumMatrix[0].commission;
        premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });


      }
    } else if (row.planName.includes("Int")) {
      if (row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        //console.log(row.CRS + " == Yes");
        if (row.CANX == "10000") {
          //console.log("2222 " + row.CANX + " == 10000");
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              value: 5271,
              description: "$10,000",
            }
          ];
          let addOnDuration = [
            {
              "startDate": row.departureDate,
              "endDate": row.returnDate
            },
          ];

          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        } else if (row.CANX == "Unlimited") {
          //console.log(row.CANX + " == Unlimited");
          let code = "CANX";
          let applyAtLevel = "Policy";
          let name = "Cancellation Variation";
          let helpText = "";
          let options = [
            {
              "value": "5870",
              "description": "$Unlimited"
            }
          ];
          let addOnDuration = [{
            startDate: row.departureDate,
            endDate: row.returnDate
          }];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        if (row.CRS == "Yes") {
          let code = "CRS";
          let applyAtLevel = "Policy";
          let name = "Cruise Cover";
          let helpText = null;
          let options = [
            {
              "value": "0",
              "description": "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        //console.log(row.MTCL + " == Yes");
        if (row.MTCL == "Yes") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("%%% " + row.MTCL + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].value);
          let code = "MTCL";
          let applyAtLevel = "Policy";
          let name = "Motorcycle / Moped Riding";
          let helpText = null;
          let options = [
            {
              value: 0,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }
        //console.log(row.WNTS + " == WNTS");
        if (row.WNTS == "WNTS") {
          //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log("^^^^ " + row.WNTS + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          let code = "WNTS";
          let applyAtLevel = "Policy";
          let name = "Snow Skiing And Snowboarding";
          let helpText = null;
          let options = [
            {
              value: 1,
              description: "Yes"
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        }

        let excess = responseBody.quoteSummary.products[i].premiumMatrix[0].excess;
        let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[0n].maxDurationDays;
        let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalGrossPremium;
        let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalAdjustedGrossPremium;
        let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[0].premiumPerDay;
        let isSelected = true;
        let commission = responseBody.quoteSummary.products[i].premiumMatrix[0].commission;
        premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });

      }
    }
  }
  payload.products[0].additionalCoverAddons = additionalCoverAddons;
  payload.products[0].premiumMatrix = premiumMatrix;
  //console.log("Check LUGG Add on form Data sheet " + row.LUGG);
  var travalersArray = responseBody.quoteSummary.travellers;
  //console.log("helper payload " + JSON.stringify(travalersArray));

  let additionalCoverAddonsForTraveller = [];
  for (let i = 0; i < Object.keys(productArray).length; i++) {
    if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
      if (row.LUGG != 0) {
        if (row.LUGG == 500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = "";
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 1500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = "";
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 2500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = "";
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 3500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = "";
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        } else if (row.LUGG == 4500) {
          // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
          //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
          let code = "LUGG";
          let applyAtLevel = "Traveller";
          let name = "Increase Luggage Item Limits";
          let helpText = "";
          let options = [
            {
              value: row.LUGG,
              description: "$" + numberWithCommas(row.LUGG)
            }
          ];
          let addOnDuration = [
            {
              startDate: row.departureDate,
              endDate: row.returnDate
            }
          ];
          additionalCoverAddonsForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

        }
      }
    }
  }
  let travellers = [];
  let EMC;
  console.log("EMC pressent in data sheet ? " + row.EMC + " Emc number " + responseBody.quoteSummary.travellers[0].emc.emcNumber);
  if (row.EMC != 0) {
    EMC = {
      "emcNumber": responseBody.quoteSummary.travellers[0].emc.emcNumber,
      "isAccepted": true
    }
  }

  for (let i = 0; i < Object.keys(travalersArray).length; i++) {
    let age = JSON.stringify(travalersArray[i].age);
    let dateOfBirth = travalersArray[i].dateOfBirth;
    let isPrimary = JSON.stringify(travalersArray[i].isPrimary);
    let treatAsAdult = JSON.stringify(travalersArray[i].treatAsAdult);
    let gender = faker.person.sexType().substring(0, 1);
    let title = JSON.stringify(travalersArray[i].gender) === 'm' ? 'Mr' : 'Ms';
    let firstName = travalersArray[i].firstName;
    let surname = travalersArray[i].surname;
    let memberID = "";
    let externalCustomerId = "";
    additionalCoverAddons = additionalCoverAddonsForTraveller;
    if (typeof additionalCoverAddonsForTraveller !== 'undefined' && additionalCoverAddonsForTraveller.length > 0 || EMC != '' && isPrimary == "true") {
      if (EMC != '' && isPrimary == "true") {
        travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surname, gender, memberID, externalCustomerId, additionalCoverAddons, EMC });
      } else {
        travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surname, gender, memberID, externalCustomerId, additionalCoverAddons });
      }
      //travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surname, gender, memberID, externalCustomerId, additionalCoverAddons });
    } else {
      travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, surname, gender, memberID, externalCustomerId });
    }
  }
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