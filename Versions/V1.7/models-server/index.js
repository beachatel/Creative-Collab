const express = require('express');
const http = require('http');
const path = require('path');
const logger = require('morgan');
const PORT = process.env.PORT || 6001; // Port 6001 for models and sketch
const app = express();


app.use(logger('dev'));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // Allows the browser on port 8000 to fetch from 6001
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


const modelPath = path.resolve(__dirname, 'models'); 
app.use(express.static(modelPath));



const sketchAssetsPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(sketchAssetsPath));



app.get('/', (req, res) => {

    res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
})



app.use((req, res) => {
    res.statusCode = 404
    res.end(`404! page not found!`);
})


http.createServer(app).listen(PORT, () => {
    console.log(`Server running all files on: http://localhost:${PORT}/`);
    console.log(`Your p5.js Sketch is available at: http://localhost:${PORT}/`);
    console.log(`Models are served from the root, e.g.: http://localhost:${PORT}/posenet/model.json`);
})