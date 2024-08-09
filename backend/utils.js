/**
 * Converts temperature from Fahrenheit to Celsius.
 * @param {number} tempF - Temperature in degrees Fahrenheit.
 * @returns {number} Temperature in degrees Celsius.
 */
const fahrenheitToCelsius = (tempF) => {
    return (tempF - 32) * 5 / 9;
};

/**
 * Converts temperature from Celsius to Fahrenheit.
 * @param {number} tempC - Temperature in degrees Celsius.
 * @returns {number} Temperature in degrees Fahrenheit.
 */
const celsiusToFahrenheit = (tempC) => {
    return (tempC * 9 / 5) + 32;
};

module.exports = {
    fahrenheitToCelsius,
    celsiusToFahrenheit
};
