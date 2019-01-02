# Client side app
* should be deployed to your favorite cloud, or anywhere with global domain that can be provided to IFTT.
* this application should publish commands to your local network server using mqtt.
* requires your `MQTT_URL` as a global enviorment
* you can use aserverless function instead of this client follow [this link](https://medium.com/@dtinth/remotely-turning-on-my-air-conditioner-through-google-assistant-1a1441471e9d) (section D) for more.
## After deploying 
go to IFTT and add an applet
* Trigger: Google Assistant — Say a simple phrase. e.g. “turn on Streamer.”
* Action: Webhooks — Make a web request. Put in the URL from previous step.

the endpoint for google assistant needs to be something like
`https://{{your endpoint}}/sendCommand?topic={device}&message={action}`

to teach the server new command call
`https://{{your endpoint}}/sendCommand?topic=learn&message={deviceName}:{action}`

To run a previous defined scene call
`https://{{your endpoint}}/sendCommand?topic=scene&message={scene name}`