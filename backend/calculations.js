const getSolarIrradiance = (hour, cloudCover = 0) => {
    const sunrise = 6; // 6 AM
    const sunset = 18; // 6 PM
    const peakIrradiance = 1000; // Maximum solar irradiance in watts per square meter

    // No solar energy available before sunrise or after sunset
    if (hour < sunrise || hour > sunset) {
        return 0;
    }

    // Cosine wave to model solar energy peaking at noon, using a sinusoidal function adjusted for solar movement
    const angle = Math.PI * (hour - sunrise) / (sunset - sunrise);
    const irradiance = peakIrradiance * Math.cos(angle - Math.PI / 2) ** 2;

    // Adjust irradiance based on cloud cover percentage, reducing available solar energy
    return irradiance * (1 - cloudCover);
};

const calculatePanelHeatAbsorption = (hour, area, efficiency, cloudCover, T_plate=20, T_ambient=15, U_L=0.68) => {
    // Using Qu=Ac[S−UL(Tplate−Tambient)]
    // Obtain solar irradiance adjusted for hour and cloud cover
    const solarIrradiance = getSolarIrradiance(hour, cloudCover);

    // Calculate absorbed heat based on irradiance, solar panel area, and efficiency
    const absorbedEnergy = solarIrradiance * area * efficiency;

    // Calculate heat loss using the heat loss coefficient, difference in temperatures
    const heatLoss = U_L * (T_plate - T_ambient);

    // Calculate useful energy output incorporating the heat loss
    const usefulEnergy = area * (absorbedEnergy - heatLoss);
    console.log(hour, absorbedEnergy, heatLoss, usefulEnergy)

    return usefulEnergy;
};

const calculateHeatTransferToFluid = (heatAbsorbed, currentTemperature, specificHeat, mass, ambientTemperature, timeStep) => {
    // Calculate the temperature change using Q = c × m × ΔT
    // Rearranged to solve for ΔT: ΔT = Q / (c × m)
    const temperatureChange = heatAbsorbed / (specificHeat * mass);

    // Update the current temperature
    return currentTemperature + temperatureChange;
};

const simulateTemperature = (params) => {
    // Destructuring parameters to use in the simulation
    const {
        area, efficiency, hour, duration, timeStep,
        ambientTemperature, currentTankTemperature, cloudCover, specificHeat, mass, pumpPower
    } = params;

    // Array to hold temperature readings for each hour simulated
    let temperatures = [];
    let currentTemperature = currentTankTemperature;

    // Loop through each hour to simulate temperature changes
    for (let step = 0; step < duration; step++) {
        const currentHour = (hour + step) % 24; // Handle wrap-around for 24-hour clock
        const heatAbsorbed = calculatePanelHeatAbsorption(currentHour, area, efficiency, cloudCover);
        currentTemperature = calculateHeatTransferToFluid(heatAbsorbed, currentTemperature, specificHeat, mass, ambientTemperature, timeStep);

        // Store each hour's temperature in the array
        temperatures.push({ time: currentHour, temp: currentTemperature });
    }

    return temperatures;
};

module.exports = {
    simulateTemperature
};
