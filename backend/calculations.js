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
 * @param {number} efficiency - The efficiency of the solar panel (0-1). User input.
 * @param {number} cloudCover - The cloud cover percentage (0-1). User input.
 * @param {number} specificHeat - The specific heat of the fluid in J/(kg·K). User input.
 * @param {number} T_ambient - The ambient temperature in °C, default is 15°C. User input.
 * @param {number} T_plate - The initial plate temperature in °C, default is 20°C. User input.
 * @param {number} U_L - The overall heat loss coefficient in W/(m²·K), default is 8. Assumed to be independent of temperature. User input.
 * @param {number} pumpPower - The power of the pump.
 * @param {number} hydraulicHead - The hydraulic head, default is 5.
 * @param {number} pumpEfficiency - The pump efficiency, default is 0.7.
 * 
 * @returns {Object} An object containing:
 *   - q_u: The useful energy gain per unit area in MJ/(m²·h).
 *   - F_R: The heat removal factor.
 *   - F_prime_prime: The collector flow factor.
 */
const calculatePanelUsefulEnergyGain = (hour, area, efficiency, cloudCover, specificHeat, T_ambient=15, T_plate, transmittance, absorptance, U_L=8, pumpPower, hydraulicHead = 5, pumpEfficiency = 0.7) => {
    const density = 1000; // Density of water in kg/m³
    const gravity = 9.81; // Acceleration due to gravity in m/s²

    // Calculate mass flow rate
    const volumetricFlowRate = (pumpPower * pumpEfficiency) / (hydraulicHead * gravity * density); // m³/s
    const mass_flow_rate = volumetricFlowRate * density; // kg/s

    // Hottel-Whillier-Bliss: Qu=Ac[S−UL(Tplate−Tambient)]
    const F_prime = efficiency; // Plate efficiency factor, user input

    let F_R, F_prime_prime;

    if (mass_flow_rate > 0) {
        // Capacitance rate calculated according to mC/A(U_L)F'
        const capacitance_rate = (mass_flow_rate * specificHeat)/(area * U_L * F_prime);

        // F'' - collector flow factor
        F_prime_prime = capacitance_rate * (1 - Math.exp(-1 / capacitance_rate));

        // F_R - Heat removal factor according to F'(F'')
        F_R = F_prime_prime * F_prime;
    } else {
        // When there's no flow, F_R approaches 0
        F_R = 0;
        F_prime_prime = 0;
    }
    
    const solarIrradiance = getSolarIrradiance(hour, cloudCover)

    // Average loss rate in MJ/(m²·h).
    const U_L_Temp_Quotient = U_L * (T_plate - T_ambient) * 3600 / 1000000

    // Useful energy gain in MJ/(m²·h).
    const Q_u = F_R * area * ((solarIrradiance*transmittance*absorptance) - U_L_Temp_Quotient);
    
    // Average useful energy gain per unit area
    const q_u = Q_u / area;

    return {q_u: q_u, F_R: F_R, F_prime_prime: F_prime_prime}
};

