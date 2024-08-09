const express = require('express');
const cors = require('cors');
const { simulateTemperature } = require('./calculations');
const { fahrenheitToCelsius, celsiusToFahrenheit } = require('./utils');  // Import the utility functions

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/simulate', (req, res) => {
    const params = {
        area: parseFloat(req.body.area) || 2.0,
        efficiency: parseFloat(req.body.efficiency) || 0.15,
        pumpPower: parseFloat(req.body.pumpPower) || 50,
        hour: parseInt(req.body.hour) || 12,
        duration: 24,
        timeStep: 3600,
        T_ambient: fahrenheitToCelsius(parseFloat(req.body.T_ambient) || 77), // Convert to Celsius
        cloudCover: parseFloat(req.body.cloudCover) || 0,
        specificHeat: parseFloat(req.body.specificHeat) || 4186,
        mass_flow_rate: parseFloat(req.body.mass_flow_rate) || 0.03,
        startFluidTemp: fahrenheitToCelsius(parseFloat(req.body.startFluidTemp)) || 68,
        transmittance: parseFloat(req.body.transmittance) || 0.9, // Add transmittance
        absorptance: parseFloat(req.body.absorptance) || 0.95, // Add absorptance
    };

    const temperatures = simulateTemperature(params).map(temp => ({
        time: temp.time,
        temp: celsiusToFahrenheit(temp.temp) // Convert back to Fahrenheit
    }));
    res.json({ temperatures });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});