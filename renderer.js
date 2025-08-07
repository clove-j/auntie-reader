// Enhanced Auntie Reader App JavaScript with Clickable Letter Phonics Playback, UI Toggles, and Accessibility Improvements
let alphabetDeck = [], wordDeck = [], phonicsDeck = [], sentenceDeck = [];
let currentWord = "";
let currentDeck = [];
let mistakes = [];
let currentEntry = null;

const audioEnabledToggle = document.getElementById("audioEnabledToggle");
const correctSound = new Audio("./audio/correct.mp3");
const incorrectSound = new Audio("./audio/incorrect.mp3");

let forceUppercase = false;
const toggleUppercaseButton = document.getElementById("toggleUppercaseButton");

if (toggleUppercaseButton) {
  toggleUppercaseButton.addEventListener("click", () => {
    forceUppercase = !forceUppercase;
    toggleUppercaseButton.textContent = forceUppercase ? "🔡 Show lowercase" : "🔠 Show UPPERCASE";
    if (typeof renderCurrentPrompt === "function") renderCurrentPrompt();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById("loader");
  const app = document.getElementById("app");
  const audio = document.getElementById("loadingSound");

  loader.innerText = "Loading Auntie Reader...";

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

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/gi, "").trim();
}

function initializeAuntieReader() {
  const promptDiv = document.getElementById("prompt");
  const inputBox = document.getElementById("input");
  const feedback = document.getElementById("feedback");
  const progress = document.getElementById("progress");
  const modeSelect = document.getElementById("modeSelect");
  const instructionDiv = document.getElementById("instruction");
  const imageElement = document.getElementById("exampleImage");
  const nextButton = document.getElementById("nextButton");
  const repeatButton = document.getElementById("repeatButton");
  const mistakesList = document.getElementById("mistakesList");

  const toggleLetter = document.getElementById("toggleLetter");
  const toggleEmoji = document.getElementById("toggleEmoji");
  const toggleExample = document.getElementById("toggleExample");

  let correctCount = 0;
  let totalCount = 0;
  let isWaiting = false;
  let answerChecked = false;

  function say(text) {
    if (audioEnabledToggle && !audioEnabledToggle.checked) return;
    speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.75;
    msg.pitch = 1.2;
    msg.voice = speechSynthesis.getVoices().find(v => v.lang.startsWith("en"));
    speechSynthesis.speak(msg);
  }

  function repeatAudio() {
    if (!currentEntry) return;
    const mode = modeSelect.value;
    if (mode === "phonics" || mode === "alphabet") {
      let parts = [];
      if (!toggleLetter || toggleLetter.checked) parts.push(currentEntry.letter);
      if (!toggleExample || toggleExample.checked) parts.push("as in " + currentEntry.example);
      if (parts.length) say(parts.join(" "));
    } else {
      say(currentEntry.audio || currentEntry.word);
    }
  }

  function updateDeckFromMode() {
    const mode = modeSelect.value;
    if (mode === "alphabet" || mode === "phonics") currentDeck = [...alphabetDeck];
    else if (mode === "words") currentDeck = [...wordDeck];
    else if (mode === "sentences") currentDeck = [...sentenceDeck];
    else currentDeck = [...alphabetDeck, ...wordDeck];
  }

  function pickRandomWord() {
    updateDeckFromMode();

    const entry = currentDeck[Math.floor(Math.random() * currentDeck.length)];
    currentEntry = entry;
    console.log("Picked entry:", entry);

    const mode = modeSelect.value;

    if (mode === "phonics" || mode === "alphabet") {
      setupPhonemeClickable(entry.letter);
      promptDiv.innerText = entry.letter;
      currentWord = entry.letter;

      let parts = [];
      if (!toggleLetter || toggleLetter.checked) parts.push(entry.letter);
      if (!toggleExample || toggleExample.checked) parts.push("as in " + entry.example);
      if (parts.length) say(parts.join(" "));

      instructionDiv.innerHTML = (!toggleExample || toggleExample.checked) ? `As in: ${entry.example}` : "";

      if (entry.emoji && (!toggleEmoji || toggleEmoji.checked)) {
        imageElement.innerText = entry.emoji;
        imageElement.style.fontSize = "64px";
        imageElement.style.margin = "10px 0";
        imageElement.style.display = "block";
      } else {
        imageElement.style.display = "none";
      }
    } else {
      setupPhonemeClickable(entry.word);
      promptDiv.innerText = forceUppercase ? entry.word.toUpperCase() : entry.word;
      currentWord = entry.word;
      say(entry.audio || entry.word);
      instructionDiv.textContent = "";
      imageElement.style.display = "none";
    }

    inputBox.value = "";
    inputBox.focus();
    feedback.textContent = "";
    answerChecked = false;
  }

  inputBox.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !isWaiting) {
      checkAnswer();
    }
  });

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (!answerChecked) {
        checkAnswer();
      } else {
        pickRandomWord();
      }
    });
  }

  if (repeatButton) {
    repeatButton.addEventListener("click", () => {
      repeatAudio();
    });
  }

  function checkAnswer() {
    isWaiting = true;
    const value = inputBox.value.trim();
    const caseToggle = document.getElementById("caseToggle");

    let isCorrect;
    if (Array.isArray(currentWord)) {
      isCorrect = currentWord.some(w =>
        caseToggle.checked ? value === w : normalize(value) === normalize(w)
      );
    } else {
      isCorrect = caseToggle.checked
        ? value === currentWord
        : normalize(value) === normalize(currentWord);
    }

    totalCount++;
    answerChecked = true;

    if (isCorrect) {
      feedback.textContent = "✅ Correct!";
      correctCount++;
      correctSound.play();
    } else {
      feedback.textContent = `❌ Try again! You typed "${value}", expected "${Array.isArray(currentWord) ? currentWord.join(' or ') : currentWord}"`;
      mistakes.push({ prompt: promptDiv.innerText, typed: value, expected: currentWord });
      updateMistakesList();
      incorrectSound.play();
    }

    progress.textContent = `Score: ${correctCount} / ${totalCount}`;
    inputBox.focus();
    isWaiting = false;
  }

  function updateMistakesList() {
    if (!mistakesList) return;
    mistakesList.innerHTML = "<h3>Mistakes:</h3>";
    mistakes.forEach((m, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. Prompt: ${m.prompt}, Typed: "${m.typed}", Expected: "${Array.isArray(m.expected) ? m.expected.join(' or ') : m.expected}"`;
      mistakesList.appendChild(li);
    });
  }

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
      span.textContent = forceUppercase ? phoneme.toUpperCase() : phoneme;
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
