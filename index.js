/*
* MAIN FILE, REQUESTS INFORMATION OF THE CONFIG (CONFIG.JS WHERE TO ESTABLISH IF IT IS DEVELOPMENT OR PROD)
* AND CONFIGURATION WITH EXPRESS (APP.JS), AND ESTABLISH THE CONNECTION WITH THE BD MONGO AND BEGINS TO LISTEN
*/

'use strict'
let appInsights = require('applicationinsights');
const config = require('./config')
if(config.client_server!='http://localhost:4200'){
	appInsights.setup(config.INSIGHTS)
	.setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(false)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(false)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(false)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI)
    .start();
}
const mongoose = require('mongoose');
const app = require('./app')

mongoose.Promise = global.Promise

const server = app.listen(config.port, () => {
	console.log(`API REST corriendo en http://localhost:${config.port}`)
})

server.timeout = 1000000;
