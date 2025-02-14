import { validStatusCode, baseURL, OUTPUT_DIR_PATH,PARTNER_NAME } from '../../config/config'
const { retriveEmails, processEmails } = require('../../utils/gmailChecker') // path to the script
const { loadFile, deleteDataFile } = require('../../utils/fileReader')
const { test, expect } = require('@playwright/test')
import { mkdirSync } from 'fs'
const path = require('path')
const senderName = 'Cover-More Travel Insurance <enquiries@covermore.com.au>'

test.describe('', async () => {
  
  const policyNumbers = readAndConcat(
    'generatedAddOnsPolicyNumbers.txt',
    'generatedPolicyNumbers.txt'
  )

  if (policyNumbers.length == 0){
   await test("No data or file available for this test. The test cannot proceed due to missing required resources",async ()=>{});
  }
  policyNumbers.forEach(async policyNumber => {
    await test(`Confirmation Email Verification for ${policyNumber}`, async () => {
      await test.step('verify policy number in emails and download the pdfs', async () => {
        let emails = await retriveEmails(senderName)
        if (emails) {
          for (const email of emails) {
            const dynamicDir = path.join(OUTPUT_DIR_PATH, policyNumber)
            // Ensure the directory exists before attempting to write files
            await mkdirSync(dynamicDir, { recursive: true })
            await processEmails(email, senderName, policyNumber, dynamicDir)
          }
        } else {
          console.log('No messages from the specified sender')
        }
      })
    })

    await test(`get the policy information for ${policyNumber}`, async ({
      request
    }) => {
      let response
      let responseBody
      try {
        // Make the API request
        response = await request.get(
          `${baseURL}/getsinglesimple/${policyNumber}`,
          {
            headers: {
              'X-API-KEY': PARTNER_NAME
            },
            data: {}
          }
        )
        // Parse and log the response body
        if (!response.ok()) {
          throw new Error(`API request failed with status ${response.status()}`)
        }
        expect(validStatusCode).toContain(response.status()) // Validate if the response status is one of the valid codes
        responseBody = await response.json()
        console.log(responseBody)
      } catch (error) {
        // Handle any errors that occur
        console.error('An error occurred:', error.message)
        // Optionally, can re-throw the error to ensure the test fails
        responseBody = await response.json()
        console.error('Response:', responseBody.message)
        // Optionally, fail the test
        expect(error).toBeNull()
      }
    })
  })
  await test.afterAll('Teardown', async () => {
    await deleteDataFile(
      path.join(OUTPUT_DIR_PATH, 'generatedAddOnsPolicyNumbers.txt')
    )
    await deleteDataFile(path.join(OUTPUT_DIR_PATH, 'generatedPolicyNumbers.txt'))
  })
})

function readAndConcat(file1, file2) {
  const arr1 = loadFile(path.join(OUTPUT_DIR_PATH, file1))
  const arr2 = loadFile(path.join(OUTPUT_DIR_PATH, file2))
  return [...arr1, ...arr2]
}
