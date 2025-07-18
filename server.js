const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Kartio server running at http://localhost:${PORT}`);
    console.log('Open your browser and navigate to the URL above to play!');
});

module.exports = app;