const { fahrenheitToCelsius } = require('./utils');
        

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
    return irradiance * (1 - (cloudCover/100)) * 0.0036;
};

/**
 * Calculates the useful energy gain of a solar panel.
 * 
 * This function uses the Hottel-Whillier-Bliss equation to estimate the useful energy gain
 * of a solar panel, taking into account various factors such as solar irradiance, panel efficiency,
 * and heat loss.
 * 
 * @param {number} hour - The hour of the day (0-23).
 * @param {number} area - The area of the solar panel in m².
 * @param {number} efficiency - The efficiency of the solar panel (0-1).
 * @param {number} cloudCover - The cloud cover percentage (0-100).
 * @param {number} specificHeat - The specific heat of the fluid in J/(kg·K).
 * @param {number} T_ambient - The ambient temperature in °C, default is 15°C.
 * @param {number} T_plate - The plate temperature in °C.
 * @param {number} transmittance - The transmittance of the cover plate.
 * @param {number} absorptance - The absorptance of the plate.
 * @param {number} U_L - The overall heat loss coefficient in W/(m²·K), default is 8.
 * @param {number} pumpPower - The power of the pump in Watts.
 * @param {number} hydraulicHead - The hydraulic head in meters, default is 5.
 * @param {number} pumpEfficiency - The pump efficiency (0-1)
 * 
 * @returns {Object} An object containing:
 *   - q_u: The useful energy gain per unit area in MJ/(m²·h).
 *   - F_R: The heat removal factor.
 *   - F_prime_prime: The collector flow factor.
 */
const calculatePanelUsefulEnergyGain = (hour, area, efficiency, cloudCover, specificHeat, T_ambient, T_plate, transmittance, absorptance, U_L, pumpPower, hydraulicHead, pumpEfficiency,mass_flow_rate=null,testAmbient =null) => {
    const density = 1000; // Density of water in kg/m³
    const gravity = 9.81; // Acceleration due to gravity in m/s²

    // Calculate mass flow rate
    const volumetricFlowRate = (pumpPower * pumpEfficiency) / (hydraulicHead * gravity * density); // m³/s

    if (mass_flow_rate == null) {
        // null mass flow rate is for testing purposes
        var mass_flow_rate = volumetricFlowRate * density; // kg/s
    }
    // Hottel-Whillier-Bliss: Qu=Ac[S−UL(Tplate−Tambient)]
    const F_prime = efficiency; // Plate efficiency factor, user input

    let F_R, F_prime_prime;
    if (testAmbient!==null){
        T_ambient = testAmbient;
    }
    // Log all parameters
    console.log('Calculation parameters:');
    console.log('Hour:', hour);
    console.log('Area:', area);
    console.log('Efficiency:', efficiency);
    console.log('Cloud Cover:', cloudCover);
    console.log('Specific Heat:', specificHeat);
    console.log('Ambient Temperature:', T_ambient);
    console.log('Plate Temperature:', T_plate);
    console.log('Transmittance:', transmittance);
    console.log('Absorptance:', absorptance);
    console.log('Heat Loss Coefficient (U_L):', U_L);
    console.log('Pump Power:', pumpPower);
    console.log('Hydraulic Head:', hydraulicHead);
    console.log('Pump Efficiency:', pumpEfficiency);
    console.log('Mass Flow Rate:', mass_flow_rate);
    console.log('Test Ambient Temperature:', testAmbient);


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
    console.log(U_L_Temp_Quotient)

    // Useful energy gain in MJ/(m²·h).
    const Q_u = F_R * area * ((solarIrradiance*transmittance*absorptance) - U_L_Temp_Quotient);

    // Average useful energy gain per unit area
    const q_u = Q_u / area;

    

    return {q_u: q_u, F_R: F_R, F_prime_prime: F_prime_prime}
};


/**
 * Calculates the heat transfer to the fluid and the resulting temperatures in a solar panel.
 * 
 * This function uses the results from the useful energy gain calculation to determine
 * the mean fluid temperature (T_fluid) and the plate temperature (T_plate) in the solar panel.
 * It handles two scenarios: when there's no heat removal (F_R = 0) and when heat is being removed.
 *
 * @param {Object} solarPanelVars - An object containing solar panel variables:
 *   @param {number} q_u - The useful energy gain per unit area in MJ/(m²·h).
 *   @param {number} F_R - The heat removal factor.
 *   @param {number} F_prime_prime - The collector flow factor.
 * @param {number} currentFluidTemp - The current temperature of the fluid in °C.
 * @param {number} U_L - The overall heat loss coefficient in W/(m²·K), default is 8.
 * 
 * @returns {Object} An object containing:
 *   - T_fluid: The mean fluid temperature in °C.
 *   - T_plate: The plate temperature in °C.
 */
