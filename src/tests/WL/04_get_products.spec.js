// Import necessary modules from Playwright and utility functions

const { test, expect } = require('@playwright/test')

import { defaultHeaders, validStatusCode, baseURL,getDataFilePath, PARTNER_NAME} from '../../config/config'
const { excelToJson } = require('../../utils/excelUtils').default
const filePath = getDataFilePath()
const sheetName = 'ProductDetails'

test.describe('', async () => {
  let response
  let responseBody
  test(`Scenario: Retrieve products detail ${PARTNER_NAME}`, async ({
    request
  }) => {
    const data = await excelToJson(filePath, sheetName)
    if (data[0].APIKey) {
      defaultHeaders['X-API-KEY'] = data[0].APIKey
    }
    try {
      await test.step(` When I send a GET request to /products/`, async () => {
        response = await request.get(`${baseURL}/products/`, {
          headers: defaultHeaders
        })
        responseBody = await response.json()
        if (!response.ok()) {
          throw new Error(`API request failed with status ${response.status()}`)
        }
      })
    } catch (error) {
      console.error('Error during API request:', response.statusText())
      console.error('Response:', responseBody)
    }
    await test.step('Then the response status code should be 200', async () => {
      expect(validStatusCode).toContain(response.status())
    })
    data.forEach(async (row, index) => {
      await test.step(`And the response body should contain ProductID : ${row.productID}`, async () => {
        const productDetails = getProductById(responseBody, row.productID)
        if (productDetails) {
          validateProductDetails(productDetails,row)
        } else { 
          expect(productDetails,`Product ID ${row.productID} not found in the API response.`).toBeTruthy()    
        }
      })
    })
  })
})


function getProductById(products,productId){
    return products.find(product => product.productID === productId) || null
}

const validateProductDetails = (productDetails, row) => {
  // Destructure properties for easier access
  const { name, productCode, planCode, pdsUrl } = productDetails;

  // Validate the name
  expect(name,"verify the product name").toBe(row.productName);

  // Validate the product code
  expect(productCode,"verify the product code").toBe(row.productCode);

  // Validate the plan code
  expect(planCode,"verify the plan code").toBe(row.planCode);

  // Validate the URL contains the expected value
  expect(pdsUrl,"verify the pds url").toContain(row.pdsUrl)
};

