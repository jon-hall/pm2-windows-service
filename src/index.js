'use strict';

const path = require('path'),
    fs = require('fs'),
    is_admin = require('is-admin'),
    nodewin = require('node-windows'),
    elevate = nodewin.elevate,
    Service = nodewin.Service,
    save_dir = path.resolve(process.env.APPDATA, 'pm2-window-service'),
    save_file = path.resolve(save_dir, '.sid');

exports.install = function(name, cb) {
    check_platform();

    admin_warn(function() {
        if(typeof name === 'function') {
            cb = name;
            name = undefined;
        }

        let service = new Service({
            name: name || 'PM2',
            script: path.join(__dirname, 'service.js')
        });

        if(name) {
            // Save name to %APPDATA%/pm2-windows-service/.sid, if supplied
            try {
                fs.lstatSync(save_dir);
            } catch(ex) {
                fs.mkdirSync(save_dir);
            }

            fs.writeFileSync(save_file, name);
        }

        service.once('install', function(err) {
            if(err) {
                cb(err);
            } else {
                service.start();
            }
        });

        service.once('alreadyinstalled' ,function() {
            service.start();
        });

        service.once('start', function(err) {
            cb(err);
        });

        // Try to kill any existing pm2 daemon before we start the service
        try {
            execSync('pm2 kill');
        } catch(ex) {
            // PM2 wasn't running, no big deal
        }

        service.install();
    });
};

exports.uninstall = function(name, cb) {
    check_platform();

    admin_warn(function() {
        if(typeof name === 'function') {
            cb = name;
            name = undefined;
        }

        // Load name from %APPDATA%/pm2-windows-service/.sid, if not supplied
        let need_unlink = false;
        try {
            name = fs.readFileSync(save_file, 'utf8');
            need_unlink = true;
        } catch(ex) {
            // No save file and no name, assume using default ('PM2')
        }

        // HACK: For some reason node-window puts.exe on the end of the service name and it's
        // only SOMETIMES required to uninstall - try without .exe first, then with, if that fail
        name = name || 'PM2';

        try_uninstall(name, function(err) {
            if(err) {
                try_uninstall(name + '.exe', cb, need_unlink);
            } else {
                cb();
            }
        }, need_unlink);
    });
};

function try_uninstall(name, cb, need_unlink) {
    var service = new Service({
        name: name,
        script: path.join(__dirname, 'service.js')
    });

    service.once('uninstall', function(err) {
        if(!err && need_unlink) {
            // Remove the save file
            fs.unlinkSync(save_file);
        }

        cb(err);
    });

    service.once('stop', function(err) {
        if(err) {
            cb(err);
        } else {
            service.uninstall();
        }
    });

    service.stop();
}

function check_platform() {
    if(!/^win/.test(process.platform)) {
        throw new Error('pm2-windows-service has to be run on Windows...');
    }
}

function admin_warn(cb) {
    is_admin(function(err, admin) {
        if(!admin) {
            console.warn('*** HINT: Run this as administrator to avoid the UAC spam ***');
        }
        cb();
    });
}
