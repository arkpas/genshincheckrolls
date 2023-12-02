const i18n = require('i18n')
const { round } = require("./utils");

function formatArtifactsForOutput(artifacts, separator, valueWrapOpen, valueWrapClose) {
    const outputArray = [];
    separator = separator ?? ";";
    valueWrapOpen = valueWrapOpen ?? "\"";
    valueWrapClose = valueWrapClose ?? "\"";
    
    outputArray.push(
		`${valueWrapOpen}Character${valueWrapClose}${separator}` + 
        `${valueWrapOpen}Piece${valueWrapClose}${separator}` + 
        `${valueWrapOpen}Main stat${valueWrapClose}${separator}` + 
        `${valueWrapOpen}Set${valueWrapClose}${separator}` + 
        `${valueWrapOpen}Substats${valueWrapClose}${separator}` +
        `${valueWrapOpen}Valuable weight${valueWrapClose}${separator}` +
        `${valueWrapOpen}General weight${valueWrapClose}`
	);

    artifacts.forEach(artifact => {
        outputArray.push(
            `${valueWrapOpen}${formatLocation(artifact.location)}${valueWrapClose}${separator}` + 
            `${valueWrapOpen}${formatSlot(artifact.slotKey)}${valueWrapClose}${separator}` + 
            `${valueWrapOpen}${formatMainStat(artifact.mainStatKey)}${valueWrapClose}${separator}` + 
            `${valueWrapOpen}${formatSet(artifact.setKey)}${valueWrapClose}${separator}` + 
            `${valueWrapOpen}${formatSet(artifact.futureSetKey)}${valueWrapClose}${separator}` + 
            `${valueWrapOpen}${formatArtifactSubstatsForOutput(artifact.substats)}${valueWrapClose}${separator}` +
            `${valueWrapOpen}${formatRollsWeight(artifact.valuableRollsWeight)}${valueWrapClose}${separator}` +
            `${valueWrapOpen}${formatRollsWeight(artifact.allRollsWeight)}${valueWrapClose}`
		);
    })

    return outputArray.join("\n");
}

function formatArtifactsAsJson(artifacts) {
    const result = JSON.parse(JSON.stringify(artifacts));
    
    result.forEach(artifact => {
        artifact.character = formatLocation(artifact.location);
        artifact.slot = formatSlot(artifact.slotKey);
        artifact.mainStat = formatMainStat(artifact.mainStatKey);
        artifact.set = formatSet(artifact.setKey);
        artifact.futureSet = formatSet(artifact.futureSetKey);
        artifact.substatsFormatted = formatArtifactSubstatsForOutput(artifact.substats);
        artifact.valuableRollsValue = formatRollsWeight(artifact.valuableRollsWeight);
        artifact.allRollsValue = formatRollsWeight(artifact.allRollsWeight);
    })

    return result;
}

function formatArtifactSubstatsForOutput(substats) {
    const outputArray = [];

    substats.forEach(substat => {
        outputArray.push(`${i18n.__(substat.key)} [${substat.value}]`);
    })

    return outputArray.join(" / ");
}

function formatLocation(location) {
    return location.split(/(?=[A-Z])/).join(" ");
}

function formatSlot(slot) {
    return i18n.__(slot);
}

function formatMainStat(mainStat) {
    return i18n.__(mainStat);
}

function formatSet(set) {
    return set.split(/(?=[A-Z])/).join(" ");
}

function formatRollsWeight(rollsWeight) {
    return round(rollsWeight * 100, 0);
}

module.exports = { formatArtifactsForOutput, formatArtifactsAsJson };