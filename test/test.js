'use strict';
let broadlink = require('../index');
let fs = require('fs');

var b = new broadlink();

b.on("deviceReady", (dev) => {
    var timer = setInterval(function(){
        console.log("send check!");
        dev.checkData();
    }, 1000);

    dev.on("temperature", (temp)=>{
        console.log("get temp "+temp);
        dev.enterLearning();
    });

    dev.on("rawData", (data) => {
        let obj={a:{}};
        obj.a=data;
			//let json = JSON.stringify(data);

			fs.writeFile("test1", JSON.stringify(obj), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
            clearInterval(timer);
        }); 
    });
    dev.checkTemperature();

});

b.discover(undefined,(ans)=>{
			console.log(ans);
});