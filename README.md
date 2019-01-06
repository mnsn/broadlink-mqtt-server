# Node js app for home automation with broadlink and google home
Based on [this blog](https://medium.com/@dtinth/remotely-turning-on-my-air-conditioner-through-google-assistant-1a1441471e9d) and using [this nodejs broadlink lib](https://github.com/momodalo/broadlinkjs)

This app provides a simple server for controlling broadlink devices from google home.

## Getting Started

In order to work with this sample you should register an mqtt account for instance 
in https://www.cloudmqtt.com/ 

The server part is running on your local network
and there is the [client](/client) part that runs on a machine in the cloud with public endpoint or a static ip

### Run the server

#### Running the server on linux\mac

##### Option 1
run:
```bash
$ npm install
$ MQTT_URL=mqtts://{{username}}:{{password}}@{{mqtt url}}:{{port}} node server.js
```
Send a request to your client endpoint,<br/> 
something like `https://{{your endpoint}}/sendCommand?topic=learn&message={deviceName}:{action}`

see that your broadlink enters learning mode

##### Option 2
config.json example: 
```json
{
  "MQTT_URL": "mqtts://{{username}}:{{password}}@{{mqtt url}}:{{port}}"
}
```

then just run

```bash
$ npm install
$ node server.js

```
Send a request to your client endpoint,<br/> 
something like `https://{{your endpoint}}/sendCommand?topic=learn&message={deviceName}:{action}`

see that your broadlink enters learning mode



#### Running the server on Windows


In order to run on windows you need to:
1) Provide your internal network ip prefix(or your full ip if you prefer)
in a global environment called `IP_PREFIX`
2) Find your broadcast ip by calling ipconfig as described [here](https://documentation.progress.com/output/ua/OpenEdge_latest/index.html#page/gsins/determining-the-broadcast-address.html)
3) Set global environment called `BROADCAST_ADDRESS` with your broadcast address (or your broadlink address if you prefer)

You can also add a config.json to the root of your project with the above parameters

##### Option 1
run:
```bash
$ npm install
$ IP_PREFIX=10.0.0 BROADCAST_ADDRESS=10.0.0.255 MQTT_URL=mqtts://{{username}}:{{password}}@{{mqtt url}}:{{port}} node server.js
```
Send a request to your client endpoint,<br/> 
something like `https://{{your endpoint}}/sendCommand?topic=learn&message={deviceName}:{action}`

see that your broadlink enters learning mode

##### Option 2
config.json example: 
```json
{
  "BROADCAST_ADDRESS": "10.0.0.255",
  "MQTT_URL": "mqtts://{{username}}:{{password}}@{{mqtt url}}:{{port}}",
  "IP_PREFIX": "10.0.0"
}
```

then just run

```bash
$ npm install
$ node server.js

```
Send a request to your client endpoint,<br/> 
something like `https://{{your endpoint}}/sendCommand?topic=learn&message={deviceName}:{action}`

see that your broadlink enters learning mode


Define scenes
-------

Scenes are several commands that runs on a single call

Add the scene name and commands to `scenes-data.json`

for example:
```json
{
  "switchInput": [{"topic":"tv","action":"input"},{"topic":"tv","action":"input"},{"topic":"tv","action":"ok"}],
  "secondScene": [{"topic":"devicename","action":"action"},{}]
}
```
