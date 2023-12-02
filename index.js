const stats = require("./data/baseStats.json");
const config = {...require("./data/defaultConfig.json"), ...require("./data/userConfig.json")};
const { parseArgs } = require("node:util");
const { readdirSync, lstatSync, readFileSync, writeFileSync } = require("fs");
const i18n = require("i18n");
const { formatArtifactsForOutput, formatArtifactsAsJson } = require("./artifactFormatter");
const { round } = require("./utils");

const outputPath = "./output/";
const calculatedStatsPath = outputPath + "calculatedStats.json";

console.log(config);

i18n.configure({
    locales: ["en"],
    directory: "./i18n"
})

function main() {
    const optimizerData = loadMostRecentOptimizerData(config.optimizerDataPath);
    
    // Get only artifacts equipped by characters
    const artifacts = optimizerData.artifacts.filter(artifact => artifact.location && artifact.location != "Traveler");
    const characterMetas = optimizerData.charMetas;
    
    calculateSetPiecesForEachCharacter(artifacts, characterMetas);
    calculateSubstatWeights(artifacts);

    const weakArtifacts = retrieveWeakArtifacts(artifacts, characterMetas);
    const statistics = calculateStatistics(weakArtifacts);

    saveToFile(outputPath + "allArtifacts.json", JSON.stringify(artifacts, null, 4));
    saveToFile(outputPath + "weakArtifacts.json", JSON.stringify(weakArtifacts, null, 4));
    saveToFile(outputPath + "characterMetas.json", JSON.stringify(characterMetas, null, 4));
    saveToFile(outputPath + "prettyDisplay/data.js", "const weakArtifacts = " + JSON.stringify(formatArtifactsAsJson(weakArtifacts), null, 4) + ";");
    saveToFile(outputPath + "weakArtifacts.csv", formatArtifactsForOutput(weakArtifacts));
    saveToFile(outputPath + "statistics.txt", formatStatisticsForOutput(statistics));
}

function shouldRecalculateRolls() {
    const { values } = parseArgs({
		options: {
			"recalculateRolls": {
				type: "boolean"
			},
		},
	});

    return values.recalculateRolls ? true : false;
}

function loadCalculatedStats() {
    try {
        return JSON.parse(readFileSync(calculatedStatsPath));
    }
    catch (e) {
        console.error(`Calculated stats file was not found under path: ${calculatedStatsPath}`);
        return null;
    }
}

function saveToFile(path, content) {
    try {
        writeFileSync(path, content);
    }
    catch (e) {
        console.error(`Error saving calculated stats under path: ${path}`);
    }
}

function calculateSubstatWeights(artifacts) {
    let calculatedStats = loadCalculatedStats();

    if (!calculatedStats || shouldRecalculateRolls()) {
        // Calculate all possible rolls for all statistics
        calculatedStats = Array.from(stats);
        calculatedStats.forEach(item => item.allPossibleRolls = calculateAllPossibleSubstatValues(item.baseRolls, item.decimalPlaces));
        
        // Save them
        saveToFile(calculatedStatsPath, JSON.stringify(calculatedStats, null, 4));
    }

    // Go through all artifacts and "rate" the rolls on them, so basically assign them weights based on previously calculated rolls
    artifacts.forEach((artifact) =>
		artifact.substats = artifact.substats.map((substat) => {
            let calculatedWeight = calculateSubstatWeight(substat, calculatedStats);
            
            return {
                key: substat.key,
                value: substat.value,
                weight: calculatedWeight.weight,
                maxWeight: calculatedWeight.maxWeight
            };
        })
	);
}

function calculateSubstatWeight(artifactSubstat, calculatedStats) {
    if (!artifactSubstat) {
        console.error("Substat is invalid, returning null!");
        return null;
    }

    // Try to find the statistic in our rolls table
    const stat = calculatedStats.find((stat) => stat.key == artifactSubstat.key);

    if (!stat) {
        console.error(`Could not find stat with key ${artifactSubstat.key}`);
        return null;
    }

    // Having the statistic with all possible rolls, try to find the roll value matching the roll on artifact
    const substatFound = stat.allPossibleRolls.find((roll) => parseFloat(roll.value) == parseFloat(artifactSubstat.value));
	
    return {
        weight: substatFound ? substatFound.weight : null,
        maxWeight: substatFound ? substatFound.rolls.length : null
    };
}

