const mqtt = require('mqtt');
const brokers = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://mqtt.eclipseprojects.io:443/mqtt',
  'wss://test.mosquitto.org:8081',
  'wss://public.mqtthq.com:8084/mqtt'
];

brokers.forEach(b => {
  const start = Date.now();
  const c = mqtt.connect(b, { connectTimeout: 3000 });
  c.on('connect', () => {
    console.log(b, 'connected in', Date.now() - start, 'ms');
    c.end();
  });
  c.on('error', (err) => {
    console.log(b, 'error', err.message);
    c.end();
  });
});
