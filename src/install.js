const path = require('path');
const co = require('co');
const event = require('co-event');
const promisify = require('promisify-node');
const fsx = require('fs-extra');
const exec = promisify(require('child_process').exec);
const Service = require('node-windows').Service;
const inquirer = require('inquirer');
const common = require('./common');
const setup = require('./setup');

const saveDir = path.resolve(process.env.APPDATA, 'pm2-windows-service');
const sidFile = path.resolve(saveDir, '.sid');

function* saveSidFile(name) {
	if (name) {
		// Save name to %APPDATA%/pm2-windows-service/.sid, if supplied
		yield fsx.outputFile(sidFile, name);
	}
}

function* killExistingPm2Daemon() {
	try {
		yield exec('pm2 kill');
	} catch (ex) {
		// PM2 daemon wasn't running, no big deal
	}
}

function* installAndStartService(service) {
	// Make sure we kick off the install events on next tick BEFORE we yield
	setImmediate(() => service.install());

	// Now yield on install/alreadyinstalled/start events
	let e;
	while ((e = yield event(service))) {
		switch (e.type) {
			case 'alreadyinstalled':
			case 'install':
				service.start();
				break;
			case 'start':
			default:
				return;
		}
	}
}

module.exports = co.wrap(function* (name, noSetup) {
	common.check_platform();

	yield common.admin_warning();

	const setupResponse = yield noSetup
		? Promise.resolve({
				perform_setup: false
		  })
		: inquirer.prompt([
				{
					type: 'confirm',
					name: 'perform_setup',
					message: 'Perform environment setup (recommended)?',
					default: true
				}
		  ]);

	if (setupResponse.perform_setup) {
		yield setup();
	}

	const service = new Service({
		name: name || 'PM2',
		script: path.join(__dirname, 'service.js')
	});

	// Let this throw if we can't remove previous daemon
	try {
		yield common.remove_previous_daemon(service);
	} catch (ex) {
		throw new Error(
			'Previous daemon still in use, please stop or uninstall existing service before reinstalling.'
		);
	}

	// NOTE: We don't do (name = name || 'PM2') above so we don't end up
	// writing out a sidFile for default name
	yield* saveSidFile(name);

	yield* killExistingPm2Daemon();

	yield* installAndStartService(service);
});