const calculateHeatTransferToTank = (fluidTemp, tankTemp, tankVolume, specificHeat, timeStep, pumpPower, hydraulicHead = 5, pumpEfficiency = 0.7) => {
    const density = 1000; // Density of water in kg/m³ (approximately for water at room temperature)
    const gravity = 9.81; // Acceleration due to gravity in m/s²

    // Calculate the effective mass flow rate using pump power
    const calculatedMassFlowRate = (pumpPower * pumpEfficiency) / (hydraulicHead * gravity * density); // m³/s
    var massFlowRate = calculatedMassFlowRate * density; // Converting m³/s to kg/s by multiplying with the density of water

    // Calculate the rate of heat transfer (Q = m * c_p * ΔT)
    const heatTransferRate = massFlowRate * specificHeat * (fluidTemp - tankTemp); // Joules/s or Watts

    // Calculate the thermal capacity of the tank's volume
    const thermalCapacity = tankVolume * density * specificHeat; // J/°C

    // Calculate temperature change in the tank over the time step
    const tankTempChange = (heatTransferRate * timeStep) / thermalCapacity; // °C

    // New tank temperature after time step
    const newTankTemp = tankTemp + tankTempChange;

    // Debugging logs to track values
    console.log(fluidTemp)
    console.log('Time step: ', timeStep)
    console.log('Pump power: ', pumpPower)
    console.log(`Calculated Mass Flow Rate: ${calculatedMassFlowRate.toFixed(6)} m³/s`);
    console.log(`Effective Mass Flow Rate: ${massFlowRate.toFixed(2)} kg/s`);
    console.log(`Heat Transfer Rate: ${heatTransferRate.toFixed(2)} Watts`);
    console.log(`Tank Thermal Capacity: ${thermalCapacity.toFixed(2)} J/°C`);
    console.log(`Tank Temp Change: ${tankTempChange.toFixed(2)} °C`);
    console.log(`Initial Tank Temp: ${tankTemp.toFixed(2)} °C`);
    console.log(`New Tank Temp: ${newTankTemp.toFixed(2)} °C`);

    return newTankTemp; // Return the new temperature of the tank
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

    if (F_R === 0) {
        // When F_R is 0, no heat is being removed from the collector
        // The fluid temperature remains unchanged
        // The plate temperature will increase based on the useful energy gain
        let T_fluid = currentFluidTemp;
        let T_plate = currentFluidTemp + (q_u / U_L);

        return {T_fluid, T_plate};
    } else {
        // Equation 6.9.4 in Duffie & Beckman
        let T_fluid = currentFluidTemp + ((q_u) / (F_R * U_L)) * (1 - F_prime_prime);
        let T_plate = currentFluidTemp + ((q_u) / (F_R * U_L)) * (1 - F_R);

        return {T_fluid, T_plate};
    }
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
 *   @param {number} pumpPower - The power of the pump.
 *   @param {number} hydraulicHead - The hydraulic head, default is 5.
 *   @param {number} pumpEfficiency - The pump efficiency, default is 0.7.
 *   @param {number} startFluidTemp - The initial temperature of the fluid in °C.
 *   @param {number} transmittance - The transmittance of the cover plate.
 *   @param {number} absorptance - The absorptance of the plate.
 *   @param {number} tankVolume - The volume of the tank in m³.
 *   @param {number} tankTemp - The initial temperature of the tank in °C.
 * 
 * @returns {Array} An array of objects, each containing:
 *   - time: The hour of the day (0-23).
 *   - temp: The fluid temperature at that hour in °C.
 */
const simulateTemperature = (params) => {
    var {
        area, efficiency, hour, duration, timeStep,
        T_ambient, cloudCover, specificHeat, pumpPower, startFluidTemp, transmittance, absorptance, tankVolume, tankTemp
    } = params;

    let temperatures = [];
    let currentFluidTemp = startFluidTemp;
    let currentPlateTemp = startFluidTemp;
    let currentTankTemp = tankTemp;
    for (let step = 0; step < duration; step++) {
        const currentHour = (hour + step) % 24;  // Handle wrap-around for 24-hour clock
        
        const solarPanelVars = calculatePanelUsefulEnergyGain(currentHour, area, efficiency, cloudCover, specificHeat, T_ambient, currentPlateTemp, transmittance, absorptance, U_L=8, pumpPower, hydraulicHead = 5, pumpEfficiency = 0.7);
        
        let updatedTemps = calculateHeatTransferToFluid(solarPanelVars, currentFluidTemp, U_L=8);
        currentFluidTemp = updatedTemps.T_fluid;  // Update fluid temperature for the next hour
        currentPlateTemp = updatedTemps.T_plate;  // Update plate temperature for the next hour

        currentTankTemp = calculateHeatTransferToTank(currentFluidTemp, currentTankTemp, tankVolume, specificHeat, timeStep, pumpPower, hydraulicHead = 5, pumpEfficiency = 0.7);


        temperatures.push({ time: currentHour, temp: currentFluidTemp, tankTemp: currentTankTemp});
    }

    return temperatures;
};


module.exports = {
    simulateTemperature,
    calculatePanelUsefulEnergyGain,
    calculateHeatTransferToFluid,
    getSolarIrradiance
};