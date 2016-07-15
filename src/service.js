'use strict';

const path = require('path'),
    execSync = require('child_process').execSync,
    // TODO: Integration test ';' delimited values!!!
    // TODO: [deprecated] Remove support for PM2_SERVICE_SCRIPT and PM2_SERVICE_CONFIG in future
    start_script = process.env.PM2_SERVICE_SCRIPTS || process.env.PM2_SERVICE_CONFIG || process.env.PM2_SERVICE_SCRIPT,
    json_regex = /\.json$/;

if(!process.env.PM2_SERVICE_SCRIPTS && (process.env.PM2_SERVICE_CONFIG || process.env.PM2_SERVICE_SCRIPT)) {
    console.warn('[DEPRECATED] "PM2_SERVICE_CONFIG" and "PM2_SERVICE_SCRIPT" have been deprecated in favour of ' +
        '"PM2_SERVICE_SCRIPTS".');
}

// Try to use the global version of pm2 (first from env, then using npm cli)
let global_pm2_dir = process.env.PM2_SERVICE_PM2_DIR;
if(!global_pm2_dir) {

	var fs = require('fs')
	var path = require('path')
	var which = require('which')
	global_pm2_dir = fs.realpathSync(which.sync('pm2'))
	global_pm2_dir = path.join(global_pm2_dir, "..", "node_modules", "pm2", "index.js" );

}

let pm2;
if(global_pm2_dir) {
    try {
        pm2 = require(global_pm2_dir);
    } catch(ex) {
        // Looks like it didn't work, will just have to carry on with local...
    }
}

if(!pm2) {
    pm2 = require('pm2');
}

// NOTE: 'true' means the PM2 daemon exists in this process, so it gets kept alive with us as a Windows service
pm2.connect(true, function(err) {
    handleError(err);

    if(!start_script) {
        // No start script so just try and ressurect
        pm2.resurrect(function(err2) {
            // Don't crash if we failed to resurrect, we might save on shutdown anyway
        });
    } else {
        start_script.split(';').forEach(process_start_script);
    }
});

function process_start_script(start_script) {
    let start_config = start_script;

    // Make sure all apps in json config file have a cwd set, else the cwd will be the service user's home dir,
    // which will almost never lead to the correct script being found and launched
    if(json_regex.test(start_script)) {
        // Use the directory of the config file as the default cwd
        let default_cwd = path.dirname(start_script);

        // Try to load the JSON in using require, the parsed JSON will act as our start_config object
        try {
            start_config = require(start_script);
        } catch(ex) {
            throw new Error('Unable to load PM2 JSON configuration file (' + start_script + ')');
        }

        // PM2 app declarations can be an array or an object with an 'apps' node
        let apps = start_config.apps || start_config;

        // Normalize apps to an array
        apps = Array.isArray(apps) ? apps : [apps];

        // Make sure each app definition has a cwd set, else set the default
        apps.forEach(app_definition => {
            if(!app_definition.cwd) {
                app_definition.cwd = default_cwd;
            }
        });
    }

    // Else, try to start the start script (js file or json config)
    pm2.start(start_config, function(err2) {
        handleError(err2);
    });
}

function handleError(err) {
    if(err) {
        if(err instanceof Error) {
            throw err;
        }

        // We stringify since PM2 chucks us back objects that just end up as [Object object] otherwise
        throw new Error(JSON.stringify(err));
    }
}
