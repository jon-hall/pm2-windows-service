const path = require('path');
const co = require('co');
const event = require('co-event');
const promisify = require('promisify-node');
const fsx = require('fs-extra');
const exec = promisify(require('child_process').exec);
const nodeWin = require('node-windows');

const elevate = promisify(nodeWin.elevate);
const Service = nodeWin.Service;
const del = require('del');
const common = require('./common');

const saveDir = path.resolve(process.env.APPDATA, 'pm2-windows-service');
const sidFile = path.resolve(saveDir, '.sid');
const MAX_KILL_CHECKS = 12;
const KILL_CHECK_DELAY = 5000;

function* verifyServiceExists(serviceName) {
	yield exec(`sc query ${serviceName}`);
}

function* stopAndUninstallService(service, serviceName) {
	// Make sure we kick off the stop event on next tick BEFORE we yield
	setImmediate(() => service.stop());

	// Now yield on install/alreadyinstalled/start events
	let e;
	while ((e = yield event(service))) {
		switch (e.type) {
			case 'alreadystopped':
			case 'stop':
			default:
				yield elevate(`sc delete ${serviceName}`);
				return;
		}
	}
}

function* pollForServiceRemoval(serviceName) {
	let removed = false;

	// Windows sometimes takes a while to let go of services, so poll for a minute...
	// TODO: Surely there's a better approach...?
	let tries = 0;
	while (!removed && tries++ < MAX_KILL_CHECKS) {
		// Re-check to see if it's done now...
		try {
			yield* verifyServiceExists(serviceName);
		} catch (ex) {
			removed = true;
		}

		yield new Promise((resolve) => setTimeout(resolve, KILL_CHECK_DELAY));
	}

	return removed;
}

// Checks if the service was fully uninstalled, if not invokes 'sc stop' to give it a little nudge
function* tryConfirmKill(serviceName) {
	let removed = false;
	try {
		yield* verifyServiceExists(serviceName);
	} catch (ex) {
		removed = true;
	}

	if (!removed) {
		// Service hasn't been removed, try stopping it to see if that gets rid of it
		yield elevate(`sc stop ${serviceName}`);

		removed = yield* pollForServiceRemoval(serviceName);

		if (!removed) {
			// Throw if it still isn't fully gone, it's probably marked for deletion, but can't be sure
			// TODO: Determine if it's stopped and/or marked for deletion...
			throw new Error(
				`WARNING: Unable to fully remove service (${serviceName}), please confirm it is ` +
					`scheduled for deletion.`
			);
		}
	}
}

function* removeSidFile(nameFromSidFile, sidFile) {
	if (nameFromSidFile) {
		// Have to use force=true, since the .sid file is in APPDATA
		yield del(sidFile, { force: true });
	}
}

module.exports = co.wrap(function* (name) {
	common.check_platform();

	yield common.admin_warning();

	let nameFromSidFile;
	try {
		nameFromSidFile = yield fsx.readFile(sidFile, 'utf8');
		name = nameFromSidFile;
	} catch (ex) {
		// No sidFile, just keep our current name
	}

	// If we don't have a name by now, then default to 'PM2'
	name = name || 'PM2';

	const service = new Service({
		name,
		script: path.join(__dirname, 'service.js')
	});
	// HACK: node-windows generates a service id, then sticks '.exe' on it
	// to get the actual registered service name
	const serviceName = `${service.id}.exe`;

	yield* verifyServiceExists(serviceName);

	yield* stopAndUninstallService(service, serviceName);

	yield* removeSidFile(nameFromSidFile, sidFile);

	yield* tryConfirmKill(serviceName);

	// Try to clean up the daemon files
	yield common.remove_previous_daemon(service);
});