function calculateAllPossibleSubstatValues(baseStatRolls, decimalPlaces) {
	if (
		!Array.isArray(baseStatRolls) ||
		baseStatRolls.length != 4 ||
		baseStatRolls.filter((roll) => Number.isNaN(roll)).length
	) {
		console.error("Bad arg, please pass array of four numbers");
		return baseStatRolls;
	}

	const sortedRolls = Array.from(baseStatRolls).sort(
		(a, b) => parseFloat(a) - parseFloat(b)
	);

    let weight = 0.7;
    const weightedRolls = [];

    for (let i = 0; i < 4; i++) {
        weightedRolls.push({
            value: sortedRolls[i],
            roundedValue: round(sortedRolls[i], decimalPlaces),
			weight: weight,
            rolls: [round(sortedRolls[i], decimalPlaces)]
        });

        weight = round(weight + 0.1, 1);
    }

    let results = [...weightedRolls];

    for (let i = 0; i < 5; i++) {
        const newResults = [];

		for (let result of results) {
			for (let weightedRoll of weightedRolls) {
                const newValue = parseFloat(result.value) + parseFloat(weightedRoll.value);
                const newWeight = parseFloat(result.weight) + parseFloat(weightedRoll.weight);

                newResults.push({
                    value: newValue,
                    weight: newWeight,
                    rolls: [...result.rolls, weightedRoll.roundedValue].sort((a, b) => compareNumbers(a, b))
                })
			}
		}

		results.push(...newResults);
    }

    roundSubstatValuesAndWeights(results, decimalPlaces);
    sortSubstats(results);
    results = deduplicateSubstats(results);

    return results;
}

function roundSubstatValuesAndWeights(substats, decimalPlaces) {
    substats.forEach((substat) => {
		substat.value = round(substat.value, decimalPlaces);
		substat.weight = round(substat.weight, 1);
	});
}

function sortSubstats(substats) {
    substats.sort((a, b) => {
        return compareSubstats(a, b);
	});
}
function compareNumbers(a, b) {
    return parseFloat(a) - parseFloat(b);
}

function compareSubstats(a, b) {
    return compareNumbers(a.value, b.value) || compareRollsArrays(a.rolls, b.rolls);
}

function compareRollsArrays(a, b) {
    if (a.length != b.length) {
        return a.length - b.length;
    }

    const aTemp = Array.from(a).sort((x, y) => compareNumbers(y, x));
    const bTemp = Array.from(b).sort((x, y) => compareNumbers(y, x));

    for (let i = 0; i < aTemp.length ; i++) {
        const compareResult = compareNumbers(aTemp[i], bTemp[i])
        if (compareResult != 0) {
            return compareResult;
        }
    }

    return 0;
}

function deduplicateSubstats(substats) {
    const results = [];

    for (let i = 0; i < substats.length; i++) {
        // substats are sorted in a way that last occurence of substat with particular value in array is the version that we want
        // so set the "i" to that last index to skip any other substats on the way
        // and add the desired substat to results array

        let currentSubstat = substats[i];
        i = substats.findLastIndex(substat => substat.value == currentSubstat.value);
        results.push(substats[i]);
    }

    return results;
}



function loadMostRecentOptimizerData(path) {
    try {
        const filesSorted = readdirSync(path)
            .map(fileName => path + "/" + fileName)
			.filter(filePath => lstatSync(filePath).isFile())
			.map(filePath => ({ filePath, mtime: lstatSync(filePath).mtime }))
			.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        if (filesSorted.length) {
            return JSON.parse(readFileSync(filesSorted[0].filePath));
        }
        else {
            throw new Error(`No files in directory ${path}`);
        }
    }
    catch (e) {
        console.error(`Cannot read from ${path}`);
        console.error(e);
        throw e;
    }

}

