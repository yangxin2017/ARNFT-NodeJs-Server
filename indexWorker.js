const { createCanvas, loadImage, Image } = require('canvas')
const { Worker } = require('worker_threads')
const gfs = require('fs')

// console.log('init---------')
// let w = new Worker('./works/job.js')
// w.postMessage({ id: 0, type: 'load' })
// console.log('init---------OK')

var globalResult = {}
const PerPageCount = 10
function InitResults() {
  var baseNFTUrl = './data/ksh/heise/'
  var dirs = gfs.readdirSync(baseNFTUrl)
  for (let i = 0;i < dirs.length;i++) {
    let inx = i
    if (dirs[i].indexOf('-') >= 0) {
      globalResult[`res_${inx}`] = dirs[inx]
    }
  }
}
InitResults()

var globalWorks = []
var globalCallback = []
for (let i = 0;i < 20;i++) {
  let w = new Worker('./works/job.js')
  w.postMessage({ id: i, type: 'load' })
  w.on('message', ev => {
    if(globalCallback[i]) {
      globalCallback[i](i, ev)
    }
  })
  globalCallback.push(() => {})
  globalWorks.push(w)
}

console.log('===================================================')
var express = require('express');
var app = express();

var bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/api/check', async(req, res) => {
  let img = new Image()
  img.src = req.body.imgData
  img.onerror = err => console.log(err)
  let pw = 640, ph = 480
  const canvas1 = createCanvas(pw, ph)
  let ctx = canvas1.getContext('2d')
  ctx.drawImage(img, 0, 0, pw, ph)
  let d = ctx.getImageData(0, 0, pw, ph)

  let findResult = false
  const fun = (i, ev) => {
    let inx = i * PerPageCount + ev.data
    if (!findResult) {
      findResult = true
      res.send({code: 200, data: globalResult[`res_${inx}`], message: ""})
    }
  }

  for (let i = 0;i < globalWorks.length;i++) {
    globalCallback[i] = fun
    globalWorks[i].postMessage({ type: 'check', imageData: d.data, id: i })
  }
  
  d = null
  canvas1 = null

  setTimeout(() => {
    if (!findResult) {
      findResult = true
      res.send({code: 200, data: 'NOT', message: ""})
    }
  }, 1000)

});

var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Address: http://%s:%s", host, port)
})
