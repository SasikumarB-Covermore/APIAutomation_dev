import { expect } from '@playwright/test'
import { readJsonSync } from 'fs-extra';
export class PriceValidator {
    constructor(expectedCalcPrices, apiResponsePrices, discount = 0, childChargeRate = 1, addons) {
        this.expectedPriceData = expectedCalcPrices;
        this.actualPriceData = apiResponsePrices;
        this.expectedAdditionalCoverage = expectedCalcPrices.additionalCoverAddons;
        this.actualAdditionalCoverage = apiResponsePrices.products[0].additionalCoverAddons;
        this.expectedTravellerData = expectedCalcPrices.travellers;
        this.actualTravellerData = apiResponsePrices.travellers;
        this.discountValue = discount;
        this.childChargeRateValue = childChargeRate;
        this.addons = addons;
    }

    calculateDiscountedPrice(originalPrice) {
        let discountRate = this.discountValue;

        if (discountRate !== undefined) {
            let discountedPrice;

            // Normalize discountRate
            if (typeof discountRate === 'string') {
                discountRate = discountRate.endsWith('%') ?
                    parseFloat(discountRate) / 100 :
                    parseFloat(discountRate);
            } else if (typeof discountRate === 'number') {
                // If it's already a number, make sure it's in the correct format
                discountRate = discountRate > 1 ? discountRate / 100 : discountRate;
            }

            // Check if discountRate is greater than 0
            if (discountRate > 0) {
                const discountAmount = (originalPrice * discountRate); // Calculate discount amount
                discountedPrice = originalPrice - discountAmount; // Subtract discount from original price
                discountedPrice = parseFloat(discountedPrice.toFixed(2)); // Format to 2 decimal places

                return {
                    gross: Math.round(originalPrice),
                    displayPrice: discountedPrice,
                    isDiscount: true,
                    discountRate: discountRate // Return it as a percentage
                };
            }
        }

        // If no discount applies
        return {
            gross: Math.round(originalPrice),
            displayPrice: Math.round(originalPrice),
            isDiscount: false
        };

    }

    validateBasePrice() {
        let i = 0;
        this.actualTravellerData.forEach(traveller => {

            const calculatedPrice = this.expectedTravellerData[i].price;
            const expectedPrice = this.calculateDiscountedPrice(calculatedPrice.gross)
            const actualPrice = traveller.additionalCoverAddons[0].price;
            if (isNaN(this.childChargeRateValue)) {
                throw new Error(`Child charge rate is unidentified or not a number`);
            }
            let { expectedGrossPrice } = this.getExpectedPrices(expectedPrice, traveller);
            this.validatePrice(expectedGrossPrice, actualPrice, 'Base', 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualPrice.displayPrice, 'Base', 'Display Price', traveller);
            i = i + 1;
        });
    }

    getExpectedPrices(expectedPrice, traveller) {
        if (traveller.treatAsAdult == false && this.childChargeRateValue !== 1) {
            const adjustedGrossPrice = parseFloat((expectedPrice.gross * this.childChargeRateValue).toFixed(2));
            const adjustedDisplayPrice = parseFloat((expectedPrice.displayPrice * this.childChargeRateValue).toFixed(2));
            return { expectedGrossPrice: adjustedGrossPrice, expectedDisplayPrice: adjustedDisplayPrice };
        } else {
            return { expectedGrossPrice: expectedPrice.gross, expectedDisplayPrice: expectedPrice.displayPrice };
        }
    }
    validatePrice(expected, actual, cover, priceType, traveller) {
        expect(expected === actual, this.createValidationMessage(expected, actual, cover, traveller.treatAsAdult === true, priceType)).toBeTruthy();
        expect(this.createValidationMessage(expected, actual, cover, traveller.treatAsAdult === true, priceType)).toBeTruthy();
    }


    validateEMCPrice() {
        this.actualTravellerData.forEach(traveller => {
            if (traveller.identifier == 'adult1') {
                const calculatedEMCPrice = this.expectedTravellerData[traveller.identifier].emcPrice;
                const expectedEMCPrices = this.calculateDiscountedPrice(calculatedEMCPrice.displayPrice)
                const actualEMCPrices = traveller.emcPrice;
                expect(expectedEMCPrices.gross === actualEMCPrices.gross, this.createValidationMessage(expectedEMCPrices.gross, actualEMCPrices.gross, 'EMC', traveller?.identifier, 'Gross Price')).toBeTruthy();
                expect(expectedEMCPrices.displayPrice === actualEMCPrices.displayPrice, this.createValidationMessage(expectedEMCPrices.displayPrice, actualEMCPrices.displayPrice, "EMC", traveller?.identifier, 'Display Price')).toBeTruthy();
            }
        });
    }