function retrieveWeakArtifacts(artifacts, characterMetas) {
    const weakArtifacts = artifacts.filter(artifact => {
        const valuableRollsWeight = artifact.substats.reduce((accumulator, substat) => round(accumulator + (isValuableStat(substat.key, artifact.location, characterMetas) ? substat.weight : 0), 1), 0);
        const allRollsWeight = artifact.substats.reduce((accumulator, substat) => round(accumulator + substat.weight, 1), 0);

        artifact.valuableRollsWeight = valuableRollsWeight;
        artifact.allRollsWeight = allRollsWeight;

        return valuableRollsWeight < config.rollsMinWeight;
    });

    sortArtifacts(weakArtifacts);
    calculateFutureSet(weakArtifacts, characterMetas);

    return weakArtifacts;
}

// This method will calculate if particular artifact needs to be from the same set that it is currently
// or if it can be swapped by off-set piece
// For example Nahida can have 5 Deepwood artifacts, so if one of them needs change, it could be from 
// different set (like Noblesse) while still keeping Deepwood set bonus
function calculateFutureSet(artifacts, characterMetas) {
    artifacts.forEach(artifact => {
        const character = characterMetas.find((character) => (character.id == artifact.location));

        if (character) {
            setMetadata = character.sets.find((set) => set.id == artifact.setKey);

            if (setMetadata && (setMetadata.pieces != 4 && setMetadata.pieces != 2)) {
                artifact.futureSetKey = i18n.__("any_set");
            }
            else {
                artifact.futureSetKey = artifact.setKey;
            }
        }

    })
}

function sortArtifacts(artifacts) {
    artifacts.sort((a, b) => {
		if (a.location < b.location) {
			return -1;
		}

		if (a.location > b.location) {
			return 1;
		}

		return a.sumOfWeights - b.sumOfWeights
	});

    return artifacts;
}

function isValuableStat(stat, character, characterMetas) {
    const charMeta = characterMetas.find(charMeta => charMeta.id == character);
    const valuableStats = charMeta && charMeta.rvFilter.length < 10 ? charMeta.rvFilter : []; 

    return valuableStats.indexOf(stat) >= 0;
}

function calculateStatistics(artifacts) {
    const grouped = artifacts.reduce((setKeyGroup, artifact) => {
        const { setKey } = artifact;
        const existingGroup = setKeyGroup.find(set => set.key == setKey);

        if (existingGroup) {
            existingGroup.characters.push(`${artifact.location.split(/(?=[A-Z])/).join(" ")} (${i18n.__(artifact.slotKey)})`);
        }
        else {
            setKeyGroup.push({
                key: setKey,
                characters: [`${artifact.location.split(/(?=[A-Z])/).join(" ")} (${i18n.__(artifact.slotKey)})`]
            })
        }

        return setKeyGroup;
    }, []);

    return grouped.sort((a, b) => (b.characters.length - a.characters.length));
}

function formatStatisticsForOutput(statistics) {
    const output = [];

    statistics.forEach(item => {
        output.push(`${item.key.split(/(?=[A-Z])/).join(" ")}: ${item.characters.length}`);
    })

    return output.join("\n");
}

// Calculates for each character how many pieces of particular set it has equipped
// For example Nahida can have 4 Deepwood pieces and 1 Viridescent piece
function calculateSetPiecesForEachCharacter(artifacts, characterMetas) {
    artifacts.forEach(artifact => {
        const character = characterMetas.find((character) => (character.id == artifact.location));

        if (character) {
            if (!character.sets) {
                // Initialize array if it is not there yet
                character.sets = [];
            }

            const set = character.sets.find(set => set.id == artifact.setKey);

            if (set) {
                // Since we found another piece of the same artifact set, we just add one piece
                set.pieces += 1;
            }
            else {
                // We did not find any data for current artifact set, so we create it
                character.sets.push({
                    id: artifact.setKey,
                    pieces: 1,
                });
            }
        }
        else {
            // We do not have the character data in array yet, so we need to create it
            characterMetas.push({
                id: artifact.location, 
                sets: [{
                    setKey: artifact.setKey,
                    setPieces: 1,
                }]
            });
        }
    });
}

main();