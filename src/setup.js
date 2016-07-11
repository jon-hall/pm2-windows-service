'use strict';

const inquirer = require('inquirer'),
    nodeWindows = require('node-windows');

module.exports = function() {
    return inquirer.prompt([{
        // Offer to update PM2_HOME
        type: 'input',
        name: 'pm2_home',
        message: 'Update PM2_HOME (this path should be accessible to the service user and\nshould not contain any "user-context" variables [e.g. %APPDATA%])',
        default: process.env.PM2_HOME || ''
    }, {
        // Set PM2_SERVICE_SCRIPTS up (optional)
        type: 'input',
        name: 'pm2_service_scripts',
        message: 'Set the list of startup scripts/files (semi-colon separated json config\nfiles or js files) [optional]',
        default: process.env.PM2_SERVICE_SCRIPTS || ''
    }, {
        // Set PM2_SERVICE_PM2_DIR up, to support using global pm2 version (non-optional?)
        type: 'input',
        name: 'pm2_service_pm2_dir',
        message: 'Specify the directory containing the pm2 version to be used by the\nservice (setting this up is recommended)',
        default: process.env.PM2_SERVICE_PM2_DIR || ''
    }]).then(do_setup);
};

function do_setup(answers) {
    // TODO: Perform setup based on answers object
}
