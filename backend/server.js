const express = require('express');
const app = express();
const cors = require('cors');
const { simulateTemperature } = require('./calculations');

app.use(cors());
const PORT = 3001;

app.use(express.json());

app.post('/simulate', (req, res) => {
    const params = {
        area: parseFloat(req.body.area) || 2.0,
        efficiency: parseFloat(req.body.efficiency) || 0.15,
        pumpPower: parseFloat(req.body.pumpPower) || 50,
        heatLossRate: parseFloat(req.body.heatLossRate) || 0.05,
        hour: parseInt(req.body.hour) || 12,
        duration: 24, 
        timeStep: 3600,
        ambientTemperature: (parseFloat(req.body.ambientTemperature) - 32) * 5 / 9 || 25, // Convert to Celsius
        cloudCover: parseFloat(req.body.cloudCover) || 0, // Default cloud cover percentage
        currentTankTemperature: (parseFloat(req.body.currentTankTemperature) - 32) * 5 / 9 || 20, // Convert to Celsius
        specificHeat: parseFloat(req.body.specificHeat) || 4186,
        mass: parseFloat(req.body.mass) || 100
      };

    const temperatures = simulateTemperature(params).map(temp => ({
        time: temp.time,
        temp: temp.temp * 9 / 5 + 32 // Convert back to Fahrenheit
    }));
    res.json({ temperatures });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
