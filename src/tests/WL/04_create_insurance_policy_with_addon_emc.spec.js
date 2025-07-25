import { test, expect } from '@playwright/test'
import fs from "fs";
const assert = require('assert');
import path from "path";
import {
  defaultHeaders,
  validStatusCode,
  baseURL,
  emailAddress,
  getDataFilePath, PARTNER_NAME, configVeriskVersion
} from '../../config/config.js'
const { excelToJson, filterRowsByExecution } = require('../../utils/excelUtils.js').default
const { generateTravelDataNTimes,
  generateRefineQouteTravelDataNTimes,
  generateIssuePolicyTravelDataNTimes,
  flattenObject,
  createPayload,
  parseAPIResponse,
  createPayloadForRefineQuoteOnlyAddons,
  createPayloadForRefineQuoteOnlyEMC,
  createPayloadForIssuePolicy,
  validateResponseStatus
} = require("../../utils/helper.js");
const { savePolicyNumber } = require('../../utils/fileReader.js')
const { generateAustralianAddress, phoneNumbers } = require('../../utils/dataGenerator.js')
const { saveTestDetails, enhancedTestStep, getOrCreateRunDir } = require("../../utils/errorHandling.js");
const { generateAddOns, } = require('../../utils/addonsGenerator.js')
import { PriceCalculator } from '../../pricing/priceCalculator.js';
import { PriceValidator } from '../../utils/priceValidator.js';
import { HelpTextValidator } from '../../utils/helpTextValidator.js';
const { createQuote, createRefineQuote, createIssuePolicy } = require("../../utils/apiClient.js");

const policyNumbers = []
const filePath = getDataFilePath()
const sheetName = 'WL_With_AddOn_EMC'
const TestLoggerHelper = require("../../utils/testLoggerHelper.js");
const testLoggerHelper = new TestLoggerHelper();  // Create an instance

let priceCalculator
let calculatedPrice

let hasAnyTestFailed = false;
let runDir = null;  // Declare runDir globally to use across the suite
let currentTestDetails = {}; // To store current test details

test.beforeAll(async () => {
  runDir = getOrCreateRunDir();
  console.log(`** Shared directory created for the test suite: ${runDir}`);
});

test.beforeEach(() => {
  // Start the timer before each test
  testLoggerHelper.startTimer();
});


