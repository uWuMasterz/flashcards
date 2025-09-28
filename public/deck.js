const params = new URLSearchParams(window.location.search);
const deckId = params.get('deckId');
const deckName = params.get('deckName');

document.getElementById('deck-title').textContent = deckName;

const studyBtn = document.getElementById('study-btn');
const cardForm = document.getElementById('card-form');
const questionInput = document.getElementById('card-question');
const answerInput = document.getElementById('card-answer');

const tagSearchInput = document.getElementById('tag-search');
const addTagBtn = document.getElementById('add-tag-btn');
const tagListDiv = document.getElementById('tag-list');
const suggestionDiv = document.getElementById('tag-suggestions');

const searchBar = document.getElementById('search-bar');
const tableBody = document.querySelector('#cards-table tbody');

let availableTags = []; // suggestions for input
let tempTags = [];      // tags for current new/edit card
let allCards = [];      // full deck cards

// ================= INIT TinyMCE =================
tinymce.init({
  selector: '#card-answer',
  height: 300,
  menubar: false,
  plugins: 'lists link table code',
  toolbar: 'bold italic underline | bullist numlist | link table | code',
  setup: (editor) => {
    editor.on('init', () => {
      loadCards();
    });
  }
});

// ================= NAVIGATION =================
studyBtn.onclick = () => {
  window.location.href = `cards.html?deckId=${deckId}&deckName=${encodeURIComponent(deckName)}`;
};

// ================= TAG FUNCTIONS =================
function renderTempTags() {
  tagListDiv.innerHTML = '';
  tempTags.forEach((tag, idx) => {
    const span = document.createElement('span');
    span.className = 'temp-tag';
    span.textContent = tag + ' ✕';
    span.onclick = () => {
      tempTags.splice(idx, 1);
      renderTempTags();
    };
    tagListDiv.appendChild(span);
  });
}

function refreshAvailableTags() {
  const tagSet = new Set();
  allCards.forEach(card => {
    card.tags.forEach(t => tagSet.add(t));
  });
  availableTags = Array.from(tagSet).sort();
}

// Add tag button
addTagBtn.onclick = () => {
  const val = tagSearchInput.value.trim();
  if (!val) return;
  if (!tempTags.includes(val)) tempTags.push(val);
  tagSearchInput.value = '';
  suggestionDiv.innerHTML = '';
  renderTempTags();
};

// Tag suggestions
tagSearchInput.addEventListener('input', () => {
  const val = tagSearchInput.value.toLowerCase();
  const suggestions = availableTags.filter(t => t.toLowerCase().includes(val) && !tempTags.includes(t));

  suggestionDiv.innerHTML = '';
  suggestions.slice(0, 4).forEach(tag => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = tag;
    div.onclick = () => {
      tempTags.push(tag);
      renderTempTags();
      tagSearchInput.value = '';
      suggestionDiv.innerHTML = '';
    };
    suggestionDiv.appendChild(div);
  });
});

// Close suggestions on click outside
document.addEventListener('click', (event) => {
  const isClickInside = tagSearchInput.contains(event.target) || suggestionDiv.contains(event.target);
  if (!isClickInside) suggestionDiv.innerHTML = '';
});

// ================= CARD FUNCTIONS =================
function defaultSubmitHandler(e) {
  e.preventDefault();
  addNewCard();
}

cardForm.onsubmit = defaultSubmitHandler;

function addNewCard() {
  const question = questionInput.value.trim();
  const answer = tinymce.get('card-answer').getContent().trim();

  if (!question || !answer || tempTags.length === 0) {
    alert('Please provide question, answer, and at least 1 tag');
    return;
  }

  fetch(`/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, tags: tempTags })
  }).then(() => {
    questionInput.value = '';
    tinymce.get('card-answer').setContent('');
    tempTags = [];
    renderTempTags();
    loadCards(); // refresh cards & tags
  });
}

function loadCards() {
  fetch(`/decks/${deckId}/cards`)
    .then(res => res.json())
    .then(cards => {
      allCards = cards;
      refreshAvailableTags(); // 🔑 recalc tags each time
      renderCards(allCards);
    });
}

function renderCards(cards) {
  tableBody.innerHTML = '';
  cards.forEach(card => {
    const tr = document.createElement('tr');

    const tdQ = document.createElement('td');
    tdQ.textContent = card.question;

    const tdA = document.createElement('td');
    // 👉 Show table modal if answer contains <table>
    if (card.answer.includes('<table')) {
      const btn = document.createElement('button');
      btn.textContent = 'Show table';
      btn.className = 'btn-show-table';
      btn.onclick = () => {
        document.getElementById('overlay-table-container').innerHTML = card.answer;
        document.getElementById('table-overlay').style.display = 'flex';
      };
      tdA.appendChild(btn);
    } else {
      tdA.innerHTML = card.answer;
    }

    const tdTags = document.createElement('td');
    tdTags.textContent = card.tags.join(', ');

    const tdActions = document.createElement('td');

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'btn-delete';
    delBtn.onclick = () => {
      if (!confirm('Are you sure you want to delete this card?')) return;
      fetch(`/decks/${deckId}/cards/${card.id}`, { method: 'DELETE' })
        .then(() => loadCards()); // reload & refresh tags
    };

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'btn-edit';
    editBtn.onclick = () => {
      questionInput.value = card.question;
      tinymce.get('card-answer').setContent(card.answer);
      tempTags = [...card.tags];
      renderTempTags();

      cardForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

      cardForm.onsubmit = (e) => {
        e.preventDefault();
        fetch(`/decks/${deckId}/cards/${card.id}`, { method: 'DELETE' })
          .then(() => addNewCard())
          .then(() => { cardForm.onsubmit = defaultSubmitHandler; });
      };
    };

    tdActions.appendChild(editBtn);
    tdActions.appendChild(delBtn);

    tr.appendChild(tdQ);
    tr.appendChild(tdA);
    tr.appendChild(tdTags);
    tr.appendChild(tdActions);

    tableBody.appendChild(tr);
  });
}

// ================= SEARCH BAR =================
searchBar.addEventListener('input', () => {
  const term = searchBar.value.toLowerCase();
  if (!term) {
    renderCards(allCards);
    return;
  }

  const filtered = allCards.filter(card =>
    card.question.toLowerCase().includes(term) ||
    card.tags.some(tag => tag.toLowerCase().includes(term))
  );

  renderCards(filtered);
});

// ================= OVERLAY HANDLING =================
document.querySelector('.overlay-close').onclick = () => {
  document.getElementById('table-overlay').style.display = 'none';
};
document.getElementById('table-overlay').onclick = (e) => {
  if (e.target.id === 'table-overlay') {
    document.getElementById('table-overlay').style.display = 'none';
  }
};

// ================= INIT =================
loadCards();
