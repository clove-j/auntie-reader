const fs = require("fs");

// Load the deck
const deck = require("./decks/english.json");

// Prepare CSV content
let csv = "Word,Translation,Audio,Image\n";

deck.forEach(entry => {
  const word = entry.word || "";
  const translation = entry.translation || "";
  const audio = entry.audio || "";
  const image = entry.image || "";
  csv += `"${word}","${translation}","${audio}","${image}"\n`;
});

// Save to file
fs.writeFileSync("anki-deck.csv", csv);
console.log("✅ Deck exported to anki-deck.csv");
