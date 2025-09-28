const params = new URLSearchParams(window.location.search);
const deckId = params.get('deckId');
const deckName = params.get('deckName');

document.getElementById('deck-title').textContent = deckName;

// Back button
document.getElementById('back-btn').onclick = () => {
  window.location.href = `deck.html?deckId=${deckId}&deckName=${encodeURIComponent(deckName)}`;
};

const flashcardEl = document.getElementById('flashcard');
const frontEl = document.getElementById('card-front');
const backEl = document.getElementById('card-back');


const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

const progressBarFill = document.querySelector('.progress-bar-fill');
const progressText = document.getElementById('progress-text');

const tagFiltersContainer = document.getElementById('tag-filters');

let allCards = [];
let filteredCards = [];
let currentIndex = 0;
let tags = new Set();

// For advanced filtering
let selectedFilterTags = [];
let filterModes = []; // 'AND' or 'OR' between tags

// Container for current filter display
const selectedTagsContainer = document.createElement('div');
selectedTagsContainer.classList.add('current-filter-container');
selectedTagsContainer.style.marginTop = '10px';
tagFiltersContainer.parentNode.appendChild(selectedTagsContainer);

// Shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Load all cards
function loadCards() {
  fetch(`/decks/${deckId}/cards`)
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        document.getElementById('card-container').innerHTML = '<p>No cards to study</p>';
        return;
      }
      allCards = [...data];
      extractTags();
      createTagFilters();
      // default: no filter selected
      selectedFilterTags = [];
      filterModes = [];
      updateCurrentFilterDisplay();
      applyTagFilter();
    });
}

// Extract unique tags from all cards
function extractTags() {
  tags.clear();
  allCards.forEach(card => {
    if (card.tags && card.tags.length) {
      card.tags.forEach(t => tags.add(t));
    }
  });
}

// Create tag filter buttons with consistent styling
function createTagFilters() {
  tagFiltersContainer.innerHTML = '';
  tags.forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t;
    btn.classList.add('tag-btn');

    // Apply consistent styling (same as tags in current filter)
    btn.style.padding = '4px 10px';
    btn.style.backgroundColor = '#cce5ff'; // light blue
    btn.style.borderRadius = '12px';
    btn.style.marginRight = '6px';
    btn.style.fontWeight = '500';
    btn.style.color = '#004085'; // dark blue text
    btn.style.border = '1px solid #b8daff';
    btn.style.cursor = 'pointer';
    btn.style.userSelect = 'none';

    btn.onclick = () => handleTagClick(t);
    tagFiltersContainer.appendChild(btn);
  });
}

// Handle tag click
function handleTagClick(tag) {
  const idx = selectedFilterTags.indexOf(tag);
  if (idx === -1) {
    // Add new tag
    selectedFilterTags.push(tag);
    if (selectedFilterTags.length > 1) filterModes.push('AND'); // default AND
  } else {
    // Remove tag
    selectedFilterTags.splice(idx, 1);

    if (filterModes.length === 0) {
      // no connectors
      return updateCurrentFilterDisplay();
    }

    if (idx === 0) {
      // Removed first tag, remove the first connector
      filterModes.shift();
    } else if (idx === filterModes.length) {
      // Removed last tag, remove last connector
      filterModes.pop();
    } else {
      // Removed tag in the middle, merge connectors:
      // Remove connector at idx (connector after removed tag)
      // Replace connector at idx - 1 with connector at idx (if any)
      filterModes.splice(idx, 1);
      // No need to shift or add because splice already removes correct connector
      // So just keep the one before idx as is (this keeps the logic of next tag)
    }
  }
  updateCurrentFilterDisplay();
}


