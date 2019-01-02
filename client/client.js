const mqtt = require('mqtt');

const express=require('express');
const app=express();
//const MQQT_API_KEY='8bd605ca-6539-4428-bc96-8820704540fa';
const MQTT_URL=process.env.MQTT_URL;
if(!MQTT_URL){
	throw new Error('must have global env called MQTT_URL for mqqt');
}
app.get('/sendCommand',(req,res)=>{

	const topic=req.query.topic;
	const message=req.query.message;
	console.log(`sending to topic=${topic} message=${message}`)
	if(!topic||!message){
		return res.status(500).send('missing message or topic');
	}
	const client = mqtt.connect(MQTT_URL);
	client.on('connect', function () {
		client.publish(topic, String(message));
		client.end(false, (ans)=>{
			res.send('ok');
		});
	});
	client.on('error', function (error) {
		res.status(500).send(error);
	});
});
const port=process.env.PORT||8080;
app.listen(port,()=>console.log(`listening on port ${port}`));