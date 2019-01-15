var util = require('util');
let EventEmitter = require('events');
let dgram = require('dgram');
let os = require('os');
let crypto = require('crypto');
const nconf = require('nconf');
nconf.argv()
	.env()
	.file({file: '../config.json'});

var Broadlink = module.exports = function () {
	EventEmitter.call(this);
	this.devices = {};
}
util.inherits(Broadlink, EventEmitter);


Broadlink.prototype.genDevice = function (devtype, host, mac) {
	var dev = new device(host, mac);
	const sp2Codes = [/*SP2*/0x2711,/*Honeywell SP2*/0x2711, 0x2719, 0x7919, 0x271a, 0x791a,/*SPMini*/0x2720,
		/*SP3*/ 0x753e, /*SPMini2*/ 0x2728,  /*OEM branded SPMini*/0x2733, 0x273e,
		/*SPMiniPlus*/0x2736];
	const rmCodes = [/*RM2*/0x2712,/*RM Mini*/0x2737,/*RM Pro Phicomm*/0x273d,
		/*RM2 Home Plus*/0x2783,/*RM2 Pro Plus*/0x272a, /*RM2 Home Plus GDT*/0x277c,
		/*RM2 Pro Plus2*/0x2787,/*RM2 Pro Plus BL*/0x278b,/*RM Mini Shate*/0x278f,
	];

	if (devtype === 0) {
		dev.sp1();
	} else if (sp2Codes.indexOf(devtype) >= 0 ||/* OEM branded SPMini2*/(devtype >= 0x7530 && devtype <= 0x7918)) {
		dev.sp2();
	} else if (rmCodes.indexOf(devtype) >= 0) {

	} else if (devtype === 0x2714) { // A1
		dev.a1();
	} else if (devtype === 0x4EB5) { // MP1
		dev.mp1();
	} else {
		dev.device();
	}
	return dev;
}

Broadlink.prototype.discover = function (defaultaddress, cb) {
	self = this;
	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	const ipPrefix = nconf.get('IP_PREFIX');
	if (ipPrefix) {
		let flag = false;
		for (let addr of addresses) {
			if (addr.startsWith(ipPrefix)) {
				address = addr;
				flag = true;
				break;
			}
		}
		if (!flag) {
			throw new Error(`can't find address that starts with ${process.env.IP_PREFIX} `);
		}
	} else {
		address = addresses[0];
	}
	address = address.split('.');
	var cs = dgram.createSocket({type: 'udp4', reuseAddr: true});
	cs.on('listening', function () {
		cs.setBroadcast(true);

		var port = cs.address().port;
		var now = new Date();
		var starttime = now.getTime();

		var timezone = now.getTimezoneOffset() / -3600;
		var packet = Buffer.alloc(0x30, 0);

		var year = now.getYear();

		if (timezone < 0) {
			packet[0x08] = 0xff + timezone - 1;
			packet[0x09] = 0xff;
			packet[0x0a] = 0xff;
			packet[0x0b] = 0xff;
		} else {
			packet[0x08] = timezone;
			packet[0x09] = 0;
			packet[0x0a] = 0;
			packet[0x0b] = 0;
		}
		packet[0x0c] = year & 0xff;
		packet[0x0d] = year >> 8;
		packet[0x0e] = now.getMinutes();
		packet[0x0f] = now.getHours();
		var subyear = year % 100;
		packet[0x10] = subyear;
		packet[0x11] = now.getDay();
		packet[0x12] = now.getDate();
		packet[0x13] = now.getMonth();
		packet[0x18] = parseInt(address[0]);
		packet[0x19] = parseInt(address[1]);
		packet[0x1a] = parseInt(address[2]);
		packet[0x1b] = parseInt(address[3]);
		packet[0x1c] = port & 0xff;
		packet[0x1d] = port >> 8;
		packet[0x26] = 6;
		var checksum = 0xbeaf;

		for (var i = 0; i < packet.length; i++) {
			checksum += packet[i];
		}
		checksum = checksum & 0xffff;
		packet[0x20] = checksum & 0xff;
		packet[0x21] = checksum >> 8;
		const BROADCAST_ADDRESS = nconf.get("BROADCAST_ADDRESS") || '255.255.255.255';
		cs.sendto(packet, 0, packet.length, 80, BROADCAST_ADDRESS);

	});

	cs.on("message", (msg, rinfo) => {
		var host = rinfo;
		var mac = Buffer.alloc(6, 0);
		//mac = msg[0x3a:0x40];
		msg.copy(mac, 0, 0x34, 0x40);
		var devtype = msg[0x34] | msg[0x35] << 8;
		if (!this.devices) {
			this.devices = {};
		}

		if (!this.devices[mac]) {
			var dev = this.genDevice(devtype, host, mac);
			this.devices[mac] = dev;
			dev.on("deviceReady", () => {
				this.emit("deviceReady", dev);
			});
			dev.auth();
		}
	});

	cs.bind();
}

