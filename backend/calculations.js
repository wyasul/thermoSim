/**
 * Calculates an approximation of solar irradiance for a given hour and cloud cover.
 * 
 * This function uses a simplified model to estimate solar irradiance:
 * 1. It assumes fixed sunrise and sunset times (6 AM and 6 PM respectively).
 * 2. It models solar energy using a cosine wave, peaking at noon.
 * 3. It applies a simple linear reduction based on cloud cover.
 * 
 * Note: This is a basic approximation and does not account for factors such as:
 * - Seasonal variations in daylight hours
 * - Geographical location (latitude/longitude)
 * - Atmospheric conditions beyond cloud cover
 * - Diffuse vs. direct radiation
 * 
 * @param {number} hour - The hour of the day (0-23).
 * @param {number} cloudCover - The cloud cover percentage (0-1), default is 0.
 * @returns {number} The approximate solar irradiance in MJ/m²/hour.
 */

const getSolarIrradiance = (hour, cloudCover = 0) => {
    const sunrise = 6; // 6 AM
    const sunset = 18; // 6 PM
    const peakIrradiance = 1000; // Maximum solar irradiance in watts per square meter

    // No solar energy available before sunrise or after sunset
    if (hour < sunrise || hour > sunset) {
        return 0;
    }

    // Cosine wave to model solar energy peaking at noon
    const angle = Math.PI * (hour - sunrise) / (sunset - sunrise);
    const irradiance = peakIrradiance * Math.cos(angle - Math.PI / 2) ** 2;

    // Adjust irradiance based on cloud cover and convert from W/m² to MJ/m²/hour
    return irradiance * (1 - cloudCover) * 0.0036;
};

/**
 * Calculates the useful energy gain of a solar panel.
 * 
 * This function uses the Hottel-Whillier-Bliss equation to estimate the useful energy gain
 * of a solar panel, taking into account various factors such as solar irradiance, panel efficiency,
 * and heat loss.
 * 
 * @param {number} hour - The hour of the day (0-23). User input.
 * @param {number} area - The area of the solar panel in m². User input.
 * @param {number} mass_flow_rate - The mass flow rate of the fluid in kg/s. User input.
 * @param {number} efficiency - The efficiency of the solar panel (0-1). User input.
 * @param {number} cloudCover - The cloud cover percentage (0-1). User input.
 * @param {number} specificHeat - The specific heat of the fluid in J/(kg·K). User input.
 * @param {number} T_ambient - The ambient temperature in °C, default is 15°C. User input.
 * @param {number} T_plate - The initial plate temperature in °C, default is 20°C. User input.
 * @param {number} U_L - The overall heat loss coefficient in W/(m²·K), default is 8. Assumed to be independent of temperature. User input.
 * 
 * @returns {Object} An object containing:
 *   - q_u: The useful energy gain per unit area in MJ/(m²·h).
 *   - F_R: The heat removal factor.
 *   - F_prime_prime: The collector flow factor.
 */
const calculatePanelUsefulEnergyGain = (hour, area, mass_flow_rate, efficiency, cloudCover, specificHeat, T_ambient=15,T_plate, transmittance, absorptance, U_L=8) => {
    // console.log(T_plate)
    // Hottel-Whillier-Bliss: Qu=Ac[S−UL(Tplate−Tambient)]
    const F_prime = efficiency; // Plate efficiency factor, user input

    // Capacitance rate calculated according to mC/A(U_L)F'
    const capacitance_rate = (mass_flow_rate * specificHeat)/(area * U_L * F_prime);

    // F'' - collector flow factor
    F_prime_prime = capacitance_rate * (1 - Math.exp(-1 / capacitance_rate));

    // F_R - Heat removal factor according to F'(F'')
    F_R = F_prime_prime * F_prime;
    
    const solarIrradiance = getSolarIrradiance(hour, cloudCover)

    // Average loss rate in MJ/(m²·h).
    const U_L_Temp_Quotient = U_L * (T_plate - T_ambient) * 3600 / 1000000

    // Useful energy gain in MJ/(m²·h).
    const Q_u = F_R * area * ((solarIrradiance*transmittance*absorptance) - U_L_Temp_Quotient);
    
    // Average useful energy gain per unit area
    const q_u = Q_u / area;
    // Log all variables with labels
    console.log('Hour:', hour);
    console.log('Area:', area, 'm²');
    console.log('Mass Flow Rate:', mass_flow_rate, 'kg/s');
    console.log('Efficiency:', efficiency);
    console.log('Cloud Cover:', cloudCover);
    console.log('Specific Heat:', specificHeat, 'J/(kg·K)');
    console.log('Ambient Temperature:', T_ambient, '°C');
    console.log('Plate Temperature:', T_plate, '°C');
    console.log('Transmittance:', transmittance);
    console.log('Absorptance:', absorptance);
    console.log('Overall Heat Loss Coefficient:', U_L, 'W/(m²·K)');
    console.log('F_prime:', F_prime);
    console.log('Capacitance Rate:', capacitance_rate);
    console.log('F_prime_prime:', F_prime_prime);
    console.log('F_R:', F_R);
    console.log('Solar Irradiance:', solarIrradiance, 'MJ/(m²·h)');
    console.log('U_L_Temp_Quotient:', U_L_Temp_Quotient, 'MJ/(m²·h)');
    console.log('Q_u:', Q_u, 'MJ/h');
    console.log('q_u:', q_u, 'MJ/(m²·h)');

    return {q_u: q_u, F_R: F_R, F_prime_prime: F_prime_prime}
};