test.describe('', async () => {
  const data = await excelToJson(filePath, sheetName)
  const filteredDataSets = filterRowsByExecution(data);
  filteredDataSets.forEach((row, index) => {
    if (row.APIKey) {
      defaultHeaders["X-API-KEY"] = row.APIKey;
    }
    test(`Test_Scenario_${index + 1}: Create a policy for: ${sheetName}, PlanName - ${row.planName}_${row.tripType}, Duration - ${row.duration}, Country Code - ${row.destinationCountryCodes}, State - ${row.state}, Cancelation - ${row.CANX}, Lugg - ${row.LUGG}, MTCL - ${row.MTCL}, WNTS - ${row.WNTS}, CRS - ${row.CRS}, Product Code - ${row.productCode}, Plan Code - ${row.planCode}, ${row.excess} excess amount and EMC - ${row.EMC}`, async ({ request }, testInfo) => {
      // Initialize currentTestDetails for each test run
      currentTestDetails = {
        testName: `Feature_${index + 1}`,
        testFileName: path.basename(testInfo.file),
        scenarios: [],
        hasError: false
      };

      let sessionToken, assessmentID, updatedHeaders
      let stepNumber //to be deleted once old verisk version is removed
      let response
      let responseBody;

      if (row.APIKey) {
        defaultHeaders['X-API-KEY'] = row.APIKey
      }
      let payload = {};
      const { travelAddOns, policyAddOns } = await generateAddOns(row)
      let [travellerPayloadArrary, travellerUpdatePayloadArrary] =
        generateTravelDataNTimes(row.numAdults, row.numChild, row)

      let payLoadQuote = travellerPayloadArrary.map(traveller => ({
        //additionalCovers: travelAddOns, // Add the additionalCovers property
        ...flattenObject(traveller) // Spread the existing plain object properties
      }))

      let payLoadRefineQuote
      let [travellerPayloadRefinQuoteArrary] =
        generateRefineQouteTravelDataNTimes(row.numAdults, row.numChild, row)

      payLoadRefineQuote = travellerPayloadRefinQuoteArrary.map(traveller => ({
        ...flattenObject(traveller)
      }))
      let [travellerPayloadIssuePolicy] =
        generateIssuePolicyTravelDataNTimes(row.numAdults, row.numChild, row)

      let payLoadIssuePolicy

      payLoadIssuePolicy = travellerPayloadIssuePolicy.map(traveller => ({
        ...flattenObject(traveller)
      }))

      // Scenario 1: Get Quote
      await test.step(`Scenario_1: Get Quote for ${row.planCode}`, async () => {
        await enhancedTestStep(test, `Sending POST request to quote API for ${row.planCode}`, async () => {
          payload = createPayload(row, payLoadQuote, [], null);
          console.log("****** Get Quote Request Body: \n" + JSON.stringify(payload) + "\n");
          response = await createQuote(request, payload);
          validateResponseStatus(response, validStatusCode);
          responseBody = await response.json();
          console.log("****** Get Quote Response Body: \n " + JSON.stringify(responseBody) + "\n");
          currentTestDetails.scenarios.push({
            scenario: `Scenario_1: Get Quote for ${row.planCode}`,
            payload,
            response: responseBody,
          });
          console.log("Sending POST request to quote API for Success");
        }, currentTestDetails, currentTestDetails.testName, `Scenario_1: Get Quote for ${row.planCode}`);

        // Validate product details
        await test.step("And I receive valid HTTP response, And validating product details", async () => {
          await enhancedTestStep(test, "Then validating product details", async () => {
            if (row.APIKey != 'cba-cardholder') {
              expect(JSON.stringify(responseBody.quoteId), "QuoteID is returned").toBeDefined();
            }
            console.log("Then validating product details Success");
          }, currentTestDetails, currentTestDetails.testName, "Validate product details");

          await enhancedTestStep(test, "And validating benefits help text", async () => {
            const helpTextValidator = new HelpTextValidator(responseBody);
            helpTextValidator.validateHelpText();
            console.log("validating benefits help text Success");
          }, currentTestDetails, currentTestDetails.testName, "Validate benefits help text.");
        });

        //Get quote price validation
        await test.step(`Then validate the traveller's base price and additional covers price in the API response`, async () => {
          const priceCalculator = new PriceCalculator(row, payload, responseBody);
          const expectedPrices = priceCalculator.calculatePriceForGetQuote(true);
          const apiResponse = parseAPIResponse(row, responseBody);
          const priceValidator = new PriceValidator(expectedPrices, apiResponse, row.discount, row.childChargeRate, "", row.numAdults);
          await enhancedTestStep(test, `Then validate total Gross Premium From Actual with API response`, async () => {
            priceValidator.validateTotalGrossPremiumForGetQuote();
          }, currentTestDetails, currentTestDetails.testName, "Validate traveller's base price");
        });
      });

      // Scenario 2: Refine Quote
      await test.step(`Scenario_2: Refine Quote Only Addons for ${row.planCode}`, async () => {
        await enhancedTestStep(test, `Sending POST request to Refine quote API for ${row.planCode}`, async () => {
          payload = createPayloadForRefineQuoteOnlyAddons(row, payLoadRefineQuote, [], null, responseBody);
          console.log("****** Refine Quote Only Addons Request Body: \n " + JSON.stringify(payload) + "\n");
          response = await createRefineQuote(request, payload);
          validateResponseStatus(response, validStatusCode);
          responseBody = await response.json();
          console.log("****** Refine Quote Only Addons Response Body: \n" + JSON.stringify(responseBody) + "\n");
          currentTestDetails.scenarios.push({
            scenario: `Scenario_2: Refine Quote Only Addons for ${row.planCode}`,
            payload,
            response: responseBody,
          });
          console.log("Sending POST request for refine quote API for Success");
        }, currentTestDetails, currentTestDetails.testName, `Scenario_2: refine Quote Only Addons for ${row.planCode}`);

        //function for price validation
        await test.step(`Then validate the traveller's base price and additional covers price in the API response`, async () => {
          const priceCalculator = new PriceCalculator(row, payload, responseBody, "OnlyAddons");
          const expectedPrices = priceCalculator.calculatePrice(true);
          const apiResponse = parseAPIResponse(row, responseBody);
          const priceValidator = new PriceValidator(expectedPrices, apiResponse, row.discount, row.childChargeRate, "OnlyAddons", row.numAdults);
          await enhancedTestStep(test, `Then validate total Gross Premium From Actual with API response`, async () => {
            priceValidator.validateTotalGrossPremium();
          }, currentTestDetails, currentTestDetails.testName, "Validate traveller's base price");
        });
      });
      // Scenario 3: Refine Quote
      await test.step(`Scenario_3: Refine Quote Only EMC for ${row.planCode}`, async () => {
        await enhancedTestStep(test, `Sending POST request to Refine quote API for ${row.planCode}`, async () => {
          payload = createPayloadForRefineQuoteOnlyEMC(row, payLoadRefineQuote, [], null, responseBody);
          console.log("****** Refine Quote Only EMC Request Body: \n " + JSON.stringify(payload) + "\n");
          response = await createRefineQuote(request, payload);
          validateResponseStatus(response, validStatusCode);
          responseBody = await response.json();
          console.log("****** Refine Quote Only EMC Response Body: \n" + JSON.stringify(responseBody) + "\n");
          currentTestDetails.scenarios.push({
            scenario: `Scenario_3: Refine Quote Only EMC for ${row.planCode}`,
            payload,
            response: responseBody,
          });
          console.log("Sending POST request for refine quote API for Success");
        }, currentTestDetails, currentTestDetails.testName, `Scenario_3: refine Quote Only EMC for ${row.planCode}`);

        //function for price validation
        await test.step(`Then validate the traveller's base price and additional covers price in the API response`, async () => {
          const priceCalculator = new PriceCalculator(row, payload, responseBody, "OnlyEMC");
          const expectedPrices = priceCalculator.calculatePrice(true);
          const apiResponse = parseAPIResponse(row, responseBody);
          const priceValidator = new PriceValidator(expectedPrices, apiResponse, row.discount, row.childChargeRate, "OnlyEMC", row.numAdults);
          await enhancedTestStep(test, `Then validate total Gross Premium From Actual with API response`, async () => {
            priceValidator.validateTotalGrossPremium();
          }, currentTestDetails, currentTestDetails.testName, "Validate traveller's base price");
        });
      });

      // Scenario 4: Issue Policy
      await test.step(`Scenario_4: Issue Policy for ${row.planCode}`, async () => {
        await enhancedTestStep(test, `Sending POST request to Issue Policy API for ${row.planCode}`, async () => {
          const addrPayLoad = generateAustralianAddress(row);
          const phonePayLoad = phoneNumbers();
          payload = createPayloadForIssuePolicy(row, payLoadIssuePolicy, addrPayLoad, phonePayLoad, emailAddress, [], null, responseBody);
          console.log("****** Issue Policy Request Body: \n" + JSON.stringify(payload) + "\n");
          response = await createIssuePolicy(request, payload);
          validateResponseStatus(response, validStatusCode);
          responseBody = await response.json();
          console.log("****** Issue Policy Response Body: \n" + JSON.stringify(responseBody) + "\n");
          currentTestDetails.scenarios.push({
            scenario: `Scenario_4: Issue Policy for ${row.planCode}`,
            payload,
            response: responseBody,
          });
          console.log("Sending POST request for Issue Policy API for Success");
        }, currentTestDetails, currentTestDetails.testName, `Scenario_4: IssuePolicy for ${row.planCode}`);
      });
    })
  })

  test.afterEach(async ({ }, testInfo) => {
    const testStatus = testInfo.status;
    if (testStatus !== 'passed' || currentTestDetails.hasError) {
      hasAnyTestFailed = true; // Mark that a failure has occurred
      console.log(`Saving test details for failed test: ${currentTestDetails.testName}`);
      saveTestDetails(currentTestDetails, currentTestDetails.testName, getOrCreateRunDir());
    } else {
      console.log(`Test passed: ${currentTestDetails.testName}, no JSON will be saved.`);
    }

    // Calculate the test duration
    const duration = testLoggerHelper.calculateDuration();
    const testName = currentTestDetails.testName;
    const testFileNm = currentTestDetails.testFileName;
    const testFileName = testFileNm.replace(/\.spec\.js$/, '');  // Remove .spec.js from the filename

    console.log(`The test name is ${testName}`);

    // Log the test details using the helper class
    /* disable the mixpanel for now
     await testLoggerHelper.logTestDetails(testName, testStatus, testFileName, duration);
     */

    currentTestDetails = {}; // Reset after each test
  });

  test.afterAll('Teardown', async () => {
    if (policyNumbers.length != 0) {
      savePolicyNumber(policyNumbers, 'generatedAddOnsPolicyNumbers.txt')
    }
    const runDir = getOrCreateRunDir();

    // Remove the directory if no tests failed
    if (!hasAnyTestFailed && runDir && fs.existsSync(runDir)) {
      fs.rmSync(runDir, { recursive: true, force: true });
      console.log(`No test failures. Directory deleted: ${runDir}`);
    } else {
      console.log(`Some tests failed, actual ${hasAnyTestFailed}. Directory kept: ${runDir}`);
    }

  })
})