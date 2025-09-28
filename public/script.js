const deckForm = document.getElementById('deck-form');
const deckNameInput = document.getElementById('deck-name');
const decksTableBody = document.querySelector('#decks-table tbody');

function loadDecks() {
  fetch('/decks')
    .then(res => res.json())
    .then(decks => {
      decksTableBody.innerHTML = '';
      decks.forEach(deck => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = deck.name;

        const tdActions = document.createElement('td');

        const btnView = document.createElement('button');
        btnView.textContent = 'View Cards';
        btnView.onclick = () => window.location.href = `cards.html?deckId=${deck.id}&deckName=${encodeURIComponent(deck.name)}`;

        tdActions.appendChild(btnView);
        tr.appendChild(tdName);
        tr.appendChild(tdActions);
        decksTableBody.appendChild(tr);
      });
    });
}

deckForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = deckNameInput.value.trim();
  if (!name) return;

  fetch('/decks', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name})
  })
  .then(res=>res.json())
  .then(()=> { deckNameInput.value=''; loadDecks(); });
});

loadDecks();
