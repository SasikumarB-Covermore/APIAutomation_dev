import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  defaultHeaders,
  validStatusCode,
  baseURL,
  emailAddress,
  getDataFilePath, PARTNER_NAME
} from "../../config/config";
const { excelToJson, filterRowsByExecution } = require("../../utils/excelUtils").default;
const { generateTravelDataNTimes, generateRefineQouteTravelDataNTimes, generateIssuePolicyTravelDataNTimes, createPayload, createPayloadForRefineQuote, createPayloadForIssuePolicy, flattenObject, validateResponseStatus, validateProductDetails, parseAPIResponse, validateHelpText } = require("../../utils/helper.js");
const { savePolicyNumber } = require('../../utils/fileReader.js')
const { generateAustralianAddress, phoneNumbers, payment } = require("../../utils/dataGenerator");
const { createQuote, createRefineQuote, createIssuePolicy, updateTravellers, closeSession } = require("../../utils/apiClient.js");
const { saveTestDetails, enhancedTestStep, getOrCreateRunDir } = require("../../utils/errorHandling.js");
import { PriceCalculator } from '../../pricing/priceCalculator.js';
import { PriceValidator } from '../../utils/priceValidator.js';
import { HelpTextValidator } from '../../utils/helpTextValidator.js';
import { testing } from "googleapis/build/src/apis/testing/index.js";
import { equal } from "assert";
const filePath = getDataFilePath()
const sheetName = "WL_WO_AddOn";
const policyNumbers = []

const TestLoggerHelper = require("../../utils/testLoggerHelper.js");
const testLoggerHelper = new TestLoggerHelper();  // Create an instance

let hasAnyTestFailed = false;
let runDir = null;  // Declare runDir globally to use across the suite
let currentTestDetails = {}; // To store current test details

test.beforeAll(async () => {
  runDir = getOrCreateRunDir();
});

test.beforeEach(() => {
  // Start the timer before each test
  testLoggerHelper.startTimer();
});

test.describe("", async () => {
  const data = await excelToJson(filePath, sheetName);
  const filteredDataSets = filterRowsByExecution(data);
  filteredDataSets.forEach((row, index) => {
    if (row.APIKey) {
      defaultHeaders["X-API-KEY"] = row.APIKey;
    }

    let payload = {};

    let [travellerPayloadArrary, travellerUpdatePayloadArrary] =
      generateTravelDataNTimes(row.numAdults, row.numChild, row)

    let payLoadQuote

    payLoadQuote = travellerPayloadArrary.map(traveller => ({
      ...flattenObject(traveller)
    }))

    let [travellerPayloadRefinQuoteArrary] =
      generateRefineQouteTravelDataNTimes(row.numAdults, row.numChild, row)

    let payLoadRefineQuote

    payLoadRefineQuote = travellerPayloadRefinQuoteArrary.map(traveller => ({
      ...flattenObject(traveller)
    }))

    let [travellerPayloadIssuePolicy] =
      generateIssuePolicyTravelDataNTimes(row.numAdults, row.numChild, row)

    let payLoadIssuePolicy

    payLoadIssuePolicy = travellerPayloadIssuePolicy.map(traveller => ({
      ...flattenObject(traveller)
    }))


    test(`Test_Scenario_${index + 1}: Create a policy for: ${sheetName}, PlanName - ${row.planName}_${row.tripType}, Duration - ${row.duration}, Country Code - ${row.destinationCountryCodes}, State - ${row.state}, Cancelation - ${row.CANX}, Lugg - ${row.LUGG}, MTCL - ${row.MTCL}, WNTS - ${row.WNTS}, CRS - ${row.CRS}, Product Code - ${row.productCode}, Plan Code - ${row.planCode}, ${row.excess} excess amount and EMC - ${row.EMC}`, async ({ request }, testInfo) => {
      // Initialize currentTestDetails for each test run
      currentTestDetails = {
        testName: `Feature_${index + 1}`,
        testFileName: path.basename(testInfo.file),
        scenarios: [],
        hasError: false
      };

      let sessionToken;
      let response;
      let responseBody;

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
      });

      // Scenario 2: Refine Quote
      await test.step(`Scenario_2: Refine Quote for ${row.planCode}`, async () => {
        await enhancedTestStep(test, `Sending POST request to Refine quote API for ${row.planCode}`, async () => {
          payload = createPayloadForRefineQuote(row, payLoadRefineQuote, [], null, responseBody);
          console.log("****** Refine Quote Request Body: \n " + JSON.stringify(payload) + "\n");
          response = await createRefineQuote(request, payload);
          validateResponseStatus(response, validStatusCode);
          responseBody = await response.json();
          console.log("****** Refine Quote Response Body: \n" + JSON.stringify(responseBody) + "\n");
          currentTestDetails.scenarios.push({
            scenario: `Scenario_2: Refine Quote for ${row.planCode}`,
            payload,
            response: responseBody,
          });
          console.log("Sending POST request for refine quote API for Success");
        }, currentTestDetails, currentTestDetails.testName, `Scenario_2: Get Quote for ${row.planCode}`);

        //function for price validation
        await test.step(`Then validate the traveller's base price and additional covers price in the API response`, async () => {
          const priceCalculator = new PriceCalculator(row, payload);
          const expectedPrices = priceCalculator.calculatePrice(true);
          //console.log("expected calculated Price " + JSON.stringify(expectedPrices));
          const apiResponse = parseAPIResponse(row, responseBody);
          const priceValidator = new PriceValidator(expectedPrices, apiResponse, row.discount, row.childChargeRate, sheetName);
          await enhancedTestStep(test, `Then validate total Gross Premium From Actual with API response`, async () => {
            priceValidator.validateTotalGrossPremium();
          }, currentTestDetails, currentTestDetails.testName, "Validate traveller's base price");
        });
      });

      // Scenario 3: Issue Policy
      await test.step(`Scenario_3: Issue Policy for ${row.planCode}`, async () => {
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
            scenario: `Scenario_3: Issue Policy for ${row.planCode}`,
            payload,
            response: responseBody,
          });
          //console.log("Issue Policy response " + JSON.stringify(responseBody));
          console.log("Sending POST request for Issue Policy API for Success");
        }, currentTestDetails, currentTestDetails.testName, `Scenario_3: IssuePolicy for ${row.planCode}`);
      });
    });
  });
});


test.afterEach(async ({ }, testInfo) => {
  const testStatus = testInfo.status;
  console.log("testStatus " + testStatus)

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

  console.log(`The test name is ${testName} and duration ${duration} and test filename ${testFileName}`);

  // Log the test details using the helper class
  /* disable the mixpanel for now
   await testLoggerHelper.logTestDetails(testName, testStatus, testFileName, duration);
   */

  currentTestDetails = {}; // Reset after each test
  console.log("After Each Success ");
});

test.afterAll('Teardown', async () => {
  if (policyNumbers.length != 0) {
    savePolicyNumber(policyNumbers, 'generatedPolicyNumbers.txt')
  }

  const runDir = getOrCreateRunDir();

  // Remove the directory if no tests failed
  if (!hasAnyTestFailed && runDir && fs.existsSync(runDir)) {
    fs.rmSync(runDir, { recursive: true, force: true });
    console.log(`No test failures. Directory deleted: ${runDir}`);
  } else {
    console.log(`Directory kept: ${runDir}`);
  }
  console.log("After All Success ");
});