    validateTravellerAddOns() {
        this.actualTravellerData.forEach(traveller => {
            const expectedAdditionalsCovers = this.expectedTravellerData[0].additionalCoverAddons;
            this.validatedAdditionalCoverage(expectedAdditionalsCovers, traveller.additionalCoverAddons, traveller)
        });
    }

    validatedAdditionalCoverage(expectedAdditionalCoverages = this.expectedAdditionalCoverage, actualAdditionalCoverage = this.actualAdditionalCoverage, traveller = null) {
        expectedAdditionalCoverages.forEach(additionalCoverAddon => {
            const actualCover = this.validateTheAddOnsPrice(actualAdditionalCoverage, additionalCoverAddon);
            const actualCoverPrice = actualCover.price;
            const calculatedPrice = additionalCoverAddon.price;
            const expectedCoverPrice = this.calculateDiscountedPrice(calculatedPrice.displayPrice)
            const isChildTraveller = traveller?.treatAsAdult === false ?? false;
            let { expectedGrossPrice, expectedDisplayPrice } = this.getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, additionalCoverAddon.code);
            this.validatePrice(expectedGrossPrice, actualCoverPrice.gross, additionalCoverAddon.code, 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualCoverPrice.displayPrice, additionalCoverAddon.code, 'Display Price', traveller);
        });
    }

    getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, coverCode) {
        if (isChildTraveller && this.childChargeRateValue !== 1 && coverCode.includes("LUGG")) {
            const adjustedGrossPrice = parseFloat((expectedCoverPrice.gross * this.childChargeRateValue).toFixed(2));
            const adjustedDisplayPrice = parseFloat((expectedCoverPrice.displayPrice * this.childChargeRateValue).toFixed(2));
            return { expectedGrossPrice: adjustedGrossPrice, expectedDisplayPrice: adjustedDisplayPrice };
        }
        // Return the original prices if no adjustment is needed
        return { expectedGrossPrice: expectedCoverPrice.gross, expectedDisplayPrice: expectedCoverPrice.displayPrice };
    }

    validateTheAddOnsPrice(itemsArray, itemToMatch) {
        return itemsArray.find(item => item.code === itemToMatch.code);
    }

    createValidationMessage = (priceType, expected, actual) => {
        return `${priceType} has been matched: expected ${expected}, got ${actual}.`;
    };
    createValidationMessageForAddOns = (addon, expected, actual) => {
        return `${addon} Expected price is ${expected}, got ${actual}.`;
    };

    createValidationMessageForGetQuote = (expected, actual, productCode, name) => {

        return `Product ${productCode} and planName ${name} have total gross : expected ${expected}, got ${actual}.`;
    };

    validateTotalGrossPremium(expectedPriceData = this.expectedPriceData, actualPriceData = this.actualPriceData) {
        let totalGrossPremiumFromActual = actualPriceData.products[0].premiumMatrix[0].totalGrossPremium;
        let totalGrossPremiumFromExpected;
        let expectedPrice = [];
        let i = 0;
        expectedPriceData.travellers.forEach(traveller => {
            //base price add to array
            if (traveller.age >= 18) {
                expectedPrice.push(traveller.price.gross);
            }
            //EMC price add to array
            if (traveller.emcPrice) {
                expectedPrice.push(traveller.emcPrice[0].gross);
                console.log("Check traveller Cover code EMC and cover price " + traveller.emcPrice[0].gross);
                console.log("Check traveller Cover code actual  EMC and cover price " + actualPriceData.travellers[0].emc.price);
                expect(traveller.emcPrice[0].gross === actualPriceData.travellers[0].emc.price, this.createValidationMessageForAddOns("EMC", traveller.emcPrice[0].gross, actualPriceData.travellers[0].emc.price)).toBeTruthy();
            }
            //Cover price add to array
            if (traveller.additionalCoverAddons) {
                console.log("Check travaler Cover Expected " + traveller.additionalCoverAddons[0].code + " and cover price " + traveller.additionalCoverAddons[0].price.gross);
                console.log("Check travaler Cover Actual" + actualPriceData.travellers[i].additionalCoverAddons[0].code + " and cover price " + actualPriceData.travellers[i].additionalCoverAddons[0].price);
                expect(traveller.additionalCoverAddons[0].price.gross === actualPriceData.travellers[i].additionalCoverAddons[0].price, this.createValidationMessageForAddOns(`LUGG for traveller ${i + 1}`, traveller.additionalCoverAddons[0].price.gross, actualPriceData.travellers[i].additionalCoverAddons[0].price)).toBeTruthy();
                expectedPrice.push(traveller.additionalCoverAddons[0].price.gross);
            }
            i = i + 1;
        });
        let wntsByAge = 0;
        let crsByAge = 0;
        expectedPriceData.additionalCoverAddons.forEach(additionalCover => {

            actualPriceData.products[0].additionalCoverAddons.forEach(actualCover => {

                if (additionalCover.code == actualCover.code) {
                    if (additionalCover.code == "WNTS") {
                        if (additionalCover.age <= 17) {
                            wntsByAge = wntsByAge + parseInt(additionalCover.price.gross * this.childChargeRateValue);

                        } else {
                            wntsByAge = wntsByAge + parseInt(additionalCover.price.gross);
                        }

                    } else if (additionalCover.code == "CRS") {
                        if (additionalCover.age <= 17) {
                            crsByAge = crsByAge + parseInt(additionalCover.price.gross * this.childChargeRateValue);

                        } else {
                            crsByAge = crsByAge + parseInt(additionalCover.price.gross);
                        }

                    } else {
                        console.log("Check additional Cover code " + additionalCover.code + " and cover price " + additionalCover.price.gross);
                        console.log("Check additional Cover code actual  " + actualCover.code + " and cover price " + actualCover.price);

                        expect(additionalCover.price.gross === actualCover.price, this.createValidationMessageForAddOns(additionalCover.code, additionalCover.price.gross, actualCover.price)).toBeTruthy();

                        expectedPrice.push(additionalCover.price.gross);
                    }

                }

            });


        });
        actualPriceData.products[0].additionalCoverAddons.forEach(actualCover => {
            if (actualCover.code == "WNTS") {
                console.log("Check additional Cover code WNTS and cover price " + wntsByAge);
                console.log("Check additional Cover code actual  " + actualCover.code + " and cover price " + actualCover.price);

                expect(wntsByAge === actualCover.price, this.createValidationMessageForAddOns(actualCover.code, wntsByAge, actualCover.price)).toBeTruthy();

                expectedPrice.push(wntsByAge);
            } else if (actualCover.code == "CRS") {
                console.log("Check additional Cover code CRS and cover price " + crsByAge);
                console.log("Check additional Cover code actual  " + actualCover.code + " and cover price " + actualCover.price);

                expect(crsByAge === actualCover.price, this.createValidationMessageForAddOns(actualCover.code, crsByAge, actualCover.price)).toBeTruthy();
                expectedPrice.push(crsByAge);
            }


        });

        totalGrossPremiumFromExpected = expectedPrice.reduce((partialSum, a) => partialSum + a, 0);
        if (this.addons != "OnlyEMC") {
            expect(Math.trunc(totalGrossPremiumFromActual) === totalGrossPremiumFromExpected, this.createValidationMessage("Total Gross Premium", totalGrossPremiumFromExpected, Math.trunc(totalGrossPremiumFromActual))).toBeTruthy();
        }
    }

    validateTotalGrossPremiumForGetQuote(expectedPriceData = this.expectedPriceData, actualPriceData = this.actualPriceData) {
        let totalGrossPremiumFromExpected = [];
        let expectedPrice = [];
        expectedPriceData.product.forEach(product => {
            let travelarBasePrice = [];
            let addonsPrice = [];
            product.travellers.forEach(traveller => {
                if (traveller.age >= 18) {
                    travelarBasePrice.push(traveller.price.gross);

                }
            });
            addonsPrice = product.travellers[0].additionalCoverAddons[0].price.gross;
            travelarBasePrice.push(addonsPrice);
            expectedPrice.push(travelarBasePrice);
        });
        expectedPrice.forEach(index => {
            totalGrossPremiumFromExpected.push(index.reduce((partialSum, a) => partialSum + a, 0));
        });
        let actualTotalGross = [];
        let i = 0;
        actualPriceData.products.forEach(product => {
            product.premiumMatrix.forEach(matrix => {
                if (matrix.isSelected) {
                    actualTotalGross.push(matrix.totalGrossPremium);
                    expect(Math.trunc(matrix.totalGrossPremium) === totalGrossPremiumFromExpected[i], this.createValidationMessageForGetQuote(totalGrossPremiumFromExpected[i], Math.trunc(matrix.totalGrossPremium), product.productCode, product.name)).toBeTruthy();
                }
            });
            i = i + 1;
        });

    }

}