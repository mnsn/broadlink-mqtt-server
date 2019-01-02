# Node js app for home automation with broadlink and google home
based on [this blog](https://medium.com/@dtinth/remotely-turning-on-my-air-conditioner-through-google-assistant-1a1441471e9d) and using [this nodejs to broadlink lib](https://github.com/momodalo/broadlinkjs)

this app provides a simple server for controlling broadlink devices from google home.

in order to work with this sample you should register an mqtt account for instance 
in https://www.cloudmqtt.com/ 

the server part is running on your local network
and there is the client part that runs on a machine in the cloud with public endpoint or a static ip

Define scenes
-------
add the scene name and commands to `scenes-data.json`

for example:
```json
{
  "switchInput": [{"topic":"tv","action":"input"},{"topic":"tv","action":"input"},{"topic":"tv","action":"ok"}],
  "secondScene": [{"topic":"devicename","action":"action"},{}]
}
```
Running the server on
--------
in order to run on windows you need to:
1) provide your internal network ip prefix
or your ip in a global environment called `IP_PREFIX`
2) find your broadcast ip by calling ipconfig as described [here](https://documentation.progress.com/output/ua/OpenEdge_latest/index.html#page/gsins/determining-the-broadcast-address.html)
3) set global environment called `BROADCAST_ADDRESS` with your broadcast address (or your broadlink address)

you can also add a config.json to the root of your project with the above parameters
####for example run
```bash
$ IP_PREFIX=10.0.0 BROADCAST_ADDRESS=10.0.0.255 node yourApp.js
```
##### config.json example
```json
{
  "BROADCAST_ADDRESS": "10.0.0.255",
  "MQTT_URL": "mqtts://{{username}}:{{password}}@{{mqtt url}}:{{port}}",
  "IP_PREFIX": "10.0.0"
}
```
you can also just put your broadlink ip as the broadcast address, if you like