'use strict';

const path = require('path'),
    pm2 = require('pm2'),
    // TODO: Integration test ';' delimited values!!!
    // TODO: Remove PM2_SERVICE_CONFIG from docs in favour of single env var which can be mix of scripts and config files
    start_script = process.env.PM2_SERVICE_SCRIPTS || process.env.PM2_SERVICE_CONFIG,
    json_regex = /\.json$/;

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
