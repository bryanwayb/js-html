'use strict';

var fs = require('fs'),
    jshtml = require('../lib/index.js'),
    colors = require('colors');

function bench(callback) { // Bench the absolute amount of cycles that are executed within a specified amount of time
    var startTime,
        diffTime,
        i = 0,
        totalTime = 0,
        runTime = 1e9;

    for(; totalTime < runTime; i++) {
        startTime = process.hrtime();
        callback();
        diffTime = process.hrtime(startTime);
        totalTime += diffTime[0] * 1e9 + diffTime[1];
    }

    var cycles = i * (runTime / totalTime);
    return {
        timePerCycle: runTime / cycles,
        cycles: cycles
    };
}

function printBench(name, results) {
    var timeColor;
    if(results.timePerCycle < 1.5e4) {
        timeColor = colors.green;
    }
    else if(results.timePerCycle >= 1.5e4 && results.timePerCycle < 1.5e5) {
        timeColor = colors.yellow;
    }
    else {
        timeColor = colors.red;
    }
    console.log('  ' + name + ':\n   ->' + timeColor(Math.floor(results.timePerCycle)) + ' ns/cycle\n   ->' + timeColor(results.cycles) + ' cycles/s');
}

function runBench(script) {
    printBench('COMPILE', bench(function() {
        script.compile();
    }));

    printBench('VM INIT', bench(function() {
        script.makeFunction();
    }));

    printBench('RENDER', bench(function() {
        script.render();
    }));
}

var fileList = fs.readdirSync('./test/docs/');
for(var i = 0; i < fileList.length; i++) {
    var filepath = './test/docs/' + fileList[i];
    var script = jshtml.script();

    console.log(colors.bold(filepath));
    script.setScriptFile(filepath);
    runBench(script);
}