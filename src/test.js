'use strict';

const assert = require('assert'),
    execSync = require('child_process').execSync,
    elevate = require('node-windows').elevate,
    pm2ws = require('./index'),
    randomInt = (n => Math.floor(Math.random() * n)),
    sid = '________-____-4___-x____________'.replace(/(x)?(_)/g, (_, capture1) => {
        return (capture1 ? [8, 9, 'a', 'b'][randomInt(4)] : '') + randomInt(16).toString(16);
    });

// Install service with unique name
pm2ws.install(sid, (err) => {
    assert.ifError(err);

    // Verify it's installed
    // TODO: Verify it's actually started - '| findstr RUNNING' refuse to work...
    elevate('sc query ' + sid, (err2, stdout) => {
        assert.ifError(err2);

        // Uninstall service
        pm2ws.uninstall((err3) => {
            assert.ifError(err3);

            // Verify it uninstalled
            elevate('sc query ' + sid, (err4, stdout) => {
                assert(!err4, 'Failed to remove service');

                console.log('Service (%s) added and removed OK!', sid);
            });
        });
    });
});