function device(host, mac, timeout = 10) {
	this.host = host;
	this.mac = mac;
	this.emitter = new EventEmitter();

	this.on = this.emitter.on;
	this.emit = this.emitter.emit;
	this.removeListener = this.emitter.removeListener;

	this.timeout = timeout;
	this.count = Math.random() & 0xffff;
	this.key = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
	this.iv = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
	this.id = new Buffer([0, 0, 0, 0]);
	this.cs = dgram.createSocket({type: 'udp4', reuseAddr: true});
	this.cs.on('listening', function () {
		//this.cs.setBroadcast(true);
	});
	this.cs.on("message", (response, rinfo) => {
		var enc_payload = Buffer.alloc(response.length - 0x38, 0);
		response.copy(enc_payload, 0, 0x38);

		var decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
		decipher.setAutoPadding(false);
		var payload = decipher.update(enc_payload);
		var p2 = decipher.final();
		if (p2) {
			payload = Buffer.concat([payload, p2]);
		}

		if (!payload) {
			return false;
		}

		var command = response[0x26];
		var err = response[0x22] | (response[0x23] << 8);

		if (err != 0) return;

		if (command == 0xe9) {
			this.key = Buffer.alloc(0x10, 0);
			payload.copy(this.key, 0, 0x04, 0x14);

			this.id = Buffer.alloc(0x04, 0);
			payload.copy(this.id, 0, 0x00, 0x04);
			this.emit("deviceReady");
		} else if (command == 0xee) {
			this.emit("payload", err, payload);
		}

	});
	this.cs.bind();
	this.type = "Unknown";
}

Broadlink.device = device;
device.prototype.auth = function () {
	var payload = Buffer.alloc(0x50, 0);
	payload[0x04] = 0x31;
	payload[0x05] = 0x31;
	payload[0x06] = 0x31;
	payload[0x07] = 0x31;
	payload[0x08] = 0x31;
	payload[0x09] = 0x31;
	payload[0x0a] = 0x31;
	payload[0x0b] = 0x31;
	payload[0x0c] = 0x31;
	payload[0x0d] = 0x31;
	payload[0x0e] = 0x31;
	payload[0x0f] = 0x31;
	payload[0x10] = 0x31;
	payload[0x11] = 0x31;
	payload[0x12] = 0x31;
	payload[0x1e] = 0x01;
	payload[0x2d] = 0x01;
	payload[0x30] = 'T'.charCodeAt(0);
	payload[0x31] = 'e'.charCodeAt(0);
	payload[0x32] = 's'.charCodeAt(0);
	payload[0x33] = 't'.charCodeAt(0);
	payload[0x34] = ' '.charCodeAt(0);
	payload[0x35] = ' '.charCodeAt(0);
	payload[0x36] = '1'.charCodeAt(0);

	this.sendPacket(0x65, payload);

}

device.prototype.getType = function () {
	return this.type;
}

