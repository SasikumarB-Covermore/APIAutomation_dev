// src/utils/dataGenerator.js
const { faker } = require('@faker-js/faker');
const moment = require('moment');
const dynamicDate = require("../utils/apiClient");

function generateCommonData(identifier, row) {
    if (!row) {
        throw new Error('row is undefined in generateCommonData');
    }

    const isAgeOver80 = row.AGECBA && row.AGECBA.toLowerCase() === 'null';
    const isAdult = identifier.toLowerCase().includes('adult');

    const isPrimary = row.numAdults > 0 ? identifier.toLowerCase() == 'adult1' : identifier.toLowerCase() == 'child1';
    // const age = isAdult ? faker.number.int({ min: 36, max: 50 }) : faker.number.int({ min: 2, max: 19 });
    const age = isAgeOver80
        ? faker.number.int({ min: 81, max: 99 })  // If AGECBA is "yes", age > 80
        : (isAdult
            ? faker.number.int({ min: 18, max: 99 }) // Default adult age
            : faker.number.int({ min: 1, max: 17 })); // Default child age


    const dateOfBirth = moment().subtract(age, 'years').format('YYYY-MM-DD');

    return {
        age: age,
        dateOfBirth: dateOfBirth,
        isPrimary: isPrimary,
        treatAsAdult: row.numAdults > 0 ? identifier.toLowerCase().includes('adult') : identifier.toLowerCase().includes('child')
    };
}

function generateCommonRefineQouteData(identifier, row) {
    if (!row) {
        throw new Error('row is undefined in generateCommonRefineQouteData');
    }

    const isAgeOver80 = row.AGECBA && row.AGECBA.toLowerCase() === 'null';
    const isAdult = identifier.toLowerCase().includes('adult');
    const isPrimary = identifier.toLowerCase() === 'adult1';
    const age = isAgeOver80
        ? faker.number.int({ min: 81, max: 99 })  // If AGECBA is "yes", age > 80
        : (isAdult
            ? faker.number.int({ min: 18, max: 99 }) // Default adult age
            : faker.number.int({ min: 1, max: 17 })); // Default child age


    const dateOfBirth = moment().subtract(age, 'years').format('YYYY-MM-DD');
    const gender = faker.person.sexType().substring(0, 1);
    const title = gender === 'm' ? 'Mr' : 'Ms';
    const firstName = 'Test_' + faker.person.firstName(gender);
    const lastName = 'Test_' + faker.person.lastName();
    const treatAsAdult = identifier.toLowerCase().includes('adult');

    return {
        age: age,
        dateOfBirth: dateOfBirth,
        isPrimary: isPrimary,
        treatAsAdult: treatAsAdult,
        title: title,
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        memberID: isPrimary ? `MC${faker.number.int({ min: 100000, max: 999999 })}` : '',
        externalCustomerId: ""
    };
}

function generateCommonIssuePolicyData(identifier, row) {
    if (!row) {
        throw new Error('row is undefined in generateCommonIssuePolicyData');
    }

    const isAgeOver80 = row.AGECBA && row.AGECBA.toLowerCase() === 'null';
    const isAdult = identifier.toLowerCase().includes('adult');
    const isPrimary = identifier.toLowerCase() === 'adult1';
    const age = isAgeOver80
        ? faker.number.int({ min: 81, max: 99 })  // If AGECBA is "yes", age > 80
        : (isAdult
            ? faker.number.int({ min: 18, max: 99 }) // Default adult age
            : faker.number.int({ min: 1, max: 17 })); // Default child age


    const dateOfBirth = moment().subtract(age, 'years').format('YYYY-MM-DD');
    const gender = faker.person.sexType().substring(0, 1);
    const title = gender === 'm' ? 'Mr' : 'Ms';
    const firstName = 'Test_' + faker.person.firstName(gender);
    const lastName = 'Test_' + faker.person.lastName();
    const treatAsAdult = identifier.toLowerCase().includes('adult');

    return {
        age: age,
        dateOfBirth: dateOfBirth,
        isPrimary: isPrimary,
        treatAsAdult: treatAsAdult,
        title: title,
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        memberID: isPrimary ? `MC${faker.number.int({ min: 100000, max: 999999 })}` : '',
        additionalCoverAddons: []
    };
}

function generateAustralianAddress(row) {
    return {
        postCode: `2${faker.number.int({ min: 100, max: 999 })}`, // Australian postcodes are 4 digits
        street1: faker.location.streetAddress(),
        street2: faker.location.secondaryAddress(),
        suburb: faker.location.city(),  // Use city() if suburb-specific method is not available
        state: row.state, // Australian state abbreviation
        countryCode: 'AUS'
    };
}

function phoneNumbers() {
    return {
        "type": "Mobile",
        //"number": faker.phone.number()
        "number": faker.string.numeric({ length: { min: 10, max: 12 } })
    };
}

function assessmentId() {
    const assessID = faker.number.int({ min: 1000000000, max: 9999999999 });
    return {
        assessID
    };
}

module.exports = { generateCommonData, generateCommonRefineQouteData, generateCommonIssuePolicyData, generateAustralianAddress, phoneNumbers, assessmentId } // Ensure this is the default export



