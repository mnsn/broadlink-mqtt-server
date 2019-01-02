const fs=require('fs');
let devices = require('./devices-data.json');


module.exports=(() => {
	let dev;
	const setDev=(_dev)=>dev=_dev;
	const waitSome= (mili) => new Promise(resolve => setTimeout(() => resolve('ok'), mili));
	const sendData = (deviceName, action) => {
		return new Promise(resolve => {
			if (!dev) {
				throw new Error('dev isn\'t ready');
			} else if (!devices) {
				throw new Error('devices parameter isn\'t found');
			} else if (!deviceName || !action) {
				throw new Error('missing param')
			} else if (!devices[deviceName]) {
				throw new Error(`device ${deviceName} doesn't exist in devices`);
			} else if (!devices[deviceName][action]) {
				throw new Error(`device ${deviceName} doesn't have action ${action} in devices`);
			} else {
				console.debug(`sending command to ${deviceName} with action ${action}`);
				let a = Buffer.from(devices[deviceName][action]);
				dev.sendData(a);
				resolve('ok');
			}
		});
	};
	const learnData = async (deviceName, action) => {
		return new Promise((resolve, reject) => {
			let count = 0;
			var timer = setInterval(function () {
				console.log("send check!");
				dev.checkData();
				count++;
				if (count === 20) {
					count = 0;
					clearInterval(timer);
				}
			}, 1000);

			dev.on("rawData", async (data) => {
				if (count < 2) {
					return;
				}
				try {
					devices.start = {start: 'ok'};
					devices[deviceName] = devices[deviceName] || {};
					devices[deviceName][action] = data;
					console.log(devices[deviceName]);
					fs.writeFile("devices-data.json", JSON.stringify(devices), function (err) {
						if (err) {
							return console.log(err);
						}
						console.log("The file was saved!");
						clearInterval(timer);

						resolve(devices);
					});
				} catch (e) {
					reject(e);
				}

			});
			dev.enterLearning();
		});
	};
	const runScene = async (commands = []) => {
		console.log(`run scene with commands ${commands}`);
		if (!Array.isArray(commands)) {
			return Promise.reject('commands must be an array');
		}
		if (commands.length === 0) {
			return Promise.reject('empty arr');
		}
		const rec = async (index) => {
			if (commands.length === index) {
				return 'ok';
			} else {
				await sendData(commands[index].topic, commands[index].action);
				await waitSome(1000);
				return rec(index + 1);
			}
		};
	return rec(0);
	};

	return {
		setDev,
		sendData,
		learnData,runScene
}
})();
