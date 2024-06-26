import fs from "fs";
import path from "path";

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

let sound_types = {}

const directoryPath = 'features_json';
const allFiles = getAllFilesInDirectory(directoryPath);
for (const file of allFiles) {
    // Extract sound type:
    let sound_type = file.split('/')[1].split('_')[0];

    // Open JSON file
    let json = JSON.parse(fs.readFileSync(file));

    if(sound_types[sound_type]) {
        // Append to existing array
        // for each feature in the JSON file
        for (const feature in json) {
            if (sound_types[sound_type][feature]) {
                sound_types[sound_type][feature].push(json[feature]);
            } else {
                sound_types[sound_type][feature] = [json[feature]];
            }
        }
    }
    else
    {
        // Create new array
        sound_types[sound_type] = {}
        for (const feature in json) {
            sound_types[sound_type][feature] = [json[feature]];
        }
    }
}

console.log(sound_types);
// Create individual JSON files for each combination of sound type and feature
for (const sound_type in sound_types) {
    for (const feature in sound_types[sound_type]) {
        let features = sound_types[sound_type][feature];
        console.log(features)
        await fs.promises.writeFile("features_split_json/" + sound_type + "_"  + feature+".json", JSON.stringify(features, null, 2));
    }
}
console.log(sound_types);
