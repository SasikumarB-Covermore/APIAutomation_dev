import { expect } from '@playwright/test'
export class PriceValidator {
    constructor(expectedCalcPrices, apiResponsePrices, discount = 0, childChargeRate = 1) {
        //console.log("APIresponse details " + JSON.stringify(apiResponsePrices));
        //console.log("expectedCalPrice details " + JSON.stringify(expectedCalcPrices));
        this.expectedPriceData = expectedCalcPrices;
        this.actualPriceData = apiResponsePrices;
        this.expectedAdditionalCoverage = expectedCalcPrices.additionalCoverAddons
        this.actualAdditionalCoverage = apiResponsePrices.products[0].additionalCoverAddons
        this.expectedTravellerData = expectedCalcPrices.travellers
        this.actualTravellerData = apiResponsePrices.travellers
        this.discountValue = discount
        this.childChargeRateValue = childChargeRate
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
        //console.log("### actualTravellerData Travaller Data " + JSON.stringify(this.actualTravellerData));
        let i = 0;
        this.actualTravellerData.forEach(traveller => {

            const calculatedPrice = this.expectedTravellerData[i].price;
            //console.log("Calculated price " + JSON.stringify(calculatedPrice));
            const expectedPrice = this.calculateDiscountedPrice(calculatedPrice.gross)
            //console.log("Actual price for traveler " + JSON.stringify(traveller));
            const actualPrice = traveller.additionalCoverAddons[0].price;
            //console.log("Actual price " + JSON.stringify(actualPrice));
            if (isNaN(this.childChargeRateValue)) {
                throw new Error(`Child charge rate is unidentified or not a number`);
            }
            //let { expectedGrossPrice, expectedDisplayPrice } = this.getExpectedPrices(expectedPrice, traveller);
            let { expectedGrossPrice } = this.getExpectedPrices(expectedPrice, traveller);
            //console.log("expected Gross Price " + expectedGrossPrice + " and actualPrice " + actualPrice);

            this.validatePrice(expectedGrossPrice, actualPrice, 'Base', 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualPrice.displayPrice, 'Base', 'Display Price', traveller);
            i = i + 1;
        });
    }

