const {
    getSolarIrradiance,
    calculateHeatAbsorption,
    calculateHeatTransfer,
    simulateTemperature
} = require('../calculations');

describe('Solar Water Heater Calculations', () => {
    describe('getSolarIrradiance', () => {
        test('returns 0 before sunrise', () => {
            expect(getSolarIrradiance(5)).toBe(0);
        });

        test('returns 0 after sunset', () => {
            expect(getSolarIrradiance(19)).toBe(0);
        });

        test('returns maximum at noon', () => {
            expect(getSolarIrradiance(12)).toBe(1000);
        });

        test('returns positive value during daylight hours', () => {
            expect(getSolarIrradiance(9)).toBeGreaterThan(0);
            expect(getSolarIrradiance(9)).toBeLessThan(1000);
        });
    });

    describe('calculateHeatAbsorption', () => {
        test('calculates heat absorption correctly', () => {
            const hour = 12;
            const area = 2;
            const efficiency = 0.8;
            const expectedHeatAbsorption = getSolarIrradiance(hour) * area * efficiency;
            expect(calculateHeatAbsorption(hour, area, efficiency)).toBe(expectedHeatAbsorption);
        });
    });

    describe('calculateHeatTransfer', () => {
        test('calculates heat transfer correctly', () => {
            const heatAbsorbed = 1000;
            const mass = 100;
            const specificHeat = 4186;
            const currentTemp = 68; // Fahrenheit
            const ambientTemp = 77; // Fahrenheit
            const expectedFinalTemp = calculateHeatTransfer(heatAbsorbed, mass, specificHeat, currentTemp, ambientTemp);
            expect(expectedFinalTemp).toBeCloseTo(83.52809364548495, 2); // Example expected value, adjust as needed
        });
    });

    describe('simulateTemperature', () => {
        test('simulates temperature changes over 24 hours', () => {
            const params = {
                area: 2,
                efficiency: 0.8,
                mass: 100,
                specificHeat: 4186,
                ambientTemperature: 77, // Fahrenheit
                duration: 24
            };
            const result = simulateTemperature(params);
            expect(result).toHaveLength(24);
            expect(result[0].time).toBe(0);
            expect(result[23].time).toBe(23);
            expect(result[0].temp).toBeCloseTo(77, 2); // Assuming starting at ambient temperature in Fahrenheit
            expect(result[23].temp).toBeGreaterThan(77); // Temperature should increase over time
        });
    });
});