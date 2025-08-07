// Enhanced Auntie Reader App JavaScript with Clickable Letter Phonics Playback and UI Toggles
let alphabetDeck = [], wordDeck = [], phonicsDeck = [], sentenceDeck = [];
let currentWord = "";
let currentDeck = [];

const audioEnabledToggle = document.getElementById("audioEnabledToggle");

window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById("loader");
  const app = document.getElementById("app");
  const audio = document.getElementById("loadingSound");

  loader.innerText = "Loading Auntie Reader..."; // simple text

  Promise.all([
    fetch('./decks/phonics-alphabet.json').then(res => res.json()),
    fetch('./decks/english.json').then(res => res.json()),
    fetch('./decks/basic-sentences.json').then(res => res.json())
  ]).then(([alphabet, words, sentences]) => {
    alphabetDeck = alphabet;
    wordDeck = words;
    sentenceDeck = sentences;
    currentDeck = [...alphabetDeck, ...wordDeck];

    setTimeout(() => {
      loader.style.display = "none";
      app.style.display = "block";
      app.style.opacity = 1;
      if (audio) audio.remove();
      initializeAuntieReader();
    }, 1000);
  }).catch(err => {
    console.error("Failed to load decks:", err);
    loader.innerHTML = "❌ Failed to load Auntie Reader. Check your console.";
  });
});

function initializeAuntieReader() {
  const promptDiv = document.getElementById("prompt");
  const inputBox = document.getElementById("input");
  const feedback = document.getElementById("feedback");
  const progress = document.getElementById("progress");
  const modeSelect = document.getElementById("modeSelect");
  const instructionDiv = document.getElementById("instruction");
  const imageElement = document.getElementById("exampleImage");

  const toggleLetter = document.getElementById("toggleLetter");
  const toggleEmoji = document.getElementById("toggleEmoji");
  const toggleExample = document.getElementById("toggleExample");

  let correctCount = 0;
  let totalCount = 0;
  let isWaiting = false;

  function say(text) {
    if (audioEnabledToggle && !audioEnabledToggle.checked) return;
    speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    msg.pitch = 1.2;
    msg.voice = speechSynthesis.getVoices().find(v => v.lang.startsWith("en"));
    speechSynthesis.speak(msg);
  }

  function updateDeckFromMode() {
    const mode = modeSelect.value;
    if (mode === "alphabet" || mode === "phonics") currentDeck = [...alphabetDeck];
    else if (mode === "words") currentDeck = [...wordDeck];
    else if (mode === "sentences") currentDeck = [...sentenceDeck];
    else currentDeck = [...alphabetDeck, ...wordDeck];
  }

  function pickRandomWord() {
    if (isWaiting) return;
    updateDeckFromMode();

    const entry = currentDeck[Math.floor(Math.random() * currentDeck.length)];
    console.log("Picked entry:", entry);

    let displayText = "";
    let expectedInput = "";
    const mode = modeSelect.value;

    if (mode === "phonics" || mode === "alphabet") {
      displayText = entry.letter;
      expectedInput = entry.letter;

      let parts = [];
      if (!toggleLetter || toggleLetter.checked) parts.push(entry.letter);
      if (!toggleExample || toggleExample.checked) parts.push("as in " + entry.example);
      if (parts.length) say(parts.join(" "));

      instructionDiv.innerHTML = (!toggleExample || toggleExample.checked) ? `As in: ${entry.example}` : "";

      if (entry.emoji && (!toggleEmoji || toggleEmoji.checked)) {
        imageElement.style.display = "block";
        imageElement.outerHTML = `<div id="exampleImage" style="font-size: 64px; margin: 10px 0;">${entry.emoji}</div>`;
      } else {
        imageElement.style.display = "none";
      }

      setupPhonemeClickable(displayText);
    } else {
      displayText = entry.word;
      expectedInput = entry.word;
      say(entry.audio || entry.word);
      instructionDiv.textContent = "";
      imageElement.style.display = "none";
      setupPhonemeClickable(displayText);
    }

    promptDiv.innerText = displayText;
    currentWord = expectedInput;
    inputBox.value = "";
    inputBox.focus();
  }

  inputBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !isWaiting) {
      isWaiting = true;
      const value = inputBox.value.trim();
      const caseToggle = document.getElementById("caseToggle");

      let isCorrect;
      if (Array.isArray(currentWord)) {
        isCorrect = currentWord.some(w =>
          caseToggle.checked ? value === w : value.toLowerCase() === w.toLowerCase()
        );
      } else {
        isCorrect = caseToggle.checked
          ? value === currentWord
          : value.toLowerCase() === currentWord.toLowerCase();
      }

      totalCount++;

      if (isCorrect) {
        feedback.textContent = "✅ Correct!";
        correctCount++;
      } else {
        feedback.textContent = `❌ Try again! You typed "${value}", expected "${Array.isArray(currentWord) ? currentWord.join(' or ') : currentWord}"`;
      }

      progress.textContent = `Score: ${correctCount} / ${totalCount}`;
      inputBox.value = "";
      inputBox.focus();

      setTimeout(() => {
        isWaiting = false;
        pickRandomWord();
      }, 800);
    }
  });

  function splitToPhonemes(word) {
    const digraphs = ['ch', 'sh', 'th', 'ph', 'wh'];
    let result = [];
    let i = 0;

    while (i < word.length) {
      const pair = word.slice(i, i + 2);
      if (digraphs.includes(pair)) {
        result.push(pair);
        i += 2;
      } else {
        result.push(word[i]);
        i++;
      }
    }
    return result;
  }

  function setupPhonemeClickable(displayText) {
    const phonemes = splitToPhonemes(displayText.toLowerCase());
    promptDiv.innerHTML = "";

    phonemes.forEach((phoneme) => {
      const span = document.createElement("span");
      span.textContent = phoneme.toUpperCase();
      span.style.margin = "0 2px";
      span.style.cursor = "pointer";
      span.setAttribute("data-sound", phoneme);
      span.addEventListener("click", () => {
        const sound = span.getAttribute("data-sound").toLowerCase();
        const audio = new Audio(`./audio/${sound}.wav`);
        audio.onerror = () => console.warn(`Missing audio: ${sound}`);
        audio.play();

        span.style.backgroundColor = "#ffff99";
        span.style.borderRadius = "4px";
        span.style.padding = "2px 4px";
        setTimeout(() => {
          span.style.backgroundColor = "";
        }, 400);
      });
      promptDiv.appendChild(span);
    });
  }

  pickRandomWord();
}
