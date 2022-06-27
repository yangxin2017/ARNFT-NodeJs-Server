const { parentPort } = require('worker_threads');
const { ARControllerNFT, ARToolkitNFT } = require('../dist/ARToolkitNFT')
const gfs = require('fs')

const PerPageCount = 10

var ar = null

function GetDirs(index) {
  var arrDirs = []
  var baseNFTUrl = './data/ksh/heise/'
  var dirs = gfs.readdirSync(baseNFTUrl)
  for (let i = 0;i < PerPageCount;i++) {
    let inx = PerPageCount * index + i
    if (inx < dirs.length) {
      if (dirs[i].indexOf('-') >= 0) {
        arrDirs.push(`${baseNFTUrl}${dirs[inx]}/${dirs[inx]}`)
      }
    }
  }
  return arrDirs
}

async function LoadAr(index) {
  let files = GetDirs(index)
  let artoolkitNFT = await new ARToolkitNFT().init();

  ar = new ARControllerNFT(640, 480, './data/camera_para.dat');
  ar.artoolkitNFT = artoolkitNFT
  // load the camera
  ar.cameraId = await ar.artoolkitNFT.loadCamera(ar.cameraParam)

  // setup
  ar.id = ar.artoolkitNFT.setup(ar.width, ar.height, ar.cameraId);

  ar._initNFT();

  const params =
    ar.artoolkitNFT.frameMalloc;
  ar.framepointer = params.framepointer;
  ar.framesize = params.framesize;
  ar.videoLumaPointer = params.videoLumaPointer;

  ar.dataHeap = new Uint8Array(
    ar.artoolkitNFT.instance.HEAPU8.buffer,
    ar.framepointer,
    ar.framesize
  );
  ar.videoLuma = new Uint8Array(
    ar.artoolkitNFT.instance.HEAPU8.buffer,
    ar.videoLumaPointer,
    ar.framesize / 4
  );

  ar.camera_mat = new Float64Array(
    ar.artoolkitNFT.instance.HEAPU8.buffer,
    params.camera,
    16
  );
  ar.marker_transform_mat = new Float64Array(
    ar.artoolkitNFT.instance.HEAPU8.buffer,
    params.transform,
    12
  );

  ar.setProjectionNearPlane(0.1);
  ar.setProjectionFarPlane(1000);

  ////////////////
  ar.loadNFTMarkers(files, async (ids) => {
    console.log('ok======', ids)
  })
}

function Process(image, inx) {
  let isHave = false
  let result = ar.detectMarker(image);
  if (result != 0) {
    console.error("[ARControllerNFT]", "detectMarker error:", result);
  }

  let k, o;
  // get NFT markers
  for (k in ar.nftMarkers) {
    o = ar.converter().nftMarkers[k];
    o.inPrevious = o.inCurrent;
    o.inCurrent = false;
  }

  // detect NFT markers
  let nftMarkerCount = ar.nftMarkerCount;
  ar.detectNFTMarker();

  // in ms
  const MARKER_LOST_TIME = 200;

  for (let i = 0; i < nftMarkerCount; i++) {
    let nftMarkerInfo = ar.getNFTMarker(i);

    if (nftMarkerInfo.found) {
      ar.nftMarkerFound = i;
      ar.nftMarkerFoundTime = Date.now();
      //////
      ar.nftMarkerFound = false;
      isHave = true
      let inx = ar.id + i
      isHave = inx
      
      parentPort.postMessage({ type: 'find', data: inx })
      break;

    } else if (ar.nftMarkerFound === i) {
      if (Date.now() - ar.nftMarkerFoundTime > MARKER_LOST_TIME) {
        ar.nftMarkerFound = false;
        console.log('Found LOST')
      }
    }
  }
  image = null
  return isHave
}

parentPort.on("message", async (obj) => {
  if (obj.type == 'load') {
    LoadAr(obj.id)
  } else if (obj.type == 'check') {
    Process({ data: obj.imageData }, obj.id)
  }

});
