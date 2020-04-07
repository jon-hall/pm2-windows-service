const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const promisify = require('promisify-node');
const del = require('del');
const isAdmin = require('is-admin');

exports.check_platform = () => {
	if (!/^win/.test(process.platform)) {
		throw new Error('pm2-windows-service has to be run on Windows...');
	}
};

exports.admin_warning = () => {
	return promisify(isAdmin)().then(
		(admin) => {
			if (!admin) {
				console.warn(
					'*** HINT: Run this as administrator to avoid the UAC spam ***'
				);
			}
		},
		() => {
			console.warn(
				'*** HINT: Run this as administrator to avoid the UAC spam ***'
			);
			// Don't re-throw, we just assume they aren't admin if it errored
		}
	);
};

exports.remove_previous_daemon = (service) => {
	return del(path.resolve(__dirname, 'daemon', `${service.id}.*`), {
		force: true
	});
};

exports.guess_pm2_global_dir = () => {
	let dir;

	try {
		// Use 'which' to find pm2 'executable'
		dir = fs.realpathSync(shell.which('pm2').stdout);

		// Then resolve to the pm2 directory from there
		dir = path.join(dir, '..', 'node_modules', 'pm2', 'index.js');
	} catch (ex) {
		// Ignore error, just return undefined
	}

	return dir;
};
