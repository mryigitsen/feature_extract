import Meyda from "meyda";
import  {WavManager as WavLoader} from "./wav-loader.js";
import * as fs from "fs";
import * as path from "path";

var features = {};
var buffer = [];
var frameCount = 0;
var flag = true;

function waitUntilTrue(condition, delay = 100) {
    return new Promise((resolve) => {
        const checkCondition = async () => {
            while (!condition()) {
                await new Promise((r) => setTimeout(r, delay));
            }
            resolve();
        };
        checkCondition();
    });
}

function getAllFilesInDirectory(directoryPath) {
    const files = [];

    function traverseDirectory(currentPath) {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                traverseDirectory(itemPath);
            } else {
                files.push(itemPath);
            }
        }
    }

    traverseDirectory(directoryPath);
    return files;
}

function typedToArray(t) {
    return Array.prototype.slice.call(t);
}

// utility to convert arrays to typed F32 arrays
function arrayToTyped(t) {
    return Float32Array.from(t);
}

function reset_meyda()
{
    features = {};
    for (var i = 0; i < featuresToExtract.length; i++) {
        features[featuresToExtract[i]] = [];
    }
    buffer = [];
    frameCount = 0;
    flag = true;
}
//helper method to extract features for this chunk
function extractFeatures(chunk, featuresToExtract) {
    //make it a F32A for efficiency
    var frame = arrayToTyped(chunk);
    //run the extraction of selected features
    var fset = Meyda.extract(featuresToExtract, frame);
    for (let j = 0; j < featuresToExtract.length; j++) {
        const feature = fset[featuresToExtract[j]];
        features[featuresToExtract[j]].push(feature);
    }
}

var FRAME_SIZE = 512
var HOP_SIZE = 512;
var MFCC_COEFFICIENTS = 13;
Meyda.bufferSize = FRAME_SIZE;
Meyda.hopSize = HOP_SIZE;
Meyda.windowingFunction = "hanning";
Meyda.numberOfMFCCCoefficients = MFCC_COEFFICIENTS;

var featuresToExtract = ["zcr", "rms"];

reset_meyda();

var wl = new WavLoader(
    function (config) {
        Meyda.sampleRate = config.sampleRate;
    },
    function (chunk) {
        //convert to normal array so we can concatenate
        var _chunk = typedToArray(chunk);
        buffer = buffer.concat(_chunk);
        //if we're long enough, splice the frame, and extract features on it
        while (buffer.length >= FRAME_SIZE) {
            extractFeatures(buffer.slice(0, FRAME_SIZE), featuresToExtract);
            buffer.splice(0, HOP_SIZE);
            frameCount++;
        }
    },
    async function (data, path) {
        //check if there's still something left in our buffer
        if (buffer.length) {
            //zero pad the buffer at the end so we get a full frame (needed for successful spectral analysis)
            for (let i = buffer.length; i < 2 * FRAME_SIZE - HOP_SIZE; i++) {
                buffer.push(0);
            }
            //extract features for zero-padded frame
            while (buffer.length >= FRAME_SIZE) {
                extractFeatures(buffer.slice(0, FRAME_SIZE), featuresToExtract);
                buffer.splice(0, HOP_SIZE);
                frameCount++;
            }
        }
        await fs.promises.writeFile("features_json/"+path.split(".")[0] +'_features.json', JSON.stringify(features, null, 2));
        reset_meyda()
    }
);

async function openFile(path) {
    flag = false
    console.log("Opening file: ", path)
    await wl.open(path);
    await waitUntilTrue(() => flag);
    console.log("File closed")
}

const directoryPath = 'audio';
const allFiles = getAllFilesInDirectory(directoryPath);
for (const file of allFiles) {
    await openFile(file);
}
