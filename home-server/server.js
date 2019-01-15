const express = require('express');
const app = express();
let broadlink = require('../external-libs/broadlink');
let fs = require('fs');
const util = require('util');
var b = new broadlink();
const utils=require('./utils');

let devices = require('./devices-data.json');
const scenes = require('./scenes-data');
const nconf = require('nconf');
nconf.argv()
	.env()
	.file({file: 'config.json'});
/***Subscribe to mqtt**/
var mqtt = require('mqtt');
const mqqtUrl = nconf.get("MQTT_URL");
if (!mqqtUrl) {
	throw new Error('please provide MQTT_URL');
}
var client = mqtt.connect(mqqtUrl);
client.on('connect', function () {
	console.log('Connected.');
	let topics = Object.keys(devices);
	topics = [...topics, 'learn', 'scene'];
	console.log("topics=" + topics);
	client.subscribe(topics);
});
console.log(devices);
//when broadlink connected
b.on("deviceReady", (dev) => {
	console.log('ready');
	utils.setDev(dev);
	//got message from subscribers
	client.on('message', async (topic, message) =>{
		console.log(`Received: ${topic} ${message}`);
		const sendResponse = (topic = 'general', {errorMessage = undefined, response = 'ok'}) => {
			console.log(`sending response topic=${topic} errorMessage=${errorMessage}, response=${response}`)
			client.publish(topic, JSON.stringify({
				time: new Date(),
				message: String(message),
				error: errorMessage,
				res: response
			}));

		};

		if (!dev) {
			client.publish(`general-${topic}`, JSON.stringify({
				time: new Date(),
				message: String(message),
				error: 'dev is undefined'
			}));
		} else if (String(topic) === 'learn') {
			let [deviceName, action] = String(message).split(':');
			if (!deviceName || !action) {
				client.publish('learn-response', JSON.stringify({
					time: new Date(),
					message: String(message),
					error: 'incorrect message , message needs to be spited by spaces'
				}));
			} else {
				try {
					await utils.learnData(deviceName, action);
					client.publish('learn-response', JSON.stringify({
						time: new Date(),
						message: String(message),
						res: 'learned'
					}));
				} catch (e) {
					client.publish('learn-response', JSON.stringify({
						time: new Date(),
						message: String(message),
						error: 'fail to learn data ' + e
					}));
				}
			}
		} else if (String(topic) === 'scene') {
			const sceneName = String(message);
			if (!scenes[sceneName]) {
				sendResponse(`scene-response`, {errorMessage: `no scene called ${sceneName}`});
			} else {
				utils.runScene(scenes[sceneName])
					.then(ans => {
						sendResponse(`scene-${sceneName}-response`, {response: `sent scene ${sceneName}`})
					}).catch(err => {
					sendResponse(`scene-${sceneName}-response`, {errorMessage: err});
				});
			}

		} else {
			let deviceName = String(topic);
			let action = String(message);
			utils.sendData(deviceName, action)
				.then(ans => {
					sendResponse(`${deviceName}-response`, {response: `sent event to ${deviceName}`})
				}).catch(err => {
				sendResponse(`${deviceName}-response`, {errorMessage: err});
			})
		}
	});

});
b.discover();