    getExpectedPrices(expectedPrice, traveller) {
        //console.log("Travaler detailes " + JSON.stringify(traveller));
        if (traveller.treatAsAdult == false && this.childChargeRateValue !== 1) {
            const adjustedGrossPrice = parseFloat((expectedPrice.gross * this.childChargeRateValue).toFixed(2));
            const adjustedDisplayPrice = parseFloat((expectedPrice.displayPrice * this.childChargeRateValue).toFixed(2));
            return { expectedGrossPrice: adjustedGrossPrice, expectedDisplayPrice: adjustedDisplayPrice };
        } else {
            return { expectedGrossPrice: expectedPrice.gross, expectedDisplayPrice: expectedPrice.displayPrice };
        }
    }
    validatePrice(expected, actual, cover, priceType, traveller) {
        //console.log("expected is " + expected + " and actual is " + actual);
        //console.log("Cover is " + JSON.stringify(cover));
        //console.log("Cover is " + JSON.stringify(priceType));
        //console.log("Cover is " + JSON.stringify(traveller));
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
            //console.log("expected Traveller Data " + JSON.stringify(this.expectedTravellerData));
            const expectedAdditionalsCovers = this.expectedTravellerData[0].additionalCoverAddons;
            this.validatedAdditionalCoverage(expectedAdditionalsCovers, traveller.additionalCoverAddons, traveller)
        });
    }

    validatedAdditionalCoverage(expectedAdditionalCoverages = this.expectedAdditionalCoverage, actualAdditionalCoverage = this.actualAdditionalCoverage, traveller = null) {
        //console.log("expected Additional Coverage " + JSON.stringify(expectedAdditionalCoverages));
        //console.log("actual Additional Coverage " + JSON.stringify(actualAdditionalCoverage));
        //console.log("travaller detail  " + JSON.stringify(traveller));
        expectedAdditionalCoverages.forEach(additionalCoverAddon => {
            //console.log("additional cover addons " + JSON.stringify(additionalCoverAddon));
            const actualCover = this.validateTheAddOnsPrice(actualAdditionalCoverage, additionalCoverAddon);
            //console.log("actual Cover " + JSON.stringify(actualCover));
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
        //console.log("code cover " + JSON.stringify(coverCode));
        if (isChildTraveller && this.childChargeRateValue !== 1 && coverCode.includes("LUGG")) {
            const adjustedGrossPrice = parseFloat((expectedCoverPrice.gross * this.childChargeRateValue).toFixed(2));
            const adjustedDisplayPrice = parseFloat((expectedCoverPrice.displayPrice * this.childChargeRateValue).toFixed(2));
            return { expectedGrossPrice: adjustedGrossPrice, expectedDisplayPrice: adjustedDisplayPrice };
        }
        // Return the original prices if no adjustment is needed
        return { expectedGrossPrice: expectedCoverPrice.gross, expectedDisplayPrice: expectedCoverPrice.displayPrice };
    }

    validateTheAddOnsPrice(itemsArray, itemToMatch) {
        //console.log("itams Array " + JSON.stringify(itemsArray));
        //console.log("itemToMatch Array " + JSON.stringify(itemToMatch));
        //console.log(" compare " + itemsArray[0].code + " === " + itemToMatch.code);
        return itemsArray.find(item => item.code === itemToMatch.code);
    }

    createValidationMessage = (expected, actual, coverCode, identifier, priceType) => {
        const identifierPart = identifier ? ` for ${identifier}` : '';
        const coverPart = coverCode ? ` of ${coverCode}` : '';
        return `${priceType}${coverPart}${identifierPart} has been matched: expected ${expected}, got ${actual}.`;
    };

    validateTotalGrossPremium(expectedPriceData = this.expectedPriceData, actualPriceData = this.actualPriceData) {
        let totalGrossPremiumFromActual = actualPriceData.products[0].premiumMatrix[0].totalGrossPremium;
        //console.log("total Gross Premium From Actual " + totalGrossPremiumFromActual);
        let totalGrossPremiumFromExpected;
        let expectedPrice = [];

        expectedPriceData.travellers.forEach(traveller => {
            //base price add to array
            if (traveller.age > 15) {
                console.log("Check travaler age " + traveller.age + " and base price " + traveller.price.gross);
                expectedPrice.push(traveller.price.gross);
            }
            //EMC price add to array
            if (traveller.emcPrice) {
                console.log("Check travaler EMC " + traveller.emcPrice + " and EMC price " + traveller.emcPrice[0].gross);
                expectedPrice.push(traveller.emcPrice[0].gross);
            }
            //Cover price add to array
            if (traveller.additionalCoverAddons) {
                console.log("Check travaler Cover " + traveller.additionalCoverAddons + " and cover price " + traveller.additionalCoverAddons[0].price.gross);
                expectedPrice.push(traveller.additionalCoverAddons[0].price.gross);
            }
        });

        expectedPriceData.additionalCoverAddons.forEach(additionalCover => {
            //Cover price add to array
            let wntsByAge;
            if (additionalCover.code == "WNTS") {
                console.log("WNTS Cover Price ");
                if (additionalCover.age <= 15) {
                    wntsByAge = additionalCover.price.gross * this.childChargeRateValue;

                } else {
                    console.log("Check additional Cover code " + additionalCover.code + " and cover price " + additionalCover.price.gross);
                    wntsByAge = additionalCover.price.gross
                }
                expectedPrice.push(wntsByAge);
            } else if (additionalCover.code == "CANX") {
                console.log("Check additional Cover code " + additionalCover.code + " and cover price " + additionalCover.price.gross);
                expectedPrice.push(additionalCover.price.gross);
            } else if (additionalCover.code == "MTCL") {
                console.log("Check additional Cover code " + additionalCover.code + " and cover price " + additionalCover.price.gross);
                expectedPrice.push(additionalCover.price.gross);
            }
        });

        //policy cover add to array
        //expectedPrice.push(expectedPriceData.additionalCoverAddons[0].price.gross);
        //CRS price add to array
        expectedPriceData.additionalCoverAddons.forEach(additionalCover => {
            let crsByAge;
            if (additionalCover.code == "CRS") {
                if (additionalCover.age <= 15) {
                    crsByAge = additionalCover.price.gross * this.childChargeRateValue;

                } else {
                    crsByAge = additionalCover.price.gross
                }
                expectedPrice.push(crsByAge);
            }
        });
        console.log("expected base price for travallers " + expectedPrice);
        totalGrossPremiumFromExpected = expectedPrice.reduce((partialSum, a) => partialSum + a, 0);
        //console.log("total Gross Premium From Expected " + totalGrossPremiumFromExpected);
        //expect(totalGrossPremiumFromActual === totalGrossPremiumFromExpected).toBeTruthy();
        expect(Math.trunc(totalGrossPremiumFromActual) === totalGrossPremiumFromExpected, this.createValidationMessage(totalGrossPremiumFromExpected, Math.trunc(totalGrossPremiumFromActual))).toBeTruthy();
        //expect(Math.trunc(totalGrossPremiumFromActual)).toBe(totalGrossPremiumFromExpected);
        //console.log("Total Gross Premium expected " + totalGrossPremiumFromExpected + ", got " + Math.trunc(totalGrossPremiumFromActual));
    }
    createValidationMessage = (expected, actual) => {
        return `Total Gross Premium expected ${expected}, got ${actual}.`;
    };
}
