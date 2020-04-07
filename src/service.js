const path = require('path');
const common = require('./common');
// TODO: Integration test ';' delimited values!!!
// TODO: [deprecated] Remove support for PM2_SERVICE_SCRIPT and PM2_SERVICE_CONFIG in future
const startScript =
	process.env.PM2_SERVICE_SCRIPTS ||
	process.env.PM2_SERVICE_CONFIG ||
	process.env.PM2_SERVICE_SCRIPT;
const jsonRegex = /\.json$/;

function handleError(err) {
	if (err) {
		if (err instanceof Error) {
			throw err;
		}

		// We stringify since PM2 chucks us back objects that just end up as [Object object] otherwise
		throw new Error(JSON.stringify(err));
	}
}

function processStartScript(startScript) {
	let startConfig = startScript;

	// Make sure all apps in json config file have a cwd set, else the cwd will be the service user's home dir,
	// which will almost never lead to the correct script being found and launched
	if (jsonRegex.test(startScript)) {
		// Use the directory of the config file as the default cwd
		const defaultCwd = path.dirname(startScript);

		// Try to load the JSON in using require, the parsed JSON will act as our startConfig object
		try {
			startConfig = require(startScript);
		} catch (ex) {
			throw new Error(
				`Unable to load PM2 JSON configuration file (${startScript})`
			);
		}

		// PM2 app declarations can be an array or an object with an 'apps' node
		let apps = startConfig.apps || startConfig;

		// Normalize apps to an array
		apps = Array.isArray(apps) ? apps : [apps];

		// Make sure each app definition has a cwd set, else set the default
		apps.forEach((appDefinition) => {
			if (!appDefinition.cwd) {
				appDefinition.cwd = defaultCwd;
			}
		});
	}

	// Else, try to start the start script (js file or json config)
	pm2.start(startConfig, (err2) => {
		handleError(err2);
	});
}

if (
	!process.env.PM2_SERVICE_SCRIPTS &&
	(process.env.PM2_SERVICE_CONFIG || process.env.PM2_SERVICE_SCRIPT)
) {
	console.warn(
		'[DEPRECATED] "PM2_SERVICE_CONFIG" and "PM2_SERVICE_SCRIPT" have been deprecated in favour of ' +
			'"PM2_SERVICE_SCRIPTS".'
	);
}

// Try to use the global version of pm2 (first from env, then using npm cli)
let globalPm2Dir = process.env.PM2_SERVICE_PM2_DIR;
if (!globalPm2Dir) {
	globalPm2Dir = common.guess_pm2_global_dir();
}

let pm2;
if (globalPm2Dir) {
	try {
		pm2 = require(globalPm2Dir);
	} catch (ex) {
		console.error('Sorry, this script requires pm2');
		process.exit(1);
	}
}

if (!pm2) {
	pm2 = require('pm2');
}

// NOTE: 'true' means the PM2 daemon exists in this process, so it gets kept alive with us as a Windows service
pm2.connect(true, (err) => {
	handleError(err);

	if (!startScript) {
		// No start script so just try and ressurect
		pm2.resurrect(() => {
			// Don't crash if we failed to resurrect, we might save on shutdown anyway
		});
	} else {
		startScript.split(';').forEach(processStartScript);
	}
});
