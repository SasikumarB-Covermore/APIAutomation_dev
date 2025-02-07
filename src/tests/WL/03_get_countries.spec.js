const { test, expect } = require('@playwright/test');

test('get countries for cm-direct', async ({ request }) => {
  try {
    // Make the API request
    const response = await request.get(`https://apidev.au.poweredbycovermore.com/v2/regions`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': 'cm-direct'
      },
      data: {}
    });

    // List of valid response codes
    const validStatusCodes = [200, 201, 202, 204];

    // Validate if the response status is one of the valid codes
    expect(validStatusCodes).toContain(response.status());

    // Parse and log the response body
    const responseBody = await response.json();
  } catch (error) {
    // Handle any errors that occur
    console.error('An error occurred:', error.message);

    // Optionally, can re-throw the error to ensure the test fails
    throw error;
  }
});
