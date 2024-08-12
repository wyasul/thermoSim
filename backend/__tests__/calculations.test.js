const { 
  getSolarIrradiance, 
  calculatePanelUsefulEnergyGain, 
  calculateHeatTransferToFluid
} = require('../calculations');

describe('Solar Irradiance Calculations', () => {
  test('getSolarIrradiance returns 0 before sunrise', () => {
    expect(getSolarIrradiance(5)).toBe(0);
  });

  test('getSolarIrradiance returns 0 after sunset', () => {
    expect(getSolarIrradiance(19)).toBe(0);
  });

  test('getSolarIrradiance is reduced by cloud cover', () => {
    const clearSky = getSolarIrradiance(12, 0);
    const cloudySky = getSolarIrradiance(12, 50);
    expect(cloudySky).toBe(clearSky * 0.5);
  });
});

describe('Panel Useful Energy Gain Calculations', () => {
  test('example from textbook, returns expected values for high efficiency and flow rate', () => {
    const highEfficiencyParams = {
      hour: 11,
      area: 2,
      efficiency: 0.841,
      cloudCover: 0,
      specificHeat: 4186,
      T_ambient: null,
      T_plate: 40,
      transmittance: 1,
      absorptance: 1,
      U_L: 8,
      pumpPower: 50,
      hydraulicHead: 10,
      pumpEfficiency: 0.8,
      mass_flow_rate: 0.03,
      testAmbient: 2
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

describe('Heat Transfer to Fluid Calculations', () => {
  test('calculateHeatTransferToFluid returns expected values when F_R is 0', () => {
    const solarPanelVars = { q_u: 0.5, F_R: 0, F_prime_prime: 0 };
    const result = calculateHeatTransferToFluid(solarPanelVars, 20, 8);
    expect(result.T_fluid).toBe(20);
    expect(result.T_plate).toBe(20.0625);
  });
});