device.prototype.sendPacket = async function (command, payload) {

	this.count = (this.count + 1) & 0xffff;
	var packet = Buffer.alloc(0x38, 0);
	packet[0x00] = 0x5a;
	packet[0x01] = 0xa5;
	packet[0x02] = 0xaa;
	packet[0x03] = 0x55;
	packet[0x04] = 0x5a;
	packet[0x05] = 0xa5;
	packet[0x06] = 0xaa;
	packet[0x07] = 0x55;
	packet[0x24] = 0x2a;
	packet[0x25] = 0x27;
	packet[0x26] = command;
	packet[0x28] = this.count & 0xff;
	packet[0x29] = this.count >> 8;
	packet[0x2a] = this.mac[0];
	packet[0x2b] = this.mac[1];
	packet[0x2c] = this.mac[2];
	packet[0x2d] = this.mac[3];
	packet[0x2e] = this.mac[4];
	packet[0x2f] = this.mac[5];
	packet[0x30] = this.id[0];
	packet[0x31] = this.id[1];
	packet[0x32] = this.id[2];
	packet[0x33] = this.id[3];

	var checksum = 0xbeaf;
	for (var i = 0; i < payload.length; i++) {
		checksum += payload[i];
		checksum = checksum & 0xffff;
	}

	var cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
	payload = cipher.update(payload);
	var p2 = cipher.final();

	packet[0x34] = checksum & 0xff;
	packet[0x35] = checksum >> 8;

	packet = Buffer.concat([packet, payload]);

	checksum = 0xbeaf;
	for (var i = 0; i < packet.length; i++) {
		checksum += packet[i];
		checksum = checksum & 0xffff;
	}
	packet[0x20] = checksum & 0xff;
	packet[0x21] = checksum >> 8;
	const asyncsendto = util.promisify(this.cs.sendto);
	return await this.cs.sendto(packet, 0, packet.length, this.host.port, this.host.address);

}

device.prototype.mp1 = function () {
	this.type = "MP1";
	this.prototype.set_power_mask = async function (sid_mask, state) {
		//"""Sets the power state of the smart power strip."""

		var packet = Buffer.alloc(16, 0);
		packet[0x00] = 0x0d;
		packet[0x02] = 0xa5;
		packet[0x03] = 0xa5;
		packet[0x04] = 0x5a;
		packet[0x05] = 0x5a;
		packet[0x06] = 0xb2 + (state ? (sid_mask << 1) : sid_mask);
		packet[0x07] = 0xc0;
		packet[0x08] = 0x02;
		packet[0x0a] = 0x03;
		packet[0x0d] = sid_mask;
		packet[0x0e] = state ? sid_mask : 0;

		await this.sendPacket(0x6a, packet);
	}

	this.set_power = function (sid, state) {
		//"""Sets the power state of the smart power strip."""
		var sid_mask = 0x01 << (sid - 1);
		this.set_power_mask(sid_mask, state);
	}
	this.check_power_raw = async function () {
		//"""Returns the power state of the smart power strip in raw format."""
		var packet = bytearray(16);
		packet[0x00] = 0x0a;
		packet[0x02] = 0xa5;
		packet[0x03] = 0xa5;
		packet[0x04] = 0x5a;
		packet[0x05] = 0x5a;
		packet[0x06] = 0xae;
		packet[0x07] = 0xc0;
		packet[0x08] = 0x01;

		await this.sendPacket(0x6a, packet);
		/*
			 err = response[0x22] | (response[0x23] << 8);
			 if(err == 0){
			 aes = AES.new(bytes(this.key), AES.MODE_CBC, bytes(self.iv));
			 payload = aes.decrypt(bytes(response[0x38:]));
			 if(type(payload[0x4]) == int){
			 state = payload[0x0e];
			 }else{
			 state = ord(payload[0x0e]);
			 }
			 return state;
			 }
			 */
	}

	this.check_power = function () {
		//"""Returns the power state of the smart power strip."""
		/*
			 state = this.check_power_raw();
			 data = {};
			 data['s1'] = bool(state & 0x01);
			 data['s2'] = bool(state & 0x02);
			 data['s3'] = bool(state & 0x04);
			 data['s4'] = bool(state & 0x08);
			 return data;
			 */
	}


}


