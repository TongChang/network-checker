'use strict';

// system module
const fs   = require('fs');
const path = require('path');

// third party module
const PING = require('ping');

// gpio root path
const GPIO_PATH = '/sys/class/gpio';

// use pin number
const PIN_NO = 25;

// const
const OUT = 'out';
const ON  = '1';
const OFF = '0';

// gpio control path
const GPIO_EXPORT    = path.join(GPIO_PATH, 'export');
const GPIO_UNEXPORT  = path.join(GPIO_PATH, 'unexport');
const GPIO_PIN       = path.join(GPIO_PATH, `gpio${PIN_NO}`);
const GPIO_DIRECTION = path.join(GPIO_PIN, 'direction');
const GPIO_VALUE     = path.join(GPIO_PIN, 'value');

// global flag
let isBlinking;

// setting
const CHECKER_SETTING = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/checker-setting.json')));

// ping target
const PING_TARGET_HOST = CHECKER_SETTING.targetHost;
const PING_INTERVAL    = CHECKER_SETTING.intervalSec * 1000;
const BLINK_INTERVAL   = 1000;

// event add on kill
process.on('SIGINT', () => {
  finalize();
});

process.on('SIGTERM', () => {
  finalize();
});

process.on('SIGHUP', () => {
  finalize();
});

process.on('uncaughtException', (err) => {
  console.log(err);
  finalize();
});

// finalize
const finalize = () => {
  console.log('call finalize.');
  clearInterval(blinkLED); 
  fs.writeFileSync(GPIO_VALUE, OFF); 
  fs.writeFileSync(GPIO_UNEXPORT, PIN_NO); 
  console.log('exit program.');
  process.exit(); 
};

// blink toggle
const toggleBlinking = () => {
  isBlinking = !isBlinking;
};

// initialize
const initGPIO = () => {
  console.log('call initialize.');
  // set number
  fs.writeFile(GPIO_EXPORT, PIN_NO, (err) => { 
    // set direction
    fs.writeFileSync(GPIO_DIRECTION, OUT);
  });
};

// do blink
const blinkLED = (value) => {
  fs.writeFile(GPIO_VALUE, value,(err) => {
    if (err) {
      console.error(err);
      console.error(`err write ${value} to file ${GPIO_VALUE}.`);
    }
  });
};

// 0.5sec blink
const blinkLEDOneTime = () => {
  if (!isBlinking) {
    toggleBlinking();
    blinkLED(Number(ON));
  }

  toggleBlinking();
  blinkLED(Number(OFF));
  setTimeout(() => {
    toggleBlinking();
    blinkLED(Number(ON));
  }, BLINK_INTERVAL); 
};

// blink off
const blinkOffLED = () => {
  toggleBlinking();
  blinkLED(Number(OFF));
};

// define main
const main = () => {
  initGPIO();

  // event add on each time
  setInterval(() => {
    PING.promise.probe(PING_TARGET_HOST)
      .then( (result) => {
        if (result.alive) {
          // blink LED
          console.log('ping ok.');
          blinkLEDOneTime();
        } else {
          console.log('ping ng.');
          blinkOffLED();
        }
      });
  }, PING_INTERVAL);
};

// execute
main();

