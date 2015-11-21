'use strict';

const assert = require('assert'),
    util = require('util'),
    path = require('path'),
    co = require('co'),
    promisify = require('promisify-node'),
    exec = promisify(require('child_process').exec),
    node_win = require('node-windows'),
    elevate = promisify(node_win.elevate),
    Service = node_win.Service,
    fsx = promisify('fs-extra'),
    temp = require('temp').track(),
    mkdir_temp = promisify(temp.mkdir),
    sid = get_sid();

co(function*() {
    // We deploy everything to a temp dir to avoid creating daemon files in this repo
    let temp_dir = yield mkdir_temp('pm2-windows-service-test');

    // Use npm to install ourselves to the temp dir
    // First thing we need is a skeleton package.json in the temp dir (otherwise it doesn't install there)
    let pkg = { name: path.basename(temp_dir), version: '0.0.1' };
    yield fsx.writeJson(path.resolve(temp_dir, 'package.json'), pkg);

    // Now we can 'npm install' there
    let package_dir = path.resolve(__dirname, '..');
    console.log('Deploying copy of package to temp dir to conduct test from...');
    yield exec('npm i "' + package_dir + '"', { cwd: temp_dir });

    // Finally, we require in our copy from the temp dir
    const pm2ws = require(path.resolve(temp_dir, 'node_modules', 'pm2-windows-service'));

    console.log('Installing service...');
    yield pm2ws.install(sid);

    // Use node-windows to work out what name it gave the service
    let service = new Service({
        name: sid,
        script: path.resolve(__dirname, '../src/service.js')
    });

    console.log('Verifying service installed...');
    yield exec('sc query "' + service.id + '.exe"');

    // TODO: Verify it's actually started - '| findstr RUNNING' refused to work...

    console.log('Uninstalling service...');
    yield pm2ws.uninstall();

    console.log('Verifying service uninstalled...');
    let threw = false;
    try {
        let query_result = yield exec('sc query "' + service.id + '.exe"');
        console.log(query_result);
    } catch(ex) {
        threw = true;
    }

    assert(threw, 'Service (' + sid + ') was not uninstalled successfully');
}).then(_ => {
    console.log('Service (%s) added and removed OK!', sid);
    process.exit(0);
}, err => {
    console.error(util.inspect(err));
    process.exit((err && err.code) || 1);
});

// Generates a UUIDv4
function get_sid() {
    return '________-____-4___-x____________'.replace(/(x)?(_)/g, (_, capture1) => {
        return (capture1 ? [8, 9, 'a', 'b'][random_int(3)] : '') + random_int(15).toString(16);
    });
}

// Gets a random int between 0 and max_value
function random_int(max_value) {
    return Math.floor(Math.random() * (max_value + 1));
}
