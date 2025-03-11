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
      code: "MBN0001",
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
      code: "MBN0001",
      userName: "qat",
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
    console.log(row.planName.includes("Dom"));
    if (row.planName.includes("Dom")) {
      console.log("1!!!! Plan name from Respose body " + responseBody.quoteSummary.products[i].name + " and plam name from data sheet " + row.planName);
      console.log(")) " + row.planName + " == " + responseBody.quoteSummary.products[i].name + " && " + row.productCode + " == " + responseBody.quoteSummary.products[i].productCode + " && " + row.planCode + " == " + responseBody.quoteSummary.products[i].planCode);
      if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        console.log("2!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].additionalCoverAddons[0].code);

        // let avilableCoverAddonsAddonArray = responseBody.quoteSummary.products[i].availableCoverAddons;
        // for (let l = 0; l < Object.keys(avilableCoverAddonsAddonArray).length; l++) {
        //   console.log("TTTT " + row.CANX + " == " + JSON.stringify(responseBody.quoteSummary.products[i].availableCoverAddons[l].code));
        //   let canxOptionArray = responseBody.quoteSummary.products[i].availableCoverAddons[l].options;
        //   for (let o = 0; o < Object.keys(canxOptionArray).length; o++) {
        //     console.log("ccc " + row.CANX + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[o].description);
        //     if (row.CANX == responseBody.quoteSummary.products[i].availableCoverAddons[l].options[o].description && responseBody.quoteSummary.products[i].availableCoverAddons[l].code != "EMCT") {
        //       console.log(" cancel add on");
        //       let CODE = responseBody.quoteSummary.products[i].additionalCoverAddons[l].code;
        //       let OPTIONS = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[o]];
        //       let ADDONDURATION = [responseBody.quoteSummary.products[i].availableCoverAddons[l].addOnDuration];
        //       additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });
        //     }
        //   }
        //   let mtclOptionArray = responseBody.quoteSummary.products[i].availableCoverAddons[l].options;
        //   for (let n = 0; n < Object.keys(mtclOptionArray).length; n++) {
        //     //console.log(" #### MTCL Add on " + row.MTCL + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].description);
        //     if (row.MTCL == responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].description && responseBody.quoteSummary.products[i].availableCoverAddons[l].code != "EMCT") {
        //       //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
        //       //console.log("%%% " + row.MTCL + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n].value);
        //       let code = responseBody.quoteSummary.products[i].availableCoverAddons[l].code;
        //       let applyAtLevel = responseBody.quoteSummary.products[i].availableCoverAddons[l].applyAtLevel;
        //       let name = responseBody.quoteSummary.products[i].availableCoverAddons[l].name;
        //       let helpText = responseBody.quoteSummary.products[i].availableCoverAddons[l].helpText;
        //       let options = [responseBody.quoteSummary.products[i].availableCoverAddons[l].options[n]];
        //       let addOnDuration = [responseBody.quoteSummary.products[i].availableCoverAddons[l].addOnDuration];
        //       additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        //     }
        //   }
        //   //console.log(" #### WNTS Add on " + row.WNTS + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
        //   if (row.WNTS == responseBody.quoteSummary.products[i].availableCoverAddons[l].code && responseBody.quoteSummary.products[i].availableCoverAddons[l].code != "EMCT") {
        //     //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
        //     //console.log("^^^^ " + row.WNTS + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
        //     let code = responseBody.quoteSummary.products[i].availableCoverAddons[l].code;
        //     let applyAtLevel = responseBody.quoteSummary.products[i].availableCoverAddons[l].applyAtLevel;
        //     let name = responseBody.quoteSummary.products[i].availableCoverAddons[l].name;
        //     let helpText = responseBody.quoteSummary.products[i].availableCoverAddons[l].helpText;
        //     let options = [
        //       {
        //         value: 1,
        //         description: "Yes"
        //       }
        //     ];
        //     let addOnDuration = [responseBody.quoteSummary.products[i].availableCoverAddons[l].addOnDuration];
        //     additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        //   }

        // }
        console.log("1111 " + row.CANX + " == 10000");
        if (row.CANX == "10000") {
          console.log("2222 " + row.CANX + " == 10000");
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
          console.log(row.CANX + " == Unlimited");
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

        let excess = responseBody.quoteSummary.products[i].premiumMatrix[0].excess;
        let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[0].maxDurationDays;
        let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalGrossPremium;
        let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalAdjustedGrossPremium;
        let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[0].premiumPerDay;
        let isSelected = true;
        let commission = responseBody.quoteSummary.products[i].premiumMatrix[0].commission;
        premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
      }
    } else if (row.planName.includes("Int")) {
      console.log("Int !!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].additionalCoverAddons[0].code);

      // if (row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
      //   let availableCoverAddonsArray = responseBody.quoteSummary.products[i].availableCoverAddons;
      //   for (let k = 0; k < Object.keys(availableCoverAddonsArray).length; k++) {
      //     if (responseBody.quoteSummary.products[i].availableCoverAddons[k].code == "CRS") {
      //       let code = responseBody.quoteSummary.products[i].availableCoverAddons[k].code;
      //       let applyAtLevel = responseBody.quoteSummary.products[i].availableCoverAddons[k].applyAtLevel;
      //       let name = responseBody.quoteSummary.products[i].availableCoverAddons[k].name;
      //       let helpText = responseBody.quoteSummary.products[i].availableCoverAddons[k].helpText;
      //       let options = [responseBody.quoteSummary.products[i].availableCoverAddons[k].options[0]];
      //       let addOnDuration = [responseBody.quoteSummary.products[i].availableCoverAddons[k].addOnDuration];
      //       additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      //     }
      //   }
      //   let premiumMatrixArray = responseBody.quoteSummary.products[i].premiumMatrix;
      //   //console.log(responseBody.quoteSummary.products[i].name + "Product premiumMatrix count " + premiumMatrixArray);
      //   for (let j = 0; j < Object.keys(premiumMatrixArray).length; j++) {
      //     if (row.excess == responseBody.quoteSummary.products[i].premiumMatrix[j].excess && row.duration == (responseBody.quoteSummary.products[i].premiumMatrix[j].maxDurationDays ?? 1)) {
      //       let excess = responseBody.quoteSummary.products[i].premiumMatrix[j].excess;
      //       let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[j].maxDurationDays;
      //       let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[j].totalGrossPremium;
      //       let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[j].totalAdjustedGrossPremium;
      //       let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[j].premiumPerDay;
      //       let isSelected = true;
      //       let commission = responseBody.quoteSummary.products[i].premiumMatrix[j].commission;
      //       premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
      //     }
      //   }
      // }
      console.log("@@ " + row.planName + " == " + responseBody.quoteSummary.products[i].name + " && " + row.productCode + " == " + responseBody.quoteSummary.products[i].productCode + " && " + row.planCode == responseBody.quoteSummary.products[i].planCode);
      if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        console.log("Int 1111 " + row.CRS + " == Yes");
        if (row.CANX == "10000") {
          console.log("2222 " + row.CANX + " == 10000");
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
          console.log(row.CANX + " == Unlimited");
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
          console.log("Int 2222 " + row.CRS + " == Yes");
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
        let excess = responseBody.quoteSummary.products[i].premiumMatrix[0].excess;
        let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[0].maxDurationDays;
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
  var travalersArray = responseBody.quoteSummary.travellers;
  let travellers = [];
  let additionalCoverAddonsForTraveller = [];
  //let EMCForTraveller = [];
  for (let i = 0; i < Object.keys(productArray).length; i++) {

    //console.log("!!! Data sheet plan name " + row.planName);
    if (row.planName == responseBody.quoteSummary.products[i].name && row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
      //console.log("@@@ Data sheet product code " + row.productCode + "@@@ response body product code " + responseBody.quoteSummary.products[i].productCode);
      //console.log("@@@ Data sheet plan code " + row.planCode + "@@@ response body plan code " + responseBody.quoteSummary.products[i].planCode);
      // let availableCoverAddonsAddonArray = responseBody.quoteSummary.products[i].availableCoverAddons;
      // for (let l = 0; l < Object.keys(availableCoverAddonsAddonArray).length; l++) {
      //   let luggOptionArray = responseBody.quoteSummary.products[i].availableCoverAddons[l].options;
      //   for (let m = 0; m < Object.keys(luggOptionArray).length; m++) {
      //     //console.log("$$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
      //     if (row.LUGG == responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value) {
      //       //console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
      //       //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);

      //       let code = responseBody.quoteSummary.products[i].availableCoverAddons[l].code;
      //       let applyAtLevel = responseBody.quoteSummary.products[i].availableCoverAddons[l].applyAtLevel;
      //       let name = responseBody.quoteSummary.products[i].availableCoverAddons[l].name;
      //       let helpText = responseBody.quoteSummary.products[i].availableCoverAddons[l].helpText;
      //       let options = [responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m]];
      //       let addOnDuration = [responseBody.quoteSummary.products[i].availableCoverAddons[l].addOnDuration];
      //       additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //     }
      //   }
      // }
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
      // if (row.EMC != 0) {
      //   if (row.EMC == "EMCT3") {
      //     // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
      //     //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
      //     let code = "EMCT3";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //   } else if (row.EMC == "EMCT5") {
      //     // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
      //     //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
      //     let code = "EMCT5";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC Tier 5 (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //   } else if (row.EMC == "EMCT6") {
      //     // console.log("!!!! Plan name is " + responseBody.quoteSummary.products[i].name + " and addon is " + responseBody.quoteSummary.products[i].availableCoverAddons[l].code);
      //     //console.log(row.planName + " $$$ " + row.productCode + " $$$ " + row.planCode + " $$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].name + " $$$ " + responseBody.quoteSummary.products[i].productCode + " $$$ " + responseBody.quoteSummary.products[i].planCode + " $$$ " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);
      //     let code = "EMCT6";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC Tier 6 (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //   } else if (row.EMC == "EMCT7") {
      //     let code = "EMCT7";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC Tier 7 (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //   } else if (row.EMC == "EMCT8") {
      //     let code = "EMCT8";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC Tier 8 (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //   } else if (row.EMC == "EMCT9") {
      //     let code = "EMCT9";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC Tier 9 (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });

      //   } else if (row.EMC == "EMCT10") {
      //     let code = "EMCT10";
      //     let applyAtLevel = "Traveller";
      //     let name = "EMC Tier 10 (Approval Required)";
      //     let helpText = "";
      //     let options = [];
      //     let addOnDuration = [
      //       {
      //         startDate: row.departureDate,
      //         endDate: row.returnDate
      //       }
      //     ];
      //     EMCForTraveller.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
      //   }
      // }

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
    let lastName = 'Test_' + faker.person.lastName();
    let memberID = "";
    let externalCustomerId = "";
    //console.log(typeof additionalCoverAddonsForTraveller + " !== " + 'undefined' && additionalCoverAddonsForTraveller.length + " >>>> " + 0)
    additionalCoverAddons = additionalCoverAddonsForTraveller;
    if (typeof additionalCoverAddonsForTraveller !== 'undefined' && additionalCoverAddonsForTraveller.length > 0) {
      travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, lastName, gender, memberID, externalCustomerId, additionalCoverAddons });
    } else {
      travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, lastName, gender, memberID, externalCustomerId });
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
      code: "MBN0001",
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
        // let CODE = responseBody.quoteSummary.products[i].additionalCoverAddons[0].code;
        // let OPTIONS = [responseBody.quoteSummary.products[i].additionalCoverAddons[0].options[0]];
        // let ADDONDURATION = responseBody.quoteSummary.products[i].additionalCoverAddons[0].addOnDuration;
        // additionalCoverAddons.push({ CODE, OPTIONS, ADDONDURATION });

        // let productAdditionalCoverAddonsArray = responseBody.quoteSummary.products[i].additionalCoverAddons;
        // for (let l = 0; l < Object.keys(productAdditionalCoverAddonsArray).length; l++) {
        //   //console.log("222 " + row.CANX + " == " + responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[0].description);
        //   if (responseBody.quoteSummary.products[i].additionalCoverAddons[l].code != "EMCT") {
        //     if (row.CANX == responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[0].description) {
        //       let code = responseBody.quoteSummary.products[i].additionalCoverAddons[l].code;
        //       let applyAtLevel = responseBody.quoteSummary.products[i].additionalCoverAddons[l].applyAtLevel;
        //       let name = responseBody.quoteSummary.products[i].additionalCoverAddons[l].name;
        //       let helpText = responseBody.quoteSummary.products[i].additionalCoverAddons[l].helpText;
        //       let options = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[0]];
        //       let addOnDuration = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].addOnDuration];
        //       additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        //     }
        //   }

        //   if (row.MTCL == responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[0].description && responseBody.quoteSummary.products[i].additionalCoverAddons[l].code != "EMCT") {
        //     let code = responseBody.quoteSummary.products[i].additionalCoverAddons[l].code;
        //     let applyAtLevel = responseBody.quoteSummary.products[i].additionalCoverAddons[l].applyAtLevel;
        //     let name = responseBody.quoteSummary.products[i].additionalCoverAddons[l].name;
        //     let helpText = responseBody.quoteSummary.products[i].additionalCoverAddons[l].helpText;
        //     let options = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[0]];
        //     let addOnDuration = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].addOnDuration];
        //     additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        //   }
        //   if (row.WNTS == responseBody.quoteSummary.products[i].additionalCoverAddons[l].code && responseBody.quoteSummary.products[i].additionalCoverAddons[l].code != "EMCT") {
        //     let code = responseBody.quoteSummary.products[i].additionalCoverAddons[l].code;
        //     let applyAtLevel = responseBody.quoteSummary.products[i].additionalCoverAddons[l].applyAtLevel;
        //     let name = responseBody.quoteSummary.products[i].additionalCoverAddons[l].name;
        //     let helpText = responseBody.quoteSummary.products[i].additionalCoverAddons[l].helpText;
        //     let options = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].options[0]];
        //     let addOnDuration = [responseBody.quoteSummary.products[i].additionalCoverAddons[l].addOnDuration];
        //     additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        //   }

        // }
        console.log(row.CANX + " == 10000");
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
        console.log(row.MTCL + " == $10000");
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
        console.log(row.WNTS + " == WNTS");
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
        let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[0].maxDurationDays;
        let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalGrossPremium;
        let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[0].totalAdjustedGrossPremium;
        let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[0].premiumPerDay;
        let isSelected = true;
        let commission = responseBody.quoteSummary.products[i].premiumMatrix[0].commission;
        premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
      }
    } else if (row.planName.includes("Int")) {
      if (row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
        // let additionalCoverAddonsArray = responseBody.quoteSummary.products[i].additionalCoverAddons;
        // for (let k = 0; k < Object.keys(additionalCoverAddonsArray).length; k++) {
        //   if (responseBody.quoteSummary.products[i].additionalCoverAddons[k].code == "CRS") {
        //     let code = responseBody.quoteSummary.products[i].additionalCoverAddons[k].code;
        //     let applyAtLevel = responseBody.quoteSummary.products[i].additionalCoverAddons[k].applyAtLevel;
        //     let name = responseBody.quoteSummary.products[i].additionalCoverAddons[k].name;
        //     let helpText = responseBody.quoteSummary.products[i].additionalCoverAddons[k].helpText;
        //     let options = [responseBody.quoteSummary.products[i].additionalCoverAddons[k].options[0]];
        //     let addOnDuration = responseBody.quoteSummary.products[i].additionalCoverAddons[k].addOnDuration;
        //     additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        //   }
        // }
        // let premiumMatrixArray = responseBody.quoteSummary.products[i].premiumMatrix;
        // //console.log(responseBody.quoteSummary.products[i].name + "Product premiumMatrix count " + premiumMatrixArray);
        // for (let j = 0; j < Object.keys(premiumMatrixArray).length; j++) {
        //   if (row.excess == responseBody.quoteSummary.products[i].premiumMatrix[j].excess && row.duration == (responseBody.quoteSummary.products[i].premiumMatrix[j].maxDurationDays ?? 1)) {
        //     let excess = responseBody.quoteSummary.products[i].premiumMatrix[j].excess;
        //     let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[j].maxDurationDays;
        //     let totalGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[j].totalGrossPremium;
        //     let totalAdjustedGrossPremium = responseBody.quoteSummary.products[i].premiumMatrix[j].totalAdjustedGrossPremium;
        //     let premiumPerDay = responseBody.quoteSummary.products[i].premiumMatrix[j].premiumPerDay;
        //     let isSelected = true;
        //     let commission = responseBody.quoteSummary.products[i].premiumMatrix[j].commission;
        //     premiumMatrix.push({ excess, maxDurationDays, totalGrossPremium, totalAdjustedGrossPremium, premiumPerDay, isSelected, commission });
        //   }
        // }
        console.log(row.CRS + " == Yes");
        if (row.CANX == "10000") {
          console.log("2222 " + row.CANX + " == 10000");
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
          console.log(row.CANX + " == Unlimited");
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
        // if (row.CRS == "Yes") {
        //   let code = "CRS";
        //   let applyAtLevel = "Policy";
        //   let name = "Cruise Cover";
        //   let helpText = null;
        //   let options = [
        //     {
        //       "value": "0",
        //       "description": "Yes"
        //     }
        //   ];
        //   let addOnDuration = [
        //     {
        //       startDate: row.departureDate,
        //       endDate: row.returnDate
        //     }
        //   ];
        //   additionalCoverAddons.push({ code, applyAtLevel, name, helpText, options, addOnDuration });
        // }
        console.log(row.MTCL + " == Yes");
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
        console.log(row.WNTS + " == WNTS");
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
        let maxDurationDays = responseBody.quoteSummary.products[i].premiumMatrix[0].maxDurationDays;
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
          let helpText = null;
          let options = [
            {
              value: row.LUGG,
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
              description: "$" + row.LUGG
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
    additionalCoverAddons = additionalCoverAddonsForTraveller;
    if (typeof additionalCoverAddonsForTraveller !== 'undefined' && additionalCoverAddonsForTraveller.length > 0) {
      travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, lastName, gender, memberID, externalCustomerId, additionalCoverAddons });
    } else {
      travellers.push({ age, dateOfBirth, isPrimary, treatAsAdult, title, firstName, lastName, gender, memberID, externalCustomerId });
    }
  }
  // for (let i = 0; i < Object.keys(productArray).length; i++) {
  //   if (row.planName.includes("Dom")) {
  //     if (row.productCode == responseBody.quoteSummary.products[i].productCode && row.planCode == responseBody.quoteSummary.products[i].planCode) {
  //       let availableCoverAddonsAddonArray = responseBody.quoteSummary.products[i].availableCoverAddons;
  //       for (let l = 0; l < Object.keys(availableCoverAddonsAddonArray).length; l++) {
  // let luggOptionArray = responseBody.quoteSummary.travellers[0].additionalCoverAddons[0].code;
  //for (let m = 0; m < Object.keys(luggOptionArray).length; m++) {
  //console.log("$$$ " + row.LUGG + " == " + responseBody.quoteSummary.products[i].availableCoverAddons[l].options[m].value);


  //}
  //}
  //}

  //}
  //}
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