const calculateHeatTransferToFluid = (solarPanelVars, currentFluidTemp, U_L) => {
    var {q_u, F_R, F_prime_prime} = solarPanelVars;

    if (F_R === 0) {
        // When F_R is 0, no heat is being removed from the collector
        // The fluid temperature remains unchanged
        // The plate temperature will increase based on the useful energy gain
        let T_fluid = currentFluidTemp;
        let T_plate = currentFluidTemp + (q_u / U_L);

        return {T_fluid, T_plate};
    } else {

        const q_u_joules_per_second = (q_u * 1e6) / 3600;

        T_fluid = currentFluidTemp + ((q_u_joules_per_second) / (F_R * U_L) * (1 - F_prime_prime));
        T_plate = currentFluidTemp + ((q_u_joules_per_second) / (F_R * U_L) * (1 - F_R));

        return {T_fluid, T_plate};
    }
};

/**
 * Calculates the heat transfer from the solar panel fluid to the storage tank and updates the tank temperature.
 * 
 * This function models the heat transfer process between the heated fluid from the solar panel
 * and the storage tank, taking into account factors such as pump power, fluid properties,
 * and tank characteristics.
 * 
 * @param {number} fluidTemp - The temperature of the fluid coming from the solar panel in °C.
 * @param {number} tankTemp - The current temperature of the tank in °C.
 * @param {number} tankVolume - The volume of the tank in m³.
 * @param {number} specificHeat - The specific heat of the fluid in J/(kg·K).
 * @param {number} timeStep - The time step for the simulation in seconds.
 * @param {number} pumpPower - The power of the pump in Watts.
 * @param {number} hydraulicHead - The hydraulic head in meters, default is 5.
 * @param {number} pumpEfficiency - The efficiency of the pump (0-1)
 * 
 * @returns {number} The new temperature of the tank after heat transfer in °C.
 */
const calculateHeatTransferToTank = (fluidTemp, tankTemp, tankVolume, specificHeat, timeStep, pumpPower, hydraulicHead, pumpEfficiency) => {
    const density = 1000; // Density of water in kg/m³ (approximately for water at room temperature)
    const gravity = 9.81; // Acceleration due to gravity in m/s²

    // Calculate the effective mass flow rate using pump power
    const calculatedMassFlowRate = (pumpPower * pumpEfficiency) / (hydraulicHead * gravity * density); // m³/s
    var massFlowRate = calculatedMassFlowRate * density; // Converting m³/s to kg/s by multiplying with the density of water

    // Calculate the rate of heat transfer (Q = m * c_p * ΔT)
    const heatTransferRate = massFlowRate * specificHeat * (fluidTemp - tankTemp); // Joules/s or Watts

    // Calculate the thermal capacity of the tank's volume, using (Q = m * c_p * ΔT) again, where ΔT is 1 deg Celsius., and m = d*V
    const thermalCapacity = tankVolume * density * specificHeat; // J/°C

    // Calculate temperature change in the tank over the time step, based on (Q = m * c_p * ΔT)
    const tankTempChange = (heatTransferRate * timeStep) / thermalCapacity; // °C

    // New tank temperature after time step
    const newTankTemp = tankTemp + tankTempChange;


    return newTankTemp; // Return the new temperature of the tank
};


