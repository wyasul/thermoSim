const {
    getSolarIrradiance,
    calculatePanelUsefulEnergyGain,
    calculateHeatTransferToFluid,
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
  
      test('returns reduced irradiance with cloud cover', () => {
        const noonIrradiance = getSolarIrradiance(12);
        const cloudyNoonIrradiance = getSolarIrradiance(12, 0.5);
        expect(cloudyNoonIrradiance).toBe(noonIrradiance * 0.5);
      });
    });
  
    describe('calculatePanelUsefulEnergyGain', () => {
      test('calculates energy gain correctly', () => {
        const result = calculatePanelUsefulEnergyGain(12, 2, 0.03, 0.8, 0, 4186);
        expect(result).toHaveProperty('q_u');
        expect(result).toHaveProperty('F_R');
        expect(result.q_u).toBeGreaterThan(0);
        expect(result.F_R).toBeGreaterThan(0);
      });
  
      test('returns lower energy gain with cloud cover', () => {
        const clearSky = calculatePanelUsefulEnergyGain(12, 2, 0.03, 0.8, 0, 4186);
        const cloudySky = calculatePanelUsefulEnergyGain(12, 2, 0.03, 0.8, 0.5, 4186);
        expect(cloudySky.q_u).toBeLessThan(clearSky.q_u);
      });
    });
  
    describe('calculateHeatTransferToFluid', () => {
      test('calculates heat transfer correctly', () => {
        const solarPanelVars = { q_u: 0.5, F_R: 0.8 };
        const result = calculateHeatTransferToFluid(solarPanelVars, 20);
        expect(result).toBeGreaterThan(20);
      });
    });
  
    describe('simulateTemperature', () => {
      test('simulates temperature changes over 24 hours', () => {
        const params = {
          area: 2,
          efficiency: 0.8,
          hour: 0,
          duration: 24,
          timeStep: 3600,
          T_ambient: 25,
          currentTankTemperature: 20,
          cloudCover: 0,
          specificHeat: 4186,
          mass_flow_rate: 0.03,
          pumpPower: 50
        };
        const result = simulateTemperature(params);
        expect(result).toHaveLength(24);
        expect(result[0].time).toBe(0);
        expect(result[23].time).toBe(23);
        expect(result[23].temp).toBeGreaterThan(result[0].temp);
      });
    });
  });