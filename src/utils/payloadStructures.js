// src/utils/payloadStructures.js

function getTravelPayloadForQuote (commonData) {
  return {
    dateOfBirth: commonData.dateOfBirth,
    age: commonData.age,
    dateOfBirth: commonData.dateOfBirth,
    isPrimary: commonData.isPrimary,
    treatAsAdult: commonData.treatAsAdult
  }
}

function getTravelPayloadForRefineQuote (commonData) {
  return {
    
    age: commonData.age,
    dateOfBirth: commonData.dateOfBirth,
    isPrimary: commonData.isPrimary,
    treatAsAdult: commonData.treatAsAdult,
    title: commonData.title,
    firstName: commonData.firstName,
    lastName: commonData.lastName,
    gender: commonData.gender,
    memberID: '',
    externalCustomerId: ''
  }
}

function getTravelPayloadForIssuePolicy (commonData) {
  return {
    
    age: commonData.age,
    dateOfBirth: commonData.dateOfBirth,
    isPrimary: commonData.isPrimary,
    treatAsAdult: commonData.treatAsAdult,
    title: commonData.title,
    firstName: commonData.firstName,
    lastName: commonData.lastName,
    gender: commonData.gender,
    memberID: '',
    externalCustomerId: '',
  }
}

function getTravelPayloadForUpdateTraveller (commonData) {
  return {
    //identifier: commonData.identifier,
    isPrimary: commonData.isPrimary,
    age: commonData.age,
    treatAsAdult: true,
    dateOfBirth: commonData.dateOfBirth,
    title: commonData.title,
    gender: commonData.gender,
    firstName: commonData.firstName,
    lastName: commonData.lastName,
    memberID: '',
    acceptedOffer: true
  }
}
//memberID: commonData.memberID,
module.exports = {
  getTravelPayloadForQuote,
  getTravelPayloadForRefineQuote, 
  getTravelPayloadForIssuePolicy,
  getTravelPayloadForUpdateTraveller
}
