'use strict';
const fs = require('fs'),
    path = require('path'),
    exec_sync = require('child_process').execSync,
    shell = require('shelljs'),
    promisify = require('util').promisify || require('promisify-node'),
    del = require('del'),
    is_admin = require('is-admin');

exports.check_platform = function() {
    if(!/^win/.test(process.platform)) {
        throw new Error('pm2-windows-service has to be run on Windows...');
    }
};

exports.admin_warning = function() {
    return promisify(is_admin)().
        then(admin => {
            if(!admin) {
                console.warn('*** HINT: Run this as administrator to avoid the UAC spam ***');
            }
        }, _ => {
            console.warn('*** HINT: Run this as administrator to avoid the UAC spam ***');
            // Don't re-throw, we just assume they aren't admin if it errored
        });
};

exports.remove_previous_daemon = function(service) {
    return del(path.resolve(__dirname, 'daemon', service.id + '.*'), { force: true });
}

exports.guess_pm2_global_dir = function() {
    let dir;

    try {
        // Use 'which' to find pmd 'executable'
        dir = fs.realpathSync(shell.which('pm2').stdout);

        // Then resolve to the pm2 directory from there
        dir = path.join(dir, '..', 'node_modules', 'pm2', 'index.js' );
    } catch(ex) {
        // Ignore error, just return undefined
    }

    return dir;
};
