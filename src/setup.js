'use strict';

const inquirer = require('inquirer'),
    nodeWindows = require('node-windows');

module.exports = function() {
    return inquirer.prompt([
        /* TODO: Setup related prompts here */
        // Check and set PM2_HOME up (only if it contains user vars?)
        // Set PM2_SERVICE_SCRIPTS up (optional)
        // Set PM2_SERVICE_PM2_DIR up, to support using global pm2 version (non-optional?)
    ]).then(doSetup);
};

function doSetup(answers) {
    // TODO: Perform setup based on answers object
}
