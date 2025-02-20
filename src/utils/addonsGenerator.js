import {
    getDataFilePath
  } from "../config/config";

const filePath = getDataFilePath()

const sheetName = "addOns";
const { excelToJson } = require("./excelUtils").default;
const numeral = require('numeral');

let travel_level_addOns_list = [];
let policy_level_addOns_list = [];

async function fetchAddonsList() {
    const data = await excelToJson(filePath, sheetName);
    data.forEach((r) => {
        if (r.travellerLevel) travel_level_addOns_list.push(r.travellerLevel);
        if (r.policyLevel) policy_level_addOns_list.push(r.policyLevel);
    });
}

function removeDuplicates(arr) {
    let unique = arr.reduce(function (acc, curr) {
        if (!acc.includes(curr))
            acc.push(curr);
        return acc;
    }, []);
    return unique;
}

function processAddOn(ad, value) {
    let addOn = {
        code: ad,
    };

    // // Convert the value to lowercase if it's a string
    // if (typeof value === 'string') {
    //     value = value.toLowerCase(); // Convert the string to lowercase
    //     }

    if (value === '-1') {
        // Handle the case where value is a string '-1'
        addOn.amount = -1;  // Use -1 directly as an integer
        addOn.amountLabel = "$Unlimited";
    } else if (value === 'yes') {
        // If the value is 'yes', set a set value to '0'
        addOn.amount = 0;
        addOn.amountLabel = "Yes";
    }  else if (value === 'null'){
            // If the value is 'yes', set a set value to '0'
            addOn.amount = null;
            addOn.amountLabel = "null";
        
    } else if (typeof value === 'number') {
        // Handle numeric values
        addOn.amount = Math.round(value);  // Ensure the amount is an integer
        addOn.amountLabel = numeral(value).format("$0,0");  // Format amount label without decimals
    } else if (typeof value === 'string') {
        // Handle string values
        let numericValue = parseFloat(value);  // Attempt to parse the string as a number
        if (!isNaN(numericValue)) {
            // If it's a valid number in string form, format it
            addOn.amount = Math.round(numericValue);  // Convert to an integer
            addOn.amountLabel = numeral(numericValue).format("$0,0");  // Format as a dollar amount without decimals
        } else if (value.startsWith('DA-')){
            let amtLabel = value;
            addOn.amount = amtLabel.replace('DA-$', '');  // remove DA-$ and just keep the amount
            addOn.amountLabel = value;
        } else {
            // If it's a non-numeric string, treat it as a label
            addOn.amount = 0;  // Default value for non-numeric strings
            addOn.amountLabel = value;  // Use the string directly as the label
        }
    }

    return addOn;
}

async function generateAddOns(row) {
    await fetchAddonsList();

    let policy_level_addOns = [];
    let travel_level_addOns = [];

    removeDuplicates(policy_level_addOns_list).forEach((ad) => {
        if (row[ad] !== undefined) {
            policy_level_addOns.push(processAddOn(ad, row[ad]));
        }
    });
    removeDuplicates(travel_level_addOns_list).forEach((ad) => {
        if (row[ad] !== undefined) {
            console.log
            travel_level_addOns.push(processAddOn(ad, row[ad]));
        }
    });

    const travelAddOns = travel_level_addOns;
    const policyAddOns = policy_level_addOns;

    return { travelAddOns, policyAddOns };

}
/*
async function generateTravellerPayload(numAdults, numChild, travelAddOns) {
    const travellers = generateTravellerData(numAdults, numChild);

    // Assign the same travelAddOns to each traveller
    travellers.forEach(traveller => {
        traveller.additionalCovers = travelAddOns;
    });

    return travellers;
}
*/

async function generateTravellerPayload(numAdults, numChild, travelAddOns, assessmentID = null) {
    const travellers = generateTravellerData(numAdults, numChild);

    // Assign the same travelAddOns to each traveller
    travellers.forEach(traveller => {
        traveller.additionalCovers = travelAddOns;

        // Check if the identifier is 'adult1' and add emcAccepted and assessmentID fields only if assessmentID is provided
        if (traveller.identifier === 'adult1' && assessmentID) {
            traveller.emcAccepted = true;
            traveller.assessmentID = assessmentID; // Add assessmentID if provided
        }
    });

    return travellers;
}

module.exports = { generateAddOns,generateTravellerPayload};


