const express = require('express');
const cors = require('cors');
const { simulateTemperature } = require('./calculations');
const { fahrenheitToCelsius, celsiusToFahrenheit } = require('./utils');  // Import the utility functions

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/simulate', (req, res) => {
    const initialParams = {
        area: parseFloat(req.body.area) || 2.0,
        efficiency: parseFloat(req.body.efficiency) || 0.15,
        pumpPower: req.body.pumpPower !== undefined ? parseFloat(req.body.pumpPower) : 50,
        hour: req.body.hour !== undefined ? parseFloat(req.body.hour) : 0,
        duration: parseFloat(req.body.duration) || 24,
        timeStep: 3600,
        minAmbientTemp: fahrenheitToCelsius(parseFloat(req.body.minAmbientTemp) || 60),
        maxAmbientTemp: fahrenheitToCelsius(parseFloat(req.body.maxAmbientTemp) || 80),
        cloudCover: parseFloat(req.body.cloudCover) || 0,
        specificHeat: parseFloat(req.body.specificHeat) || 4186,
        startFluidTemp: fahrenheitToCelsius(parseFloat(req.body.startFluidTemp)) || 68,
        transmittance: parseFloat(req.body.transmittance) || 0.9,
        absorptance: parseFloat(req.body.absorptance) || 0.95,
        tankVolume: parseFloat(req.body.tankVolume) || 1000,
        tankTemp: fahrenheitToCelsius(parseFloat(req.body.tankTemp)) || 68,
        pumpEfficiency: parseFloat(req.body.pumpEfficiency) || 0.7,
        hydraulicHead: parseFloat(req.body.hydraulicHead) || 5,
        U_L: parseFloat(req.body.U_L) || 8,
    };

    const inputChanges = req.body.inputChanges || {};

    const temperatures = simulateTemperature(initialParams, inputChanges).map(temp => ({
        time: temp.time,
        fluidTemp: celsiusToFahrenheit(temp.fluidTemp),
        panelTemp: celsiusToFahrenheit(temp.panelTemp),
        tankTemp: celsiusToFahrenheit(temp.tankTemp),
        ambientTemp: celsiusToFahrenheit(temp.ambientTemp)
    }));
    res.json({ temperatures });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});