import { test, expect } from "@playwright/test";
const assert = require('assert');
import fs from "fs";
import path from "path";
import {
  defaultHeaders,
  validStatusCode,
  baseURL,
  emailAddress,
  getDataFilePath, PARTNER_NAME, configVeriskVersion
} from "../../config/config.js";
const { excelToJson, filterRowsByExecution } = require("../../utils/excelUtils.js").default;
const { generateTravelDataNTimes,
  flattenObject,
  createPayload,
  calculateDepartureDate,
  calculateReturnDate,
  parseAPIResponse, validateResponseStatus, validateProductDetails,
 } = require("../../utils/helper.js");
const { savePolicyNumber } = require('../../utils/fileReader.js')
const { generateAustralianAddress, assessmentId } = require("../../utils/dataGenerator.js");
const { saveTestDetails, enhancedTestStep, getOrCreateRunDir } = require("../../utils/errorHandling.js");
const { getEMCScore, generateEmcConditions, createSaveEmcPayload } = require('../../utils/emcUtils.js')
import { PriceCalculator } from '../../pricing/priceCalculator.js';
import { PriceValidator } from '../../utils/priceValidator.js';
import { HelpTextValidator } from '../../utils/helpTextValidator.js';
const { createSession, createQuote, updateTravellers, closeSession, quoteEmc, saveEmc, newGetEmc, newQuoteEmc} = require("../../utils/apiClient.js");
const filePath = getDataFilePath()
const sheetName = "WL_WO_AddOn_EMC";
const policyNumbers = []

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


