const assert = require('assert');
const util = require('util');
const path = require('path');
const co = require('co');
const promisify = require('promisify-node');
const exec = promisify(require('child_process').exec);
const nodeWin = require('node-windows');

promisify(nodeWin.elevate);
const Service = nodeWin.Service;
const fsx = promisify('fs-extra');
const temp = require('temp').track();

// Gets a random int between 0 and maxValue
function randomInt(maxValue) {
	return Math.floor(Math.random() * (maxValue + 1));
}

// Generates a UUIDv4
function getSid() {
	return '________-____-4___-x____________'.replace(
		/(x)?(_)/g,
		(_, capture1) => {
			return (
				(capture1 ? [8, 9, 'a', 'b'][randomInt(3)] : '') +
				randomInt(15).toString(16)
			);
		}
	);
}

const mkdirTemp = promisify(temp.mkdir);
const sid = getSid();

co(function* () {
	// We deploy everything to a temp dir to avoid creating daemon files in this repo
	const tempDir = yield mkdirTemp('pm2-windows-service-test');

	// Use npm to install ourselves to the temp dir
	// First thing we need is a skeleton package.json in the temp dir (otherwise it doesn't install there)
	const pkg = { name: path.basename(tempDir), version: '0.0.1' };
	yield fsx.writeJson(path.resolve(tempDir, 'package.json'), pkg);

	// Now we can 'npm install' there
	const packageDir = path.resolve(__dirname, '..');
	console.log(
		'Deploying copy of package to temp dir to conduct test from...'
	);
	yield exec(`npm i "${packageDir}"`, { cwd: tempDir });

	// Finally, we require in our copy from the temp dir
	const pm2ws = require(path.resolve(
		tempDir,
		'node_modules',
		'pm2-windows-service'
	));

	console.log('Installing service...');
	yield pm2ws.install(sid, true);

	// Use node-windows to work out what name it gave the service
	const service = new Service({
		name: sid,
		script: path.resolve(__dirname, '../src/service.js')
	});

	console.log('Verifying service installed...');
	yield exec(`sc query "${service.id}.exe"`);

	// TODO: Verify it's actually started - '| findstr RUNNING' refused to work...

	console.log('Uninstalling service...');
	yield pm2ws.uninstall();

	console.log('Verifying service uninstalled...');
	let threw = false;
	try {
		const queryResult = yield exec(`sc query "${service.id}.exe"`);
		console.log(queryResult);
	} catch (ex) {
		threw = true;
	}

	assert(threw, `Service (${sid}) was not uninstalled successfully`);
}).then(
	() => {
		console.log('Service (%s) added and removed OK!', sid);
		process.exit(0);
	},
	(err) => {
		console.error(util.inspect(err));
		process.exit((err && err.code) || 1);
	}
);
