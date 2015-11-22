'use strict';

const path = require('path'),
    co = require('co'),
    event = require('co-event'),
    promisify = require('promisify-node'),
    fsx = promisify('fs-extra'),
    exec = promisify(require('child_process').exec),
    node_win = require('node-windows'),
    elevate = promisify(node_win.elevate),
    Service = node_win.Service,
    del = require('del'),
    common = require('./common'),
    save_dir = path.resolve(process.env.APPDATA, 'pm2-windows-service'),
    sid_file = path.resolve(save_dir, '.sid'),
    MAX_KILL_CHECKS = 12,
    KILL_CHECK_DELAY = 5000;


module.exports = co.wrap(function*(name) {
    common.check_platform();

    yield common.admin_warning();

    let name_from_sid_file;
    try {
        name_from_sid_file = yield fsx.readFile(sid_file, 'utf8');
        name = name_from_sid_file;
    } catch(ex) {
        // No sid_file, just keep our current name
    }

    // If we don't have a name by now, then default to 'PM2'
    name = name || 'PM2';

    let service = new Service({
            name: name,
            script: path.join(__dirname, 'service.js')
        }),
        // HACK: node-windows generates a service id, then sticks '.exe' on it
        // to get the actual registered service name
        service_name = service.id + '.exe';

    yield* verify_service_exists(service_name);

    yield* stop_and_uninstall_service(service, service_name);

    yield* remove_sid_file(name_from_sid_file, sid_file);

    yield* try_confirm_kill(service_name);

    // Try to clean up the daemon files
    yield common.remove_previous_daemon(service);
});

function* verify_service_exists(service_name) {
    yield exec('sc query ' + service_name);
}

function* stop_and_uninstall_service(service, service_name) {
    // Make sure we kick off the stop event on next tick BEFORE we yield
    setImmediate(_ => service.stop());

    // Now yield on install/alreadyinstalled/start events
    let e;
    while (e = yield event(service)) {
        switch (e.type) {
            case 'alreadystopped':
            case 'stop':
                yield elevate('sc delete ' + service_name);
                return;
        }
    }
}

// Checks if the service was fully uninstalled, if not invokes 'sc stop' to give it a little nudge
function* try_confirm_kill(service_name) {
    let removed = false;
    try {
        yield* verify_service_exists(service_name);
    } catch(ex) {
        removed = true;
    }

    if(!removed) {
        // Service hasn't been removed, try stopping it to see if that gets rid of it
        yield elevate('sc stop ' + service_name);

        removed = yield* poll_for_service_removal(service_name);

        if(!removed) {
            // Throw if it still isn't fully gone, it's probably marked for deletion, but can't be sure
            // TODO: Determine if it's stopped and/or marked for deletion...
            throw new Error('WARNING: Unable to fully remove service (' + service_name + '), please confirm it is ' +
                'scheduled for deletion.');
        }
    }
}

function* poll_for_service_removal(service_name) {
    let removed = false;

    // Windows sometimes takes a while to let go of services, so poll for a minute...
    // TODO: Surely there's a better approach...?
    let tries = 0;
    while(!removed && (tries++ < MAX_KILL_CHECKS)) {
        // Re-check to see if it's done now...
        try {
            yield* verify_service_exists(service_name);
        } catch(ex) {
            removed = true;
        }

        yield function thunk(t) { setTimeout(t, KILL_CHECK_DELAY); };
    }

    return removed;
}

function* remove_sid_file(name_from_sid_file, sid_file) {
    if(name_from_sid_file) {
        // Have to use force=true, since the .sid file is in APPDATA
        yield del(sid_file, { force: true });
    }
}
