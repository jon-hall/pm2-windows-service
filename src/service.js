'use strict';

const pm2 = require('pm2'),
    assert = require('assert'),
    start_script = process.env.PM2_SERVICE_SCRIPT || process.env.PM2_SERVICE_CONFIG;

// NOTE: 'true' means the PM2 daemon exists in this process, so it gets kept alive with us as a Windows service
pm2.connect(true, function(err) {
    assert.ifError(err);

    if(!start_script) {
        // No start script so just try and ressurect
        pm2.resurrect(function(err2) {
            // Don't crash if we failed to resurrect, we might save on shutdown anyway
        });
    } else {
        // Else, try to start the start script (js file or json config)
        pm2.start(start_script, function(err2) {
            assert.ifError(err2);
        });
    }
});

if(!start_script && process.env.PM2_SERVICE_AUTOSAVE) {
    // If we don't have a start script, and env.PM2_SERVICE_AUTOSAVE is set, try to pm2.dump when the service is closing
    function on_exit(exit, err) {
        if(err) {
            console.error(err.message, err.stack);
        }

        pm2.dump(function(err2) {
            if(err2) {
                console.error(err2.message, err2.stack);
            }

            if(exit) {
                process.exit();
            }
        });
    }

    process.on('exit', on_exit.bind(null, false));
    process.on('SIGINT', on_exit.bind(null, true));
    process.on('uncaughtException', on_exit.bind(null, true));
}