test.describe("", async () => {
  const data = await excelToJson(filePath, sheetName);
  const filteredDataSets = filterRowsByExecution(data);
  filteredDataSets.slice(0,1).forEach((row, index) => {
    // data.slice(0, 10).forEach((row, index) => {
    if (row.APIKey) {
      defaultHeaders["X-API-KEY"] = row.APIKey;
    }

    test(`Feature_${index + 1}: [${PARTNER_NAME}][${row.planName}] create a insurance policy with EMC and $${row.excess} excess amount`, async ({ request, }, testInfo) => {

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

      const assessID = assessmentId().assessID;
      let [travellerPayloadArrary, travellerUpdatePayloadArrary] =
        generateTravelDataNTimes(row.numAdults, row.numChild,row)

      let payLoadQuote = travellerPayloadArrary.map(traveller => ({
        ...flattenObject(traveller)
      }));

      await test.step(`Scenario_1: Get session for the campaign ID=${row.campaignID}`, async () => {
        await enhancedTestStep(test, `Sending POST request to sessions/create for the campaign ID=${row.campaignID}`, async () => {
          response = await createSession(request,row.campaignID)
          responseBody = await response.json();
          validateResponseStatus(response, validStatusCode);
          sessionToken = responseBody.sessionToken;
          expect(sessionToken, "And a Session token is returned").toBeDefined();

          currentTestDetails.scenarios.push({
            scenario: `Scenario_1: Get session for the campaign ID=${row.campaignID}`,
            payload: { campaignID: row.campaignID },
            response: responseBody, // Capture the session creation response
          });

        }, currentTestDetails, currentTestDetails.testName, `Scenario_1: Get session`);
      });


      await test.step(`Scenario_2: Get Quote for ${row.planCode}`, async () => {
        await enhancedTestStep(test, `Sending POST request to /quote API for ${row.planCode}`, async () => {
          const emcOptions = {
            identifier: 'adult1', emcAccepted: true, assessmentID: assessID
          };

          // payload = createPayload(sessionToken, row, payLoadQuote, policyAddOns, null);
          payload = createPayload(sessionToken, row, payLoadQuote, [], emcOptions);
          response = await createQuote(request,payload)
       
          responseBody = await response.json();
          validateResponseStatus(response, validStatusCode);
          currentTestDetails.scenarios.push({
            scenario: `Scenario_2: Get Quote for ${row.planCode}`,
            payload,
            response: responseBody,
          });
        }, currentTestDetails, currentTestDetails.testName, `Scenario_2: Get Quote for ${row.planCode}`);


          await enhancedTestStep(test, "And validating product details", async () => {
            if (row.APIKey != 'cba-cardholder') {
              expect(responseBody.quoteID, "QuoteID is returned").toBeDefined(); 
            }
            validateProductDetails(responseBody, row);
          }, currentTestDetails, currentTestDetails.testName, "Validate product details");
   

   
          await enhancedTestStep(test, `Then validate the traveller's base price with API response`, async () => {
            priceCalculator = new PriceCalculator(row, payload);
            calculatedPrice = priceCalculator.calculatePrice(false);
            const apiResponse = parseAPIResponse(row, responseBody)
            const priceValidator = new PriceValidator(calculatedPrice, apiResponse,row.discount, row.childChargeRate);
            priceValidator.validateBasePrice();
          }, currentTestDetails, currentTestDetails.testName, "Validate traveller's base price");
        
      });

      let veriskVersion = (configVeriskVersion === null || configVeriskVersion === undefined) ? 0 : configVeriskVersion;
      if(isNaN(Number(veriskVersion))){
                assert.fail(`Verisk version "${veriskVersion}" is incorrect in config file`);
              }else if(Number(veriskVersion) > 2.5){
                await test.step(`Scenario_3: Save Emc for ${row.planCode}`, async () => {
                  await enhancedTestStep(test, `Sending POST request to /save/emc API ${row.planCode}`, async () => {
                    const emcValue = row.emc; // Ensure this matches the column name in your spreadsheet
                    if (!emcValue) {
                      console.error('No EMC value found in the current row');
                      return;
                    }
                    const emcScoreValue = getEMCScore(emcValue, filePath);
        
                    if (!emcScoreValue) {
                      console.error('No corresponding EMC score found for the given EMC tier');
                      return;
                    }
                    updatedHeaders = {
                      ...defaultHeaders,
                      'X-Correlation-ID': 'asdfsdafsadfsadfsadfsdfew2sdfsadfw',
                    };
                    const departureDate = calculateDepartureDate(row.leadTime);
                    const returnDate = calculateReturnDate(departureDate,row.duration);
                    let payload = createSaveEmcPayload(sessionToken, row, departureDate, returnDate, emcScoreValue);
                    response = await saveEmc(request, payload, updatedHeaders)
                    responseBody = await response.json();
                    currentTestDetails.scenarios.push({
                      scenario: `Scenario_3: Save Emc for ${row.planCode}`,
                      payload,
                      response: responseBody,
                    });
                    validateResponseStatus(response, validStatusCode);
        
                    assessmentID = responseBody.emcAssessment.assessmentID
                  }, currentTestDetails, currentTestDetails.testName, `Scenario_3: Save Emc for ${row.planCode}`);
        
                });
        
                await test.step(`Scenario_4: Get Emc for ${row.planCode}`, async () => {
                  await enhancedTestStep(test, `Sending POST request to /emc/assessmentNumber API ${row.planCode}`, async () => {
        
                    response = await newGetEmc(request, assessmentID, updatedHeaders)
                    responseBody = await response.json();
                    currentTestDetails.scenarios.push({
                      scenario: `Scenario_4: Get Emc for ${row.planCode}`,
                      payload,
                      response: responseBody,
                    });
                    validateResponseStatus(response, validStatusCode);
        
                  }, currentTestDetails, currentTestDetails.testName, `Scenario_3: Get Emc for ${row.planCode}`);
        
                });
        
                await test.step(`Scenario_5: Quote Emc for ${row.planCode}`, async () => {
                  await enhancedTestStep(test, `Sending POST request to /quote/emc API ${row.planCode}`, async () => {
                    payload = {  
                      sessionToken:sessionToken,
                      assessmentID:assessmentID,
                      healixVersion:'3.0',
                      identifier: 'adult1'
                    }
                    response = await newQuoteEmc(request, payload, updatedHeaders)
                    responseBody = await response.json();
                    currentTestDetails.scenarios.push({
                      scenario: `Scenario_5: Quote Emc for ${row.planCode}`,
                      payload,
                      response: responseBody,
                    });
                    validateResponseStatus(response, validStatusCode);
                    
                  }, currentTestDetails, currentTestDetails.testName, `Scenario_5: Quote Emc for ${row.planCode}`);
        
                }); 
                stepNumber = 6
              } else {
                await test.step(`Scenario_3: Get Emc for ${row.planCode}`, async () => {
                  await enhancedTestStep(test, `Sending POST request to /quote/emc API ${row.planCode}`, async () => {
                    const emcValue = row.emc; // Ensure this matches the column name in your spreadsheet
                    if (!emcValue) {
                      console.error('No EMC value found in the current row');
                      return;
                    }
                    const emcScoreValue = getEMCScore(emcValue, filePath);
        
                    if (!emcScoreValue) {
                      console.error('No corresponding EMC score found for the given EMC tier');
                      return;
                    }
                    let emcConditions = generateEmcConditions();
        
                    // payload = createPayload(sessionToken, row, payLoadQuote, policyAddOns, null);
                    payload = {
                      sessionToken: sessionToken,
                      identifier: 'adult1',
                      totalRiskScore: emcScoreValue,
                      assessmentID: assessID,
                      healixVersion: '2.5',
                      healixRegionID: 202,
                      isDeclaredByOther: false,
                      conditionGroups: [
                        {
                          score: emcScoreValue,
                          conditions: [...emcConditions]
                        }
                      ]
                    }
                    response = await quoteEmc(request, payload)
                    responseBody = await response.json();
                    validateResponseStatus(response, validStatusCode);
                    currentTestDetails.scenarios.push({
                      scenario: `Scenario_3: Get Emc for ${row.planCode}`,
                      payload,
                      response: responseBody,
                    });
                  }, currentTestDetails, currentTestDetails.testName, `Scenario_3: Get Emc for ${row.planCode}`);
        
                });
                stepNumber = 4 
              }

      await test.step(`Scenario_${stepNumber}: Get Quote for ${row.planCode}`, async () => {
          await enhancedTestStep(test, `Sending POST with EMC request to /quote API for ${row.planCode}`, async () => {
            const emcOptions = {
              identifier: 'adult1',
              emcAccepted: true,
              assessmentID: assessID
            };
            payload = createPayload(sessionToken, row, payLoadQuote, [], emcOptions);
            response = await createQuote(request,payload)
            
            responseBody = await response.json();
            validateResponseStatus(response, validStatusCode);
            currentTestDetails.scenarios.push({
              scenario: `Scenario_${stepNumber}: Get Quote for ${row.planCode}`,
              payload,
              response: responseBody,
          });
          }, currentTestDetails, currentTestDetails.testName, `Scenario_${stepNumber}: Get Quote for ${row.planCode}`);
          await test.step("And I receive valid HTTP response, And validating product details", async () => {
            await enhancedTestStep(test, "And validating product details", async () => {
              if (row.APIKey != 'cba-cardholder') {
                expect(responseBody.quoteID, "QuoteID is returned").toBeDefined();
              }
              validateProductDetails(responseBody, row);
            }, currentTestDetails, currentTestDetails.testName, "Validate product details");

            await enhancedTestStep(test, "And validating benefits help text", async () => {    
              const helpTextValidator = new HelpTextValidator(responseBody);
              helpTextValidator.validateHelpText();
            }, currentTestDetails, currentTestDetails.testName, "Validate benefits help text.");
    
          })
        await test.step(`Then validate the traveller's base price in the API response`, async () => {
          const apiResponse = parseAPIResponse(row, responseBody)
          const priceValidator = new PriceValidator(calculatedPrice, apiResponse, row.discount, row.childChargeRate);
          await enhancedTestStep(test, `Then validate the traveller's base price in the API response`, async () => {
            priceValidator.validateBasePrice();
          }, currentTestDetails, currentTestDetails.testName, "Validate traveller's base price");

        await enhancedTestStep(test, `Then Validate EMC price for adult1 in the API response`, async () => {
            priceValidator.validateEMCPrice();
          }, currentTestDetails, currentTestDetails.testName, "Validate EMC price");

        });
      });
      stepNumber += 1

      await test.step(`Scenario_${stepNumber}: Update travellers information`, async () => {
        await enhancedTestStep(test, `Sending POST request with EMC data to /travellers API for`, async () => {

          const addrPayLoad = generateAustralianAddress();
          let payLoadUpdate = travellerUpdatePayloadArrary.map(traveller => ({
            ...flattenObject(traveller)
          }))

          payload = {
            sessionToken: sessionToken,
            contact: {
              email: emailAddress,
              optInMarketing: false,
              phoneNumbers: [
                {
                  type: "mobile",
                  number: 384738293,
                },
              ],
              address: addrPayLoad,
            },
            travellers: payLoadUpdate
          };

          // Make the API request
          response = await updateTravellers(request,payload)

          responseBody = await response.json();
          console.error("Response:", responseBody.exceptions);

          validateResponseStatus(response, validStatusCode);

          currentTestDetails.scenarios.push({
            scenario: `Scenario_${stepNumber}: Update travellers information`,
            payload,
            response: responseBody,
          });
        }, currentTestDetails, currentTestDetails.testName, `Scenario_${stepNumber}: Update travellers information`);
    
      });
      stepNumber += 1

      let devURL = /https:\/\/apidev\.au\.poweredbycovermore\.com\/.*/i;
       
        if (devURL.test(baseURL)) {
          console.log("Working on dev Environment with URL: ", baseURL)
          await test.step(`Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`, async () => {
            await enhancedTestStep(test, `Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`, async () => {

              response
              let payload = {
                sessionToken: sessionToken,
                bookingID: Math.random().toString(36).slice(2),
                isPurchased: true
              };
              response = await closeSession(request,payload)

              responseBody = await response.json();
              validateResponseStatus(response, validStatusCode);
              console.log(`Policy Number: ${responseBody.policyNumber}`)
              const policyNumber = responseBody.policyNumber;
              expect(responseBody.policyNumber,`And a policy number ${policyNumber} is returned`).toBeDefined()
              if (row.downLoadPdfs) { policyNumbers.push(responseBody.policyNumber) };

              currentTestDetails.scenarios.push({
                scenario: `Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`,
                payload,
                response: responseBody,
              });

            }, currentTestDetails, currentTestDetails.testName, `Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`);

          });
        } else {
          console.log("Working on dev Environment with URL: ", baseURL)
          await test.step(`Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`, async () => {
            await enhancedTestStep(test, `Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`, async () => {

              response
              let payload = {
                sessionToken: sessionToken,
                bookingID: Math.random().toString(36).slice(2),
                isPurchased: false  // Policy will not be issued if environment is not dev environment
              };
              response = await closeSession(request,payload)

              responseBody = await response.json();
              validateResponseStatus(response, validStatusCode);
              const policyNumber = 0;
              console.log(`Policy Number: `, policyNumber)
              expect(responseBody).toEqual({});
              if (row.downLoadPdfs) { policyNumbers.push(responseBody.policyNumber) };

              currentTestDetails.scenarios.push({
                scenario: `Scenario_${stepNumber}: Close the session for the campaign ID=${row.campaignID}`,
                payload,
                response: responseBody,
              });

            }, currentTestDetails, currentTestDetails.testName, `Scenario_6: Close the session for the campaign ID=${row.campaignID}`);

          });
        }

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
      console.log(`Directory kept: ${runDir}`);
    }

  })

})