/**
 * Calculates the heat transfer to the fluid and the resulting temperatures in a solar panel.
 * 
 * This function uses the results from the useful energy gain calculation to determine
 * the mean fluid temperature (T_fm) and the plate temperature (T_plate) in the solar panel.
 * 
 * @param {Object} solarPanelVars - An object containing solar panel variables:
 *   @param {number} q_u - The useful energy gain per unit area in MJ/(m²·h).
 *   @param {number} F_R - The heat removal factor.
 *   @param {number} F_prime_prime - The collector flow factor.
 * @param {number} currentTemperature - The current temperature of the system in °C.
 * @param {number} U_L - The overall heat loss coefficient in W/(m²·K), default is 8.
 * 
 * @returns {Object} An object containing:
 *   - T_fm: The mean fluid temperature in °C.
 *   - T_plate: The plate temperature in °C.
 */
const calculateHeatTransferToFluid = (solarPanelVars, currentFluidTemp, U_L=8) => {
    const {q_u, F_R, F_prime_prime} = solarPanelVars;

    // Equation 6.9.4 in Duffie & Beckman
    let T_fluid = currentFluidTemp + ((q_u) / (F_R * U_L)) * (1 - F_prime_prime);
    let T_plate = currentFluidTemp + ((q_u) / (F_R * U_L)) * (1 - F_R);

    return {T_fluid, T_plate};
};


/**
 * Simulates the temperature changes in a solar panel system over a specified duration.
 * 
 * This function models the temperature evolution of a solar panel system, taking into account
 * various parameters such as panel area, efficiency, ambient conditions, and fluid properties.
 * It uses the calculatePanelUsefulEnergyGain and calculateHeatTransferToFluid functions to
 * compute temperature changes at each time step.
 * 
 * @param {Object} params - An object containing simulation parameters:
 *   @param {number} area - The area of the solar panel in m².
 *   @param {number} efficiency - The efficiency of the solar panel (0-1).
 *   @param {number} hour - The starting hour of the simulation (0-23).
 *   @param {number} duration - The duration of the simulation in hours.
 *   @param {number} timeStep - The time step for the simulation (not currently used).
 *   @param {number} T_ambient - The ambient temperature in °C.
 *   @param {number} startPlateTemp - The initial temperature of the plate in °C.
 *   @param {number} cloudCover - The cloud cover percentage (0-1).
 *   @param {number} specificHeat - The specific heat of the fluid in J/(kg·K).
 *   @param {number} mass_flow_rate - The mass flow rate of the fluid in kg/s.
 *   @param {number} pumpPower - The power of the pump (not currently used).
 * 
 * @returns {Array} An array of objects, each containing:
 *   - time: The hour of the day (0-23).
 *   - temp: The fluid temperature at that hour in °C.
 */
const simulateTemperature = (params) => {
    const {
        area, efficiency, hour, duration, timeStep,
        T_ambient, cloudCover, specificHeat, mass_flow_rate, pumpPower, startFluidTemp, transmittance, absorptance
    } = params;

    let temperatures = [];
    let currentFluidTemp = startFluidTemp;
    let currentPlateTemp = startFluidTemp;

    for (let step = 0; step < duration; step++) {
        const currentHour = (hour + step) % 24;  // Handle wrap-around for 24-hour clock
        console.log(currentPlateTemp)
        
        const solarPanelVars = calculatePanelUsefulEnergyGain(currentHour, area, mass_flow_rate, efficiency, cloudCover, specificHeat, T_ambient, currentPlateTemp, transmittance, absorptance);
        
        let updatedTemps = calculateHeatTransferToFluid(solarPanelVars, currentFluidTemp, U_L=8);
        currentFluidTemp = updatedTemps.T_fluid;  // Update fluid temperature for the next hour
        currentPlateTemp = updatedTemps.T_plate;  // Update plate temperature for the next hour

        temperatures.push({ time: currentHour, temp: currentFluidTemp });
    }

    return temperatures;
};


module.exports = {
    simulateTemperature,
    calculatePanelUsefulEnergyGain,
    calculateHeatTransferToFluid,
    getSolarIrradiance
};
