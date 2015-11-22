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
