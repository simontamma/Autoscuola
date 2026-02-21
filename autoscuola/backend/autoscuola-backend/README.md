# 🚗 AutoScuola Veloce – Backend API

Backend REST in **Node.js + Express** con database **SQLite** (via `better-sqlite3`).

---

## 📦 Installazione

```bash
# 1. Entra nella cartella
cd autoscuola-backend

# 2. Installa le dipendenze
npm install

# 3. Copia e configura le variabili d'ambiente
cp .env.example .env
# → Modifica JWT_SECRET con una stringa sicura!

# 4. Avvia il server
npm start           # produzione
npm run dev         # sviluppo (con auto-reload via nodemon)
```

Il database `autoscuola.db` viene creato automaticamente al primo avvio con dati di seed.

**Admin di default:**
- Username: `admin`
- Password: `admin1234`
> ⚠️ Cambia la password al primo accesso tramite `PUT /api/auth/password`

---

## 🗄️ Struttura del progetto

```
autoscuola-backend/
├── server.js              ← Entry point
├── .env.example           ← Template variabili d'ambiente
├── package.json
├── db/
│   └── database.js        ← Init DB + seed dati
├── middleware/
│   └── auth.js            ← Middleware JWT
└── routes/
    ├── auth.js            ← Login admin
    ├── feedback.js        ← Gestione recensioni
    ├── iscrizioni.js      ← Gestione iscrizioni
    ├── pacchetti.js       ← CRUD pacchetti
    ├── sedi.js            ← CRUD sedi
    └── admin.js           ← Dashboard stats
```

---

## 🔑 Autenticazione

Le route protette richiedono un token JWT nell'header:
```
Authorization: Bearer <token>
```

---

## 📡 Endpoint API

### Auth
| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Login admin → restituisce token JWT |
| GET | `/api/auth/me` | ✅ | Info admin corrente |
| PUT | `/api/auth/password` | ✅ | Cambia password |

**Login:**
```json
POST /api/auth/login
{ "username": "admin", "password": "admin1234" }
```

---

### Sedi
| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/api/sedi` | ❌ | Lista sedi attive |
| GET | `/api/sedi/:id` | ❌ | Dettaglio sede |
| POST | `/api/sedi` | ✅ | Crea nuova sede |
| PUT | `/api/sedi/:id` | ✅ | Aggiorna sede |
| DELETE | `/api/sedi/:id` | ✅ | Disattiva sede |

**Crea sede:**
```json
POST /api/sedi
{
  "citta": "Roma",
  "indirizzo": "Via Roma 1, 00100 Roma",
  "telefono": "06 1234567",
  "orari": "Lun–Ven 9:00–18:00",
  "metro": "Metro A – 5 min",
  "maps_url": "https://maps.google.com/?q=..."
}
```

---

### Pacchetti
| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/api/pacchetti` | ❌ | Lista pacchetti attivi |
| GET | `/api/pacchetti/:id` | ❌ | Dettaglio pacchetto |
| POST | `/api/pacchetti` | ✅ | Crea pacchetto |
| PUT | `/api/pacchetti/:id` | ✅ | Aggiorna pacchetto |
| DELETE | `/api/pacchetti/:id` | ✅ | Disattiva pacchetto |

**Crea pacchetto:**
```json
POST /api/pacchetti
{
  "nome": "Patente C",
  "licenza": "Camion · Trasporto merci",
  "prezzo": 1400,
  "descrizione": "Corso completo per patente C",
  "features": ["Teoria specializzata", "50h pratica", "Esame incluso"],
  "in_evidenza": false
}
```

---

### Iscrizioni
| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| POST | `/api/iscrizioni` | ❌ | Nuova iscrizione (dal form sito) |
| GET | `/api/iscrizioni` | ✅ | Lista tutte le iscrizioni |
| GET | `/api/iscrizioni?stato=nuova` | ✅ | Filtra per stato |
| GET | `/api/iscrizioni/:id` | ✅ | Dettaglio iscrizione |
| PATCH | `/api/iscrizioni/:id/stato` | ✅ | Cambia stato |
| DELETE | `/api/iscrizioni/:id` | ✅ | Elimina iscrizione |

**Nuova iscrizione:**
```json
POST /api/iscrizioni
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario@example.com",
  "telefono": "333 1234567",
  "data_nascita": "1995-06-15",
  "pacchetto_id": 1,
  "sede_id": 2,
  "note": "Preferisco lezioni al mattino"
}
```

**Stato iscrizione:** `nuova` | `confermata` | `completata` | `annullata`

---

### Feedback
| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/api/feedback` | ❌ | Feedback approvati (pubblico) |
| GET | `/api/feedback?sede_id=1` | ❌ | Feedback per sede |
| GET | `/api/feedback/stats` | ❌ | Statistiche voti |
| POST | `/api/feedback` | ❌ | Invia nuovo feedback |
| GET | `/api/feedback/admin/tutti` | ✅ | Tutti i feedback (anche non approvati) |
| PATCH | `/api/feedback/:id/approva` | ✅ | Approva feedback |
| DELETE | `/api/feedback/:id` | ✅ | Elimina feedback |

**Invia feedback:**
```json
POST /api/feedback
{
  "nome": "Sara",
  "cognome": "Bianchi",
  "email": "sara@example.com",
  "sede_id": 1,
  "valutazione": 5,
  "testo": "Esperienza fantastica, istruttori professionali!"
}
```

---

### Admin Dashboard
| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | ✅ | Statistiche complete + ultime iscrizioni |

---

## 🔗 Collegare il frontend

Nel file `scuola_guida.html`, sostituisci le funzioni del form con chiamate API reali. Esempio:

```javascript
// Form iscrizione
async function submitIscrizione(formData) {
  const res = await fetch('http://localhost:3000/api/iscrizioni', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  return res.json();
}

// Carica feedback approvati
async function caricaFeedback() {
  const res = await fetch('http://localhost:3000/api/feedback');
  const { data } = await res.json();
  // Renderizza le recensioni...
}

// Login admin
async function loginAdmin(username, password) {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const { token } = await res.json();
  localStorage.setItem('adminToken', token);
}
```

---

## 🚀 Deploy (produzione)

1. Imposta `NODE_ENV=production` e un `JWT_SECRET` sicuro nel `.env`
2. Usa un process manager come **PM2**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name autoscuola
   pm2 save
   ```
3. Metti Nginx davanti come reverse proxy sulla porta 3000
