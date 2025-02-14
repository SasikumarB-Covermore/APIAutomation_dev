import { expect } from '@playwright/test'
export class PriceValidator {
    constructor(expectedCalcPrices, apiResponsePrices, discount=0, childChargeRate=1) {
        this.expectedPriceData = expectedCalcPrices;
        this.actualPriceData = apiResponsePrices;
        this.expectedAdditionalCoverage = expectedCalcPrices.additionalCoverPrices
        this.actualAdditionalCoverage = apiResponsePrices.additionalCoverPrices
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
        this.actualTravellerData.forEach(traveller => {      
            const calculatedPrice = this.expectedTravellerData[traveller.identifier].price;
            const expectedPrice = this.calculateDiscountedPrice(calculatedPrice.gross)
            const actualPrice = traveller.price;
            if (isNaN(this.childChargeRateValue)) {
                throw new Error(`Child charge rate is unidentified or not a number`);
            }
            let { expectedGrossPrice, expectedDisplayPrice } = this.getExpectedPrices(expectedPrice, traveller);
            this.validatePrice(expectedGrossPrice, actualPrice.gross, 'Base', 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualPrice.displayPrice, 'Base', 'Display Price', traveller);
        });
    }

    getExpectedPrices(expectedPrice, traveller) {
        if (traveller.identifier.includes("child") && this.childChargeRateValue !== 1) {
            const adjustedGrossPrice = parseFloat((expectedPrice.gross * this.childChargeRateValue).toFixed(2));
            const adjustedDisplayPrice = parseFloat((expectedPrice.displayPrice * this.childChargeRateValue).toFixed(2));
            return { expectedGrossPrice: adjustedGrossPrice, expectedDisplayPrice: adjustedDisplayPrice };
        } else {
            return { expectedGrossPrice: expectedPrice.gross, expectedDisplayPrice: expectedPrice.displayPrice };
        }
    }
    validatePrice(expected, actual, cover, priceType,traveller){
        expect(expected === actual, this.createValidationMessage(expected,actual,cover,traveller?.identifier, priceType)).toBeTruthy();
    }


    validateEMCPrice() {
        this.actualTravellerData.forEach(traveller => {
            if (traveller.identifier == 'adult1'){
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
            const expectedAdditionalsCovers = this.expectedTravellerData[traveller.identifier].additionalCoversPrice;
            this.validatedAdditionalCoverage(expectedAdditionalsCovers,traveller.additionalCoverPrices,traveller)
        });
    }

    validatedAdditionalCoverage(expectedAdditionalCoverage = this.expectedAdditionalCoverage,actualAdditionalCoverage=this.actualAdditionalCoverage,traveller=null) {
        expectedAdditionalCoverage.forEach(cover => {
            const actualCover = this.validateTheAddOnsPrice(actualAdditionalCoverage, cover);
            const actualCoverPrice = actualCover.price
            const calculatedPrice = cover.price;
            const expectedCoverPrice = this.calculateDiscountedPrice(calculatedPrice.displayPrice)
            const isChildTraveller = traveller?.identifier.includes("child") ?? false;
            let { expectedGrossPrice, expectedDisplayPrice } = this.getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, cover.code);
            this.validatePrice(expectedGrossPrice, actualCoverPrice.gross, cover.code, 'Gross Price', traveller);
            this.validatePrice(expectedDisplayPrice, actualCoverPrice.displayPrice, cover.code, 'Display Price', traveller);

        });
    }

    getExpectedPricesForCover(expectedCoverPrice, isChildTraveller, coverCode) {
        if (isChildTraveller && this.childChargeRateValue !== 1 && !coverCode.includes("LUGG")) {
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

    createValidationMessage = (expected, actual, coverCode, identifier, priceType) => {
        const identifierPart = identifier ? ` for ${identifier}` : '';
        const coverPart = coverCode ? ` of ${coverCode}` : '';
        return `${priceType}${coverPart}${identifierPart} has been matched: expected ${expected}, got ${actual}.`;
    };
}
