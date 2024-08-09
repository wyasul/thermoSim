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

const calculatePanelUsefulEnergyGain = (hour, area, mass_flow_rate, efficiency, cloudCover, specificHeat, T_ambient=15,T_plate=20, U_L=8) => {
    // Using Qu=Ac[S−UL(Tplate−Tambient)]
    // Obtain solar irradiance adjusted for hour and cloud cover
    const F_prime = efficiency;
    const capacitance_rate = (mass_flow_rate * specificHeat)/(area * U_L * F_prime);

    F_prime_prime = capacitance_rate * (1 - Math.exp(-1 / capacitance_rate));

    F_R = F_prime_prime * F_prime;
    
    //convert from w/m2 to mj/m2
    const solarIrradiance = getSolarIrradiance(hour, cloudCover) * 0.0036

    const U_L_Temp_Quotient = U_L * (T_plate - T_ambient) * 3600 / 1000000


    // Q_u in MJ/m^2 h unit
    Q_u = F_R * area * (solarIrradiance - U_L_Temp_Quotient);
    



    const q_u = Q_u / area;
    // console.log('HOUR', hour)
    // console.log('Q_u', Q_u)
    // console.log('capacitance_rate', capacitance_rate)
    // console.log('U_L_Temp_Quotient', U_L_Temp_Quotient)
    // console.log('F_prime', F_prime)
    // console.log('F_prime_prime', F_prime_prime)
    // console.log('F_R', F_R)
    // console.log('solarIrradiance', solarIrradiance)
    // console.log('U_L', U_L)
    // console.log('T_plate', T_plate)
    // console.log('T_ambient', T_ambient)
    // console.log('q_u', q_u)
    // console.log('\n')
    return {q_u: q_u, F_R: F_R}
};

const calculateHeatTransferToFluid = (solarPanelVars, currentTemperature, U_L=8) => {

    const {q_u, F_R} = solarPanelVars


    T_fm = currentTemperature+ ((q_u)/(F_R * U_L))*(1-F_R)

    return T_fm
};

const simulateTemperature = (params) => {
    // Destructuring parameters to use in the simulation
    const {
        area, efficiency, hour, duration, timeStep,
        T_ambient, currentTankTemperature, cloudCover, specificHeat, mass_flow_rate, pumpPower
    } = params;

    // Array to hold temperature readings for each hour simulated
    let temperatures = [];
    let currentTemperature = currentTankTemperature;

    // Loop through each hour to simulate temperature changes
    for (let step = 0; step < duration; step++) {
        const currentHour = (hour + step) % 24; // Handle wrap-around for 24-hour clock
        const solarPanelVars = calculatePanelUsefulEnergyGain(currentHour, area, mass_flow_rate, efficiency, cloudCover,specificHeat, T_ambient);
        currentTemperature = calculateHeatTransferToFluid(solarPanelVars,currentTemperature);

        // Store each hour's temperature in the array
        temperatures.push({ time: currentHour, temp: currentTemperature });
    }

    return temperatures;
};

module.exports = {
    simulateTemperature,
    calculatePanelUsefulEnergyGain,
    calculateHeatTransferToFluid,
    getSolarIrradiance
};