/**
 * Simulates the temperature changes in a solar panel system over a specified duration.
 * 
 * @param {Object} params - Simulation parameters
 * @param {number} params.area - Solar panel area in m²
 * @param {number} params.efficiency - Solar panel efficiency (0-1)
 * @param {number} params.hour - Starting hour of simulation (0-23)
 * @param {number} params.duration - Simulation duration in hours
 * @param {number} params.timeStep - Time step for simulation in seconds
 * @param {number} params.minAmbientTemp - Minimum ambient temperature in °C
 * @param {number} params.maxAmbientTemp - Maximum ambient temperature in °C
 * @param {number} params.cloudCover - Cloud cover percentage (0-100)
 * @param {number} params.specificHeat - Specific heat of fluid in J/(kg·K)
 * @param {number} params.pumpPower - Pump power in Watts
 * @param {number} params.fluidTemp - Initial fluid temperature in °C
 * @param {number} params.transmittance - Cover plate transmittance
 * @param {number} params.absorptance - Plate absorptance
 * @param {number} params.tankVolume - Tank volume in m³
 * @param {number} params.tankTemp - Initial tank temperature in °C
 * @param {number} params.U_L - Overall heat loss coefficient in W/(m²·K)
 * @param {number} params.hydraulicHead - Hydraulic head in meters
 * @param {number} params.pumpEfficiency - Pump efficiency (0-1)
 * 
 * @returns {Array<Object>} Array of hourly temperature data
 */
const simulateTemperature = (initialParams, inputChanges, startStep = 0) => {
    let temperatures = [];
    let currentParams = { ...initialParams };
    let currentFluidTemp = initialParams.fluidTemp;
    let currentPlateTemp = initialParams.fluidTemp;
    let currentTankTemp = initialParams.tankTemp;

    // If there's a currentState, use it to initialize the simulation
    if (initialParams.currentState) {
        currentFluidTemp = fahrenheitToCelsius(initialParams.currentState.fluidTemp);
        currentPlateTemp = fahrenheitToCelsius(initialParams.currentState.panelTemp);
        currentTankTemp = fahrenheitToCelsius(initialParams.currentState.tankTemp);
    }

    for (let step = startStep; step < initialParams.duration; step++) {
        // Apply any input changes for this hour
        if (inputChanges[step]) {
            currentParams = { ...currentParams, ...inputChanges[step] };
            // If fluid or tank temperature is changed, update the current temperatures
            if (inputChanges[step].fluidTemp !== undefined) {
                currentFluidTemp = (inputChanges[step].fluidTemp);
                currentPlateTemp = fahrenheitToCelsius(inputChanges[step].fluidTemp);
            }
            if (inputChanges[step].tankTemp !== undefined) {
                currentTankTemp = fahrenheitToCelsius(inputChanges[step].tankTemp);
            }
        }

        const currentHour = (initialParams.hour + step) % 24;

        // Calculate ambient temperature using sine wave interpolation
        let currentAmbientTemp;
        if (currentParams.fixedTemp !== null && currentParams.fixedTemp !== 'None') {
            currentAmbientTemp = fahrenheitToCelsius(parseFloat(currentParams.fixedTemp));
        } else {
            const tempAmplitude = (currentParams.maxAmbientTemp - currentParams.minAmbientTemp) / 2;
            const tempMidpoint = (currentParams.maxAmbientTemp + currentParams.minAmbientTemp) / 2;
            currentAmbientTemp = tempMidpoint + tempAmplitude * Math.sin((currentHour - 6) * Math.PI / 12);
        }

        const solarPanelVars = calculatePanelUsefulEnergyGain(
            currentHour, currentParams.area, currentParams.efficiency, currentParams.cloudCover,
            currentParams.specificHeat, currentAmbientTemp, currentPlateTemp, currentParams.transmittance,
            currentParams.absorptance, currentParams.U_L, currentParams.pumpPower,
            currentParams.hydraulicHead, currentParams.pumpEfficiency
        );
        
        let updatedTemps = calculateHeatTransferToFluid(solarPanelVars, currentFluidTemp, currentParams.U_L);
        currentFluidTemp = updatedTemps.T_fluid;
        currentPlateTemp = updatedTemps.T_plate;

        currentTankTemp = calculateHeatTransferToTank(
            currentFluidTemp, currentTankTemp, currentParams.tankVolume, currentParams.specificHeat,
            currentParams.timeStep, currentParams.pumpPower, currentParams.hydraulicHead, currentParams.pumpEfficiency
        );

        // Add the temperature data to the results
        temperatures.push({
            time: step,
            fluidTemp: currentFluidTemp,
            panelTemp: currentPlateTemp,
            tankTemp: currentTankTemp,
            ambientTemp: currentAmbientTemp
        });
    }

    return temperatures;
};


module.exports = {
    simulateTemperature,
    calculatePanelUsefulEnergyGain,
    calculateHeatTransferToFluid,
    getSolarIrradiance
};