let redis = require("redis");
let url = 'redis://127.0.0.1:6379'
let redisClient = redis.createClient(
    {
        url,
        // password: 'MyPass321#'
    }
);
redisClient.connect().catch(console.error)
    .then(async () => {
        await setkeydata('rinku1', { status: true }, 60 * 60);
        console.log('Connected to Redis server successfully');
    });
// redisClient.on('error', err => console.log('Redis Client Error', err));


async function getkeydata(key) {
    let result;
    let data = await redisClient.get(key);
    if (data)
        result = JSON.parse(data);
    else
        result = null;
    return result;
}
function setkeydata(key, data, timing) {
    let result;
    redisClient.set(key, JSON.stringify(data), { EX: timing });
    return data;

}
function deletedata(key) {
    redisClient.del(key);
}

module.exports = { getkeydata, setkeydata, deletedata }