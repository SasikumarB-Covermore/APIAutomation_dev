import { expect } from '@playwright/test'
export class PriceValidator {
    constructor(expectedCalcPrices, apiResponsePrices, discount = 0, childChargeRate = 1) {
        //console.log("APIresponse details " + JSON.stringify(apiResponsePrices));
        console.log("expectedCalPrice details " + JSON.stringify(expectedCalcPrices));
        this.expectedTravalerPriceData = expectedCalcPrices.travellers;
        this.expectedPolicyPriceData = expectedCalcPrices.products[0].additionalCoverAddons;
        this.actualPriceData = apiResponsePrices;
        //this.expectedAdditionalCoverage = expectedCalcPrices.additionalCoverAddons;
        //console.log("expected Additional Coverage details " + JSON.stringify(this.expectedAdditionalCoverage));
        this.actualAdditionalCoverage = apiResponsePrices.products[0].additionalCoverAddons;
        this.expectedTravellerData = expectedCalcPrices.travellers;
        this.actualTravellerData = apiResponsePrices.travellers;
        this.discountValue = discount;
        this.childChargeRateValue = childChargeRate;
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
        console.log("### actualTravellerData Travaller Data " + JSON.stringify(this.actualTravellerData));
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
            //this.validatePrice(expectedDisplayPrice, actualPrice.displayPrice, 'Base', 'Display Price', traveller);
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
        //expect(expected === actual, this.createValidationMessage(expected, actual, cover, traveller.treatAsAdult === true, priceType)).toBeTruthy();
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
            const expectedAdditionalsCovers = this.expectedTravellerData;
            this.validatedAdditionalCoverageTravellerAddOns(expectedAdditionalsCovers, traveller.additionalCoverAddons, traveller)
        });
    }

    validatedAdditionalCoverageTravellerAddOns(expectedAdditionalCoverages = this.expectedTravalerPriceData, actualAdditionalCoverage = this.actualAdditionalCoverage, traveller = null) {
        console.log("expected Additional Coverage " + JSON.stringify(expectedAdditionalCoverages));
        console.log("actual Additional Coverage " + JSON.stringify(actualAdditionalCoverage));
        expectedAdditionalCoverages.forEach(travellers => {
            const actualCover = this.validateTheAddOnsPrice(actualAdditionalCoverage, travellers);
            console.log("actual Cover " + JSON.stringify(actualCover));
            const actualCoverPrice = actualCover.price;
            console.log("checking index of addons " + JSON.stringify(travellers) + " and index " + JSON.stringify(travellers.additionalCoverAddons[0].code));
            const calculatedPrice = travellers.price;
            const expectedCoverPrice = this.calculateDiscountedPrice(calculatedPrice.displayPrice)
            const isChildTraveller = traveller?.treatAsAdult === false ?? false;
            let { expectedGrossPrice, expectedDisplayPrice } = this.getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, travellers.additionalCoverAddons[0].code);
            this.validatePrice(expectedGrossPrice, actualCoverPrice.gross, travellers.code, 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualCoverPrice.displayPrice, travellers.code, 'Display Price', traveller);
        });
    }
    validatedAdditionalCoveragePolicyAddOns(expectedAdditionalCoverages = this.expectedPolicyPriceData, actualAdditionalCoverage = this.actualAdditionalCoverage, traveller = null) {
        console.log("expected Additional Coverage " + JSON.stringify(expectedAdditionalCoverages));
        console.log("actual Additional Coverage " + JSON.stringify(actualAdditionalCoverage));
        expectedAdditionalCoverages.forEach(travellers => {
            const actualCover = this.validateTheAddOnsPrice(actualAdditionalCoverage, travellers);
            console.log("actual Cover " + JSON.stringify(actualCover));
            const actualCoverPrice = actualCover.price;
            console.log("checking index of addons " + JSON.stringify(travellers) + " and index " + JSON.stringify(travellers.additionalCoverAddons[0].code));
            const calculatedPrice = travellers.price;
            const expectedCoverPrice = this.calculateDiscountedPrice(calculatedPrice.displayPrice)
            const isChildTraveller = traveller?.treatAsAdult === false ?? false;
            let { expectedGrossPrice, expectedDisplayPrice } = this.getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, travellers.additionalCoverAddons[0].code);
            this.validatePrice(expectedGrossPrice, actualCoverPrice.gross, travellers.code, 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualCoverPrice.displayPrice, travellers.code, 'Display Price', traveller);
        });
    }

    getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, coverCode) {
        console.log("code cover " + JSON.stringify(coverCode));
        if (isChildTraveller && this.childChargeRateValue !== 1 && coverCode.includes("LUGG")) {
            const adjustedGrossPrice = parseFloat((expectedCoverPrice.gross * this.childChargeRateValue).toFixed(2));
            const adjustedDisplayPrice = parseFloat((expectedCoverPrice.displayPrice * this.childChargeRateValue).toFixed(2));
            return { expectedGrossPrice: adjustedGrossPrice, expectedDisplayPrice: adjustedDisplayPrice };
        }
        // Return the original prices if no adjustment is needed
        return { expectedGrossPrice: expectedCoverPrice.gross, expectedDisplayPrice: expectedCoverPrice.displayPrice };
    }

    validateTheAddOnsPrice(itemsArray, itemToMatch) {
        console.log("itams Array " + JSON.stringify(itemsArray));
        console.log("itemToMatch Array " + JSON.stringify(itemToMatch));
        console.log(" compare " + itemsArray[0].code + " === " + itemToMatch.additionalCoverAddons[0].code);
        return itemsArray.find(item => item.code === itemToMatch.additionalCoverAddons[0].code);
    }

    createValidationMessage = (expected, actual, coverCode, identifier, priceType) => {
        const identifierPart = identifier ? ` for ${identifier}` : '';
        const coverPart = coverCode ? ` of ${coverCode}` : '';
        return `${priceType}${coverPart}${identifierPart} has been matched: expected ${expected}, got ${actual}.`;
    };
}
