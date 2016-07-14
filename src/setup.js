'use strict';

const inquirer = require('inquirer'),
    nodeWindows = require('node-windows'),
    common = require('./common');

module.exports = function() {
    return inquirer.prompt([{
        // Offer to update PM2_HOME
        type: 'input',
        name: 'PM2_HOME',
        message: 'Update PM2_HOME (this path should be accessible to the service user and\nshould not contain any "user-context" variables [e.g. %APPDATA%])',
        default: process.env.PM2_HOME || ''
    }, {
        // Set PM2_SERVICE_SCRIPTS up (optional)
        type: 'input',
        name: 'PM2_SERVICE_SCRIPTS',
        message: 'Set the list of startup scripts/files (semi-colon separated json config\nfiles or js files) [optional]',
        default: process.env.PM2_SERVICE_SCRIPTS || ''
    }, {
        // Set PM2_SERVICE_PM2_DIR up, to support using global pm2 version (non-optional?)
        type: 'input',
        name: 'PM2_SERVICE_PM2_DIR',
        message: 'Specify the directory containing the pm2 version to be used by the\nservice (setting this up is recommended)',
        default: process.env.PM2_SERVICE_PM2_DIR || common.guess_pm2_global_dir()
    }]).then(do_setup);
};

function do_setup(answers) {
    // Perform setup based on answers object
    const command_promises = Object.keys(answers)
        // Filter out unanswered questions
        .filter(key => !!answers[key])
        // Convert answers to promises resolved/rejected by elevated SETX command executions
        .map(key => new Promise((resolve, reject) => {
            nodeWindows.elevate(`SETX ${key} "${answers[key]}" /m`, err => {
                if(err) {
                    return reject(err);
                }

                resolve();
            });
        }));

    // Return a promise which combines all the commands being executed
    return Promise.all(command_promises);
}
