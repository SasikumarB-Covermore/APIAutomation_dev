let environment = process.env.TEST_ENV
export function getEnvironment() {
  console.log("Environment  " + environment);
  switch (environment) {
    case 'test3':
      return {
        baseURL: `https://${environment}-api.travelinsurancepartners.com/v3`,
        apikey: '711b3dc1331b443b81429ec7350443aa',
        secretKey: '56b047b14343412189c00Bd2cE34eD7B'
      };
    case 'staging':
      return {
        baseURL: `https://${environment}-api.travelinsurancepartners.com/v3`,
        apikey: '711b3dc1331b443b81429ec7350443aa',
        secretKey: '56b047b14343412189c00Bd2cE34eD7B'
      };
    case 'newstaging':
      return {
        baseURL: `https://${environment}-api.travelinsurancepartners.com/v3`,
        apikey: '711b3dc1331b443b81429ec7350443aa',
        secretKey: '56b047b14343412189c00Bd2cE34eD7B'
      };
    case 'preprod':
      return {
        baseURL: `https://${environment}-api.travelinsurancepartners.com/v3`,
        apikey: '711b3dc1331b443b81429ec7350443aa',
        secretKey: '56b047b14343412189c00Bd2cE34eD7B'
      };
    case 'prod':
      return {
        baseURL: `https://${environment}-api.travelinsurancepartners.com/v3`,
        apikey: '3d7f2b1c6eae438ca755323fa52ad515',
        secretKey: '35fB627a32f14F7aaCFaf492ADD7ec1C'
      };
    default:
      return {
        baseURL: `https://${environment}-api.travelinsurancepartners.com/v3`,
        apikey: '',
        secretKey: ''
      };
  }
}

export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-API-KEY': ''
};
export const validStatusCode = [200, 201, 202, 204];
export var emailAddress = '';
if (process.env.EMAIL != '') {

  emailAddress = process.env.EMAIL;
} else {
  emailAddress = "Sasikumar.b@covermore.com";
}
console.log("Email address " + emailAddress);

export const OUTPUT_DIR_PATH = 'src/output';
export const PARTNER_NAME = "cm-direct";
export const getDataFilePath = (partnerName = PARTNER_NAME) => {

  return `src/data/${partnerName}/API_DATA.xlsx`;

};
export let configVeriskVersion = 3.0