device.prototype.sp1 = function () {
	this.type = "SP1";
	this.set_power = async function (state) {
		var packet = Buffer.alloc(4, 4);
		packet[0] = state;
		return await this.sendPacket(0x66, packet);
	}
}


device.prototype.sp2 = function () {
	this.type = "SP2";
	this.set_power = async function (state) {
		//"""Sets the power state of the smart plug."""
		var packet = Buffer.alloc(16, 0);
		packet[0] = 2;
		packet[4] = state ? 1 : 0;
		await this.sendPacket(0x6a, packet);
	}

	this.check_power = function () {
		//"""Returns the power state of the smart plug."""
		var packet = Buffer.alloc(16, 0);
		packet[0] = 1;
		this.sendPacket(0x6a, packet);
	}


}

device.prototype.a1 = function () {
	this.type = "A1";
	this.check_sensors = async function () {
		var packet = Buffer.alloc(16, 0);
		packet[0] = 1;
		return await this.sendPacket(0x6a, packet);

	}

	this.check_sensors_raw = function () {
		var packet = Buffer.alloc(16, 0);
		packet[0] = 1;
		this.sendPacket(0x6a, packet);
		/*
			 err = response[0x22] | (response[0x23] << 8);
			 if(err == 0){
			 data = {};
			 aes = AES.new(bytes(this.key), AES.MODE_CBC, bytes(self.iv));
			 payload = aes.decrypt(bytes(response[0x38:]));
			 if(type(payload[0x4]) == int){
			 data['temperature'] = (payload[0x4] * 10 + payload[0x5]) / 10.0;
			 data['humidity'] = (payload[0x6] * 10 + payload[0x7]) / 10.0;
			 data['light'] = payload[0x8];
			 data['air_quality'] = payload[0x0a];
			 data['noise'] = payload[0xc];
			 }else{
			 data['temperature'] = (ord(payload[0x4]) * 10 + ord(payload[0x5])) / 10.0;
			 data['humidity'] = (ord(payload[0x6]) * 10 + ord(payload[0x7])) / 10.0;
			 data['light'] = ord(payload[0x8]);
			 data['air_quality'] = ord(payload[0x0a]);
			 data['noise'] = ord(payload[0xc]);
			 }
			 return data;
			 }
			 */
	}
}


device.prototype.rm = function () {
	this.type = "RM2";
	this.checkData = async function () {
		var packet = Buffer.alloc(16, 0);
		packet[0] = 4;
		return await this.sendPacket(0x6a, packet);
	}

	this.sendData = async function (data) {
		packet = new Buffer([0x02, 0x00, 0x00, 0x00]);
		packet = Buffer.concat([packet, data]);
		return await this.sendPacket(0x6a, packet);
	}

	this.enterLearning = async function () {
		var packet = Buffer.alloc(16, 0);
		packet[0] = 3;
		return await this.sendPacket(0x6a, packet);
	}

	this.checkTemperature = async function () {
		var packet = Buffer.alloc(16, 0);
		packet[0] = 1;
		return await this.sendPacket(0x6a, packet);
	}

	this.on("payload", (err, payload) => {
		var param = payload[0];
		switch (param) {
			case 1:
				var temp = (payload[0x4] * 10 + payload[0x5]) / 10.0;
				this.emit("temperature", temp);
				break;
			case 4: //get from check_data
				var data = Buffer.alloc(payload.length - 4, 0);
				payload.copy(data, 0, 4);
				this.emit("rawData", data);
				break;
			case 3:
				break;
			case 4:
				break;
		}
	});
}

