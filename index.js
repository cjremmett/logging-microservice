import express from 'express';
const app = express();
const port = 3100;
import cors from 'cors';

import { loggingRouter, logResourceAccess, appendToLog } from './logging.js';

// Boilerplate code that automatically converts request bodies to JSON
// See https://masteringjs.io/tutorials/express/body
app.use(express.json());

// Boilerplate code to enable CORS for all endpoints
app.use(cors());

// Log all requests
app.use((req, res, next) => {
    logResourceAccess('https://cjremmett.com' + req.originalUrl, req.ip);
    next();
});

app.use('/logging', loggingRouter);

app.listen(port, () => {
    app.set('trust proxy', true);
    console.log(`Express.js API listening on port ${port}.`);
    appendToLog('cjremmett_logs','LOGGING', 'TRACE', `Express.js API listening on port ${port}.`);
});
