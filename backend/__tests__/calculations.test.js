const {
    getSolarIrradiance,
    calculatePanelUsefulEnergyGain,
    calculateHeatTransferToFluid,
    simulateTemperature
  } = require('../calculations');
  
  describe('Solar Panel Calculations', () => {
    describe('getSolarIrradiance', () => {
      test('returns 0 before sunrise', () => {
        expect(getSolarIrradiance(5)).toBe(0);
      });
  
      test('returns 0 after sunset', () => {
        expect(getSolarIrradiance(19)).toBe(0);
      });
  
      test('returns maximum at noon', () => {
        const noonIrradiance = getSolarIrradiance(12);
        expect(noonIrradiance).toBeCloseTo(3.6, 1); // 3.6 MJ/m²/hour
      });
  
      test('returns reduced irradiance with cloud cover', () => {
        const noonIrradiance = getSolarIrradiance(12);
        const cloudyNoonIrradiance = getSolarIrradiance(12, 0.5);
        expect(cloudyNoonIrradiance).toBeCloseTo(noonIrradiance * 0.5, 5);
      });
    });
  
    describe('calculatePanelUsefulEnergyGain', () => {
      const defaultParams = {
        hour: 12,
        area: 2,
        mass_flow_rate: 0.03,
        efficiency: 0.8,
        cloudCover: 0,
        specificHeat: 4186,
        T_ambient: 25,
        T_plate: 30,
        transmittance: 0.9,
        absorptance: 0.95
      };
  
      test('calculates energy gain correctly', () => {
        const result = calculatePanelUsefulEnergyGain(...Object.values(defaultParams));
        expect(result).toHaveProperty('q_u');
        expect(result).toHaveProperty('F_R');
        expect(result).toHaveProperty('F_prime_prime');
        expect(result.q_u).toBeGreaterThan(0);
        expect(result.F_R).toBeGreaterThan(0);
        expect(result.F_R).toBeLessThanOrEqual(1);
        expect(result.F_prime_prime).toBeGreaterThan(0);
        expect(result.F_prime_prime).toBeLessThanOrEqual(1);
      });
  
      test('returns lower energy gain with cloud cover', () => {
        const clearSky = calculatePanelUsefulEnergyGain(...Object.values(defaultParams));
        const cloudySky = calculatePanelUsefulEnergyGain(...Object.values({...defaultParams, cloudCover: 0.5}));
        expect(cloudySky.q_u).toBeLessThan(clearSky.q_u);
      });

    test('example from textbook, returns expected values for high efficiency and flow rate', () => {
      const highEfficiencyParams = {
        ...defaultParams,
        hour:11,
        efficiency: 0.841,
        mass_flow_rate: 0.03,
        transmittance: 1,
        absorptance: 1,
        T_ambient: 2,
        T_plate: 40
      };
      const result = calculatePanelUsefulEnergyGain(...Object.values(highEfficiencyParams));
      expect(result.F_prime_prime).toBeGreaterThanOrEqual(0.94);
      expect(result.F_prime_prime).toBeLessThanOrEqual(0.95);
      expect(result.F_R).toBeGreaterThanOrEqual(0.79);
      expect(result.F_R).toBeLessThanOrEqual(0.8);

      expect(result.q_u).toBeGreaterThanOrEqual(1.75);
      expect(result.q_u).toBeLessThanOrEqual(1.85);
    });
    });
  
    describe('calculateHeatTransferToFluid', () => {
      test('calculates heat transfer correctly', () => {
        const solarPanelVars = { q_u: 0.5, F_R: 0.8, F_prime_prime: 0.9 };
        const currentFluidTemp = 20;
        const result = calculateHeatTransferToFluid(solarPanelVars, currentFluidTemp);
        expect(result).toHaveProperty('T_fluid');
        expect(result).toHaveProperty('T_plate');
        expect(result.T_fluid).toBeGreaterThan(currentFluidTemp);
        expect(result.T_plate).toBeGreaterThan(currentFluidTemp);
      });
    });
  
    describe('simulateTemperature', () => {
      const defaultParams = {
        area: 2,
        efficiency: 0.8,
        hour: 0,
        duration: 24,
        timeStep: 3600,
        T_ambient: 25,
        cloudCover: 0,
        specificHeat: 4186,
        mass_flow_rate: 0.03,
        pumpPower: 50,
        startFluidTemp: 20,
        transmittance: 0.9,
        absorptance: 0.95
      };
  
      test('simulates temperature changes over 24 hours', () => {
        const result = simulateTemperature(defaultParams);
        expect(result).toHaveLength(24);
        expect(result[0].time).toBe(0);
        expect(result[23].time).toBe(23);
        expect(result[23].temp).toBeGreaterThan(result[0].temp);
      });
  
      test('temperature increases during daylight hours', () => {
        const result = simulateTemperature(defaultParams);
        const noonTemp = result.find(r => r.time === 12).temp;
        const midnightTemp = result.find(r => r.time === 0).temp;
        expect(noonTemp).toBeGreaterThan(midnightTemp);
      });
    });
  });