// Update the current filter display
function updateCurrentFilterDisplay() {
  selectedTagsContainer.innerHTML = '';

  // Container div for label + tags + AND/OR connectors on same line
  const containerLine = document.createElement('div');
  containerLine.style.fontWeight = 'bold';
  containerLine.style.marginBottom = '5px';
  containerLine.style.display = 'flex';
  containerLine.style.alignItems = 'center';
  containerLine.style.flexWrap = 'wrap';
  selectedTagsContainer.appendChild(containerLine);

  // Label "Current filter:"
  const label = document.createElement('span');
  label.textContent = 'Current filter:';
  containerLine.appendChild(label);

  // Spacer between label and tags
  const spacer = document.createElement('span');
  spacer.style.width = '8px';
  containerLine.appendChild(spacer);

  if (selectedFilterTags.length === 0) {
    // Show "None" if no tags selected
    const noneSpan = document.createElement('span');
    noneSpan.textContent = 'None';
    noneSpan.style.fontWeight = 'normal';
    containerLine.appendChild(noneSpan);
  } else {
    // Show tags with AND/OR connectors inline
    selectedFilterTags.forEach((tag, i) => {
      // Tag pill with updated style
      const tagSpan = document.createElement('span');
      tagSpan.textContent = tag;
      tagSpan.style.padding = '4px 10px';
      tagSpan.style.backgroundColor = '#cce5ff'; // light blue background
      tagSpan.style.borderRadius = '12px';
      tagSpan.style.marginRight = '6px';
      tagSpan.style.fontWeight = '500';
      tagSpan.style.color = '#004085'; // dark blue text
      tagSpan.style.border = '1px solid #b8daff';
      containerLine.appendChild(tagSpan);

      // AND/OR connector (except after last tag)
      if (i < selectedFilterTags.length - 1) {
        const connector = document.createElement('button');
        connector.textContent = filterModes[i];
        connector.style.fontWeight = 'bold';
        connector.style.marginRight = '5px';
        connector.style.cursor = 'pointer';
        connector.style.border = 'none';
        connector.style.borderRadius = '4px';
        connector.style.padding = '4px 8px';
        connector.style.color = 'white';

        // Different background colors for AND / OR
        if (filterModes[i] === 'AND') {
          connector.style.backgroundColor = '#9C27B0'; // Blue
        } else {
          connector.style.backgroundColor = '#FFC107'; // Green
        }

        connector.onclick = () => {
          filterModes[i] = filterModes[i] === 'AND' ? 'OR' : 'AND';
          updateCurrentFilterDisplay();
        };
        containerLine.appendChild(connector);
      }
    });
  }

  // Filter button (always visible, below current filter line)
  const filterBtn = document.createElement('button');
  filterBtn.textContent = 'Filter';
  filterBtn.style.marginTop = '8px';
  filterBtn.style.padding = '6px 12px';
  filterBtn.style.cursor = 'pointer';
  filterBtn.onclick = applyTagFilter;
  selectedTagsContainer.appendChild(filterBtn);
}

// Apply tag filter to cards
function applyTagFilter() {
  if (selectedFilterTags.length === 0) {
    filteredCards = [...allCards];
  } else {
    filteredCards = allCards.filter(card => {
      let result = null;
      selectedFilterTags.forEach((tag, i) => {
        const hasTag = card.tags.includes(tag);
        if (i === 0) {
          result = hasTag;
        } else {
          if (filterModes[i - 1] === 'AND') {
            result = result && hasTag;
          } else {
            result = result || hasTag;
          }
        }
      });
      return result;
    });
  }

  shuffleArray(filteredCards);
  currentIndex = 0;
  renderCard();
  updateProgress();
}

// Render current card
function renderCard() {
  if (!filteredCards.length) {
    frontEl.textContent = '';
    backEl.textContent = 'No cards for selected tags';
    flashcardEl.querySelector('.flashcard-inner').style.height = '200px';
    return;
  }

  const card = filteredCards[currentIndex];
  frontEl.textContent = card.question;
  backEl.innerHTML = `<div>${card.answer}</div>`;

  flashcardEl.classList.remove('flipped');
  flashcardEl.querySelector('.flashcard-inner').style.height = '200px';
}

// Navigation buttons
prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderCard();
    updateProgress();
  }
};

nextBtn.onclick = () => {
  if (currentIndex < filteredCards.length - 1) {
    currentIndex++;
    renderCard();
    updateProgress();
  }
};

// Flip card
flashcardEl.onclick = () => {
  if (flashcardEl.classList.contains('flipped')) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      flashcardEl.classList.remove('flipped');
      flashcardEl.querySelector('.flashcard-inner').style.height = '200px';
    }, 10);
  } else {
    flashcardEl.classList.add('flipped');
    const backHeight = backEl.scrollHeight;
    const backWidth = backEl.scrollWidth;
    flashcardEl.querySelector('.flashcard-inner').style.height = backHeight + 'px';
    flashcardEl.querySelector('.flashcard-inner').style.width = backWidth + 'px';
  }
};

// Update progress bar
function updateProgress() {
  const total = filteredCards.length;
  const current = total === 0 ? 0 : currentIndex + 1;
  const progressPercent = total === 0 ? 0 : (current / total) * 100;
  progressBarFill.style.width = progressPercent + '%';
  progressText.textContent = `${current} of ${total} cards`;
}

// Initialize
loadCards();
