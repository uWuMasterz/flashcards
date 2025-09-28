const express = require('express');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const port = 3000;

const adapter = new FileSync('db.json');
const db = low(adapter);

// Initialize database
db.defaults({ decks: [], tags: [] }).write();

app.use(express.json());
app.use(express.static('public'));

// Get all decks
app.get('/decks', (req, res) => {
  res.json(db.get('decks').value());
});

// Add a new deck
app.post('/decks', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Deck name required" });
  const newDeck = { id: Date.now().toString(), name, cards: [] };
  db.get('decks').push(newDeck).write();
  res.json(newDeck);
});

// Get cards for a deck
app.get('/decks/:id/cards', (req, res) => {
  const deck = db.get('decks').find({ id: req.params.id }).value();
  if (!deck) return res.status(404).json({ error: "Deck not found" });
  res.json(deck.cards);
});

// Add card with tags
app.post('/decks/:id/cards', (req, res) => {
  const deck = db.get('decks').find({ id: req.params.id }).value();
  if (!deck) return res.status(404).json({ error: "Deck not found" });

  const { question, answer, tags } = req.body;
  if (!question || !answer || !tags || !tags.length) {
    return res.status(400).json({ error: "Question, answer, and at least 1 tag required" });
  }

  // Add new tags to global tag list
  tags.forEach(tag => {
    if (!db.get('tags').includes(tag).value()) {
      db.get('tags').push(tag).write();
    }
  });

  const newCard = { id: Date.now().toString(), question, answer, tags };
  deck.cards.push(newCard);
  db.get('decks').find({ id: req.params.id }).assign(deck).write();
  res.json(newCard);
});

// Delete a card
app.delete('/decks/:deckId/cards/:cardId', (req, res) => {
  const { deckId, cardId } = req.params;
  const deck = db.get('decks').find({ id: deckId }).value();
  if (!deck) return res.status(404).json({ error: "Deck not found" });

  deck.cards = deck.cards.filter(c => c.id !== cardId);
  db.get('decks').find({ id: deckId }).assign(deck).write();
  res.status(200).json({ success: true });
});

// Get all tags
app.get('/tags', (req, res) => {
  res.json(db.get('tags').value());
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
