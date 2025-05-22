import express from 'express';
const loggingRouter = express.Router();

import { getSecretsJson } from './redistools.js';
import sql from './postgresTools.js';


async function isAuthorized(req)
{
    try
    {
        const token = req.headers.token;
 
        if (!token)
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'Request was made to ' + req.originalUrl + ' without the token header.');
            return false;
        }
     
        if(typeof token != 'string')
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'Request was made to ' + req.originalUrl + ' with a token header that is not a string.');
            return false;
        }
    
        let secretsJson = await getSecretsJson();
        if(secretsJson.secrets.logging_microservice.api_token === token)
        {
            return true;
        }
        else
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'Authorization failed due to incorrect token.');
            return false;
        }
    }
    catch(err)
    {
        appendToLog('cjremmett_logs', 'LOGGING', 'ERROR', 'Exception thrown in isAuthorized: ' + err.message);
        return false;
    }
}


function getUTCTimestampString()
{
    let now = new Date();
    let timestamp_string = now.getUTCFullYear() + '-' + (now.getUTCMonth() + 1) + '-' + now.getUTCDate() + ' ' + now.getUTCHours() + ':' + now.getUTCMinutes() + ':' + now.getUTCSeconds() + '.' + now.getUTCMilliseconds();
    return timestamp_string;
}


loggingRouter.get('/', (req, res) => {
    try
    {
        res.status(200);
        res.json({
            'message': 'Logging microservice is alive!',
            'timestamp': getUTCTimestampString()
        });
        res.send();
    }
    catch(err)
    {
        res.status(500);
        res.send();
    }
});


loggingRouter.post('/append-to-log', async (req, res) => {
    // JSON body parameters:
    //  table
    //  category
    //  level
    //  message
    try
    {
        let authorized = await isAuthorized(req);
        if(authorized != true)
        {
            res.status(401);
            res.send();
            return;
        }
        
        let table = req.body.table;
        let category = req.body.category;
        let level = req.body.level;
        let message = req.body.message;
        if(table == null || typeof table != 'string' || category == null || typeof category != 'string' || level == null || typeof level != 'string' || message == null || typeof message != 'string')
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'API request made to /append-to-log with invalid table, category, level and/or message.');
            res.status(400);
            res.send();
        }
        else
        {
            appendToLog(table, category, level, message);
            res.status(201);
            res.send();
        }
    }
    catch(err)
    {
        appendToLog('cjremmett_logs', 'LOGGING', 'ERROR', 'Exception thrown in /append-to-log: ' + err.message);
        res.status(500);
        res.send();
    }
});


loggingRouter.post('/log-resource-access', async (req, res) => {
    // JSON body parameters:
    //  resource
    //  ip_address
    try
    {
        let authorized = await isAuthorized(req);
        if(authorized != true)
        {
            res.status(401);
            res.send();
            return;
        }
        
        if(!req.body)
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'API request made to /log-resource-access with no request body.');
            res.status(400);
            res.send();
            return;
        }

        let resource = req.body.resource;
        let ipAddress = req.body.ip_address;
        if(resource == null || typeof resource != 'string' || ipAddress == null || typeof ipAddress != 'string')
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'API request made to /log-resource-access with invalid URL and/or IP address.');
            res.status(400);
            res.send();
        }
        else
        {
            logResourceAccess(resource, ipAddress);
            res.status(201);
            res.send();
        }
    }
    catch(err)
    {
        appendToLog('cjremmett_logs', 'LOGGING', 'ERROR', 'Exception thrown in /log-resource-access: ' + err.message);
        res.status(500);
        res.send();
    }
});


loggingRouter.post('/log-webpage-access', (req, res) => {
    // Query parameters:
    //  webpage
    try
    {
        let webpage = req.query.webpage;
        let ipAddress = req.ip;
        if(webpage == null || typeof webpage != 'string')
        {
            appendToLog('cjremmett_logs', 'LOGGING', 'INFO', 'API request made to /log-webpage-access with invalid webpage query.');
            res.status(400);
            res.send();
        }
        else
        {
            logResourceAccess(webpage, ipAddress);
            res.status(201);
            res.send();
        }
    }
    catch(err)
    {
        appendToLog('cjremmett_logs', 'LOGGING', 'ERROR', 'Exception thrown in /log-webpage-access: ' + err.message);
        res.status(500);
        res.send();
    }
});


async function appendToLog(table, category, level, message)
{
    // Currently the supported tables are:
    // cjremmett_logs
    try
    {
        const logRecord = {
            timestamp: getUTCTimestampString(),
            category: category,
            level: level,
            message: message
        }
        
        await sql`
        insert into ${sql(table)} ${
            sql(logRecord, 'timestamp', 'category', 'level', 'message')
        }
        `
    }
    catch(err)
    {
        console.log('Exception thrown in appendToLog. Error message: ' + err.message);
    }
}


async function logResourceAccess(url, ipAddress)
{
    try
    {
        const resourceAccessRecord = {
            timestamp: getUTCTimestampString(),
            location: url,
            ip_address: ipAddress
        }
        
        await sql`
        insert into resource_access_logs ${
            sql(resourceAccessRecord, 'timestamp', 'location', 'ip_address')
        }
        `
    }
    catch(err)
    {
        appendToLog('cjremmett_logs', 'LOGGING', 'ERROR', 'Exception thrown in logResourceAccess: ' + err.message);
    }
}


export { loggingRouter, appendToLog, logResourceAccess };

