import { format } from "path";
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
    } else if (value === 'null') {
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
        } else if (value.startsWith('DA-')) {
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

function generatePassword() {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}
function questionAndAnser(disease, score) {
    let questionAnser = "";
    if (disease == "Epilepsy") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "EPILEPSY",
                "SCORE": "3.8",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "IF AWAKE, DO YOU NORMALLY LOSE CONSCIOUSNESS DURING A SEIZURE?",
                        "ANSWER": [
                            "YES"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY SEIZURES CAUSING LOSS OF CONSCIOUSNESS HAVE YOU HAD IN THE LAST 4 WEEKS?",
                        "ANSWER": [
                            "0"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY SEIZURES CAUSING LOSS OF CONSCIOUSNESS HAVE YOU HAD IN THE LAST 6 MONTHS?",
                        "ANSWER": [
                            "0"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY UNPLANNED HOSPITAL ADMISSIONS HAVE YOU HAD FOR EPILEPSY/SEIZURES IN THE LAST 12 MONTHS?",
                        "ANSWER": [
                            "1"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY DIFFERENT MEDICINES DO YOU TAKE FOR YOUR EPILEPSY/SEIZURES?",
                        "ANSWER": [
                            "3 OR MORE"
                        ]
                    },
                    {
                        "QUESTION": "HOW LONG AGO WAS YOUR FIRST SEIZURE?",
                        "ANSWER": [
                            "BETWEEN 6 AND 12 MONTHS AGO"
                        ]
                    },
                    {
                        "QUESTION": "IS YOUR EPILEPSY/SEIZURES AS A RESULT OF ANY OF THE FOLLOWING?",
                        "ANSWER": [
                            "NONE OF THE ABOVE"
                        ]
                    }
                ]
            }
        ]
    } else if (disease == "Kidney Infection") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "KNEE DISLOCATION",
                "SCORE": "1.40",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "IS IT THE KNEECAP THAT DISLOCATES?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HAS THIS BEEN SATISFACTORILY SURGICALLY TREATED?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "DO YOU NEED TO WEAR A KNEE BRACE AT ANY TIME?",
                        "ANSWER": [
                            "NO"
                        ]
                    }
                ]
            }
        ]
    } else if (disease == "Asthma") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "Asthma Score",
                "SCORE": "1.43",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "HAVE YOU EVER HAD A DIAGNOSIS MADE OF COPD (E.G. CHRONIC BRONCHITIS OR EMPHYSEMA)?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HOW OLD WERE YOU WHEN YOU WERE DIAGNOSED WITH THIS CONDITION?",
                        "ANSWER": [
                            "UNDER 50 YEARS OLD"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY MEDICINES ARE PRESCRIBED FOR THIS CONDITION (COUNT EACH INHALER AS ONE MEDICINE)?",
                        "ANSWER": [
                            "0 - 2"
                        ]
                    },
                    {
                        "QUESTION": "DO YOU USE NEBULISERS AS PART OF ROUTINE MAINTENANCE OF ASTHMA?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY UNPLANNED HOSPITAL VISITS HAVE YOU HAD FOR ASTHMA IN THE LAST 12 MONTHS?",
                        "ANSWER": [
                            "1"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU EVER BEEN PRESCRIBED OXYGEN OTHER THAN WHEN YOU ARE IN HOSPITAL?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU EVER BEEN A SMOKER?",
                        "ANSWER": [
                            "NO"
                        ]
                    }
                ]
            }
        ]
    } else if (disease == "Abnormal heart rhythm") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "ABNORMAL HEART RHYTHM",
                "SCORE": "4.02",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "HOW HAS YOUR CONDITION BEEN TREATED?",
                        "ANSWER": [
                            "I HAVE NEVER NEEDED ANY TREATMENT BUT I AM STILL UNDER FOLLOW-UP"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY UNPLANNED HOSPITAL VISITS FOR YOUR IRREGULAR HEARTBEAT HAVE YOU HAD IN THE LAST 12 MONTHS?",
                        "ANSWER": [
                            "0"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU BEEN ADVISED THAT FURTHER INVESTIGATION OR TREATMENT IS REQUIRED FOR THIS CONDITION?",
                        "ANSWER": [
                            "YES"
                        ]
                    },
                    {
                        "QUESTION": "ARE YOU ON MEDICATION TO THIN THE BLOOD (EXCLUDING ASPIRIN AND CLOPIDOGREL)?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HAS YOUR HEART RHYTHM EVER CAUSED COLLAPSES, FAINTS OR BLACKOUTS?",
                        "ANSWER": [
                            "YES"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU EVER HAD ANY OF THE FOLLOWING CONDITIONS?",
                        "ANSWER": [
                            "NO - NONE OF THESE"
                        ]
                    }
                ]
            }
        ]
    } else if (disease == "Pulmonary fibrosis") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "PULMONARY FIBROSIS",
                "SCORE": "5.01",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "HOW MANY UNPLANNED HOSPITAL ADMISSIONS HAVE YOU HAD FOR THIS CONDITION IN THE LAST 12 MONTHS?",
                        "ANSWER": [
                            "0"
                        ]
                    },
                    {
                        "QUESTION": "HOW SHORT OF BREATH DO YOU GET WHEN YOU ARE WALKING ON THE FLAT?",
                        "ANSWER": [
                            "I CAN WALK VERY EASILY WITHOUT GETTING SHORT OF BREATH OR THE NEED TO REST"
                        ]
                    },
                    {
                        "QUESTION": "ARE YOU SHORT OF BREATH AT REST?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU EVER BEEN PRESCRIBED OXYGEN OTHER THAN WHEN YOU ARE IN HOSPITAL?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU EVER BEEN A SMOKER?",
                        "ANSWER": [
                            " YES - GAVE UP 1 TO 10 YEARS AGO "
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU BEEN RECOMMENDED TO HAVE A LUNG TRANSPLANT?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "HAVE YOU HAD A CHEST INFECTION OR AN EPISODE OF PNEUMONIA IN THE LAST 12 MONTHS? ",
                        "ANSWER": [
                            "NO"
                        ]
                    }
                ]
            }
        ]

    } else if (disease == "Epilepsy and Cellulitis") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "EPILEPSY",
                "SCORE": "5.01",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "IF AWAKE, DO YOU NORMALLY LOSE CONSCIOUSNESS DURING A SEIZURE?",
                        "ANSWER": [
                            "YES"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY SEIZURES CAUSING LOSS OF CONSCIOUSNESS HAVE YOU HAD IN THE LAST 6 MONTHS?",
                        "ANSWER": [
                            "0"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY UNPLANNED HOSPITAL VISITS HAVE YOU HAD FOR THIS CONDITION IN THE LAST 12 MONTHS?",
                        "ANSWER": [
                            "1"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY DIFFERENT MEDICINES DO YOU TAKE FOR YOUR EPILEPSY/SEIZURES?",
                        "ANSWER": [
                            "3 OR MORE"
                        ]
                    },
                    {
                        "QUESTION": "HOW LONG AGO WAS YOUR FIRST SEIZURE?",
                        "ANSWER": [
                            "I HAVE NEVER HAD A SEIZURE"
                        ]
                    },
                    {
                        "QUESTION": "IS YOUR EPILEPSY/SEIZURES AS A RESULT OF ANY OF THE FOLLOWING?",
                        "ANSWER": [
                            "NO - NONE OF THE ABOVE"
                        ]
                    }
                ]
            },
            {
                "ID": 123455,
                "NAME": "CELLULITIS",
                "SCORE": "5.01",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "HOW MANY EPISODES OF CELLULITIS REQUIRING HOSPITAL TREATMENT HAVE YOU HAD?",
                        "ANSWER": [
                            "1"
                        ]
                    },
                    {
                        "QUESTION": "ARE YOU STILL BEING TREATED FOR CELLULITIS?",
                        "ANSWER": [
                            "NO"
                        ]
                    }
                ]
            }
        ]
    } else if (disease == "Epilepsy, Cellulitis and Deep vein thrombosis") {
        questionAnser = [
            {
                "ID": 123455,
                "NAME": "EPILEPSY",
                "SCORE": "3.8",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "IF AWAKE, DO YOU NORMALLY LOSE CONSCIOUSNESS DURING A SEIZURE?",
                        "ANSWER": [
                            "YES"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY SEIZURES CAUSING LOSS OF CONSCIOUSNESS HAVE YOU HAD IN THE LAST 6 MONTHS?",
                        "ANSWER": [
                            "0"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY UNPLANNED HOSPITAL VISITS HAVE YOU HAD FOR THIS CONDITION IN THE LAST 12 MONTHS?",
                        "ANSWER": [
                            "1"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY DIFFERENT MEDICINES DO YOU TAKE FOR YOUR EPILEPSY/SEIZURES?",
                        "ANSWER": [
                            " 3 OR MORE "
                        ]
                    },
                    {
                        "QUESTION": "HOW LONG AGO WAS YOUR FIRST SEIZURE?",
                        "ANSWER": [
                            " BETWEEN 6 AND 12 MONTHS AGO "
                        ]
                    },
                    {
                        "QUESTION": "IS YOUR EPILEPSY/SEIZURES AS A RESULT OF ANY OF THE FOLLOWING?",
                        "ANSWER": [
                            "NO - NONE OF THE ABOVE"
                        ]
                    }
                ]
            },
            {
                "ID": 123455,
                "NAME": "CELLULITIS",
                "SCORE": "2.5",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "HOW MANY EPISODES OF CELLULITIS REQUIRING HOSPITAL TREATMENT HAVE YOU HAD?",
                        "ANSWER": [
                            "1"
                        ]
                    },
                    {
                        "QUESTION": "ARE YOU STILL BEING TREATED FOR CELLULITIS?",
                        "ANSWER": [
                            "NO"
                        ]
                    }
                ]
            },
            {
                "ID": 123455,
                "NAME": "DEEP VEIN THROMBOSIS",
                "SCORE": "5.01",
                "ISCOVERED": true,
                "ISEXCLUDED": false,
                "EXCLUSIONTYPE": "None",
                "QUESTIONS": [
                    {
                        "QUESTION": "DID YOU ALSO HAVE ANY CLOTS IN YOUR LUNGS?",
                        "ANSWER": [
                            "NO"
                        ]
                    },
                    {
                        "QUESTION": "ARE YOU STILL TAKING ANTICOAGULANT (BLOOD-THINNING) MEDICATION FOR THIS CONDITION?",
                        "ANSWER": [
                            "YES"
                        ]
                    },
                    {
                        "QUESTION": "HOW MANY TIMES HAVE YOU HAD A THROMBOSIS (CLOT)?",
                        "ANSWER": [
                            "2"
                        ]
                    },
                    {
                        "QUESTION": "HAS YOUR DOCTOR ADVISED THAT YOU ARE AT A HIGHER RISK OF DEVELOPING BLOOD CLOTS IN THE FUTURE?",
                        "ANSWER": [
                            "NO"
                        ]
                    }
                ]
            }
        ]
    }
    return questionAnser;

}
function emcAddOns(disease, score) {
    let totalScore = score;
    let EMC = {
        "EMCNUMBER": "",
        //"EMCSCREENINGDATE": Date.now(format("YYYY-MM-DD")),
        "EMCSCREENINGDATE": new Date("YYYY-MM-DD"),
        "SCREENINGHASH": generatePassword(),
        "SCREENINGTYPE": "STRING",
        "SCREENINGDATA": "STRING",
        "STATUS": "",
        "MEDICALRISKSCORE": totalScore.toString(),
        "OVERALLSCORE": totalScore.toString(),
        "ISWINTERSPORT": 1,
        "ISANNUALTRIP": 0,
        "ISAGEDASSESSMENT": 1,
        "HEALIXTOKEN": "STRING",
        "HEALIXVERSION": "STRING",
        "CONDITIONGROUPS": [
            {
                "SCORE": totalScore.toString(),
                "CONDITIONS": questionAndAnser(disease),
            }
        ]
    }
    return EMC;
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

module.exports = { generateAddOns, generateTravellerPayload, emcAddOns };


