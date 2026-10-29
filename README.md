# Application Full-Stack de Gestion de Bibliothèque — SAE DDAW

Ce projet est une application complète (Frontend et Backend) conçue pour répondre aux critères de la SAE « Développement & Déploiement d’une Application Web RESTful Conteneurisée ». Il permet la gestion centralisée d'une bibliothèque : adhérents, livres, emprunts, auteurs, membres, etc.

## 🚀 Compétences Techniques Démontrées

Pour répondre aux exigences académiques, ce projet met en œuvre :

- **Structuration modulaire** : Code organisé en modules NestJS clairs et isolés.
- **Architecture API REST** : Usage strict de contrôleurs pour exposer des services JSON.
- **Documentation OpenAPI** : Documentation interactive complète via **Swagger**.
- **Tests automatisés** : Suite de tests unitaires avec **Jest**.
- **Gestion de versions** : Suivi du projet avec **Git**.
- **Conteneurisation (Docker)** : Déploiement via Docker Compose pour une portabilité totale.

## 1) Contexte du projet et Résumé des fonctionnalités

Ce projet s'inscrit dans le cadre de la SAE **DDAW (Développement et Déploiement d'Applications Web)**. Il a permis de mobiliser des compétences avancées en :

- **Architecture logicielle** : Conception d'un système robuste et évolutif.
- **Programmation orientée services** : Création d'une API REST performante avec NestJS.
- **Outillage DevOps** : Conteneurisation (Docker), scripts de déploiement (Render/Koyeb), documentation (Swagger) et tests automatisés (Jest).

L'application permet la gestion centralisée d'une bibliothèque :

- **Gérer des adhérents et leurs profils détaillés** (1-1).
- **Gérer un catalogue de livres, classés par catégories et auteurs** (1-N et N-N) avec la gestion des images de couverture.
- **Réaliser des emprunts et des retours** au comptoir, avec stock mis à jour automatiquement, **réservations avec file d'attente**, renouvellements et amendes de retard (voir §9).
- **Visualiser et interagir** via une interface utilisateur moderne (React/Vite).
- **Consommer les données** via une API REST sécurisée (NestJS) totalement documentée.

## 2) Stack Technique et Choix

### Backend (L'API)

- **NestJS** : Framework Node.js robuste et modulaire inspiré par Angular, garantissant une architecture propre.
- **Sequelize + sequelize-typescript** : ORM relationnel utilisé pour dialoguer avec MySQL tout en profitant des avantages de TypeScript.
- **Swagger / OpenAPI** : Outil de documentation interactive de l'API et de génération de contrats de données pour vos importations Postman.

### Frontend (L'Interface Utilisateur)

- **React.js + Vite** : Framework nouvelle génération très performant pour créer des interfaces utilisateur dynamiques.
- **Axios** : Client HTTP servant à lancer toutes les requêtes vers l'API NestJS.
- **Lucide-React** : Bibliothèque d'icônes ergonomiques.
- **Framer Motion** : Ajout d'animations (composants, modales) pour respecter les critères de design.

### Données & Conteneurisation

- **MySQL** : SGBD Relationnel classique, idéal pour des contraintes SAE.
- **Docker & Docker Compose** : Utilisé pour orchestrer la base de données MySQL, l'API et les scripts Seed automatiquement en une commande au lieu de faire de fastidieuses installations machine.

---

## 3) Structure Complète du Projet (De A à Z)

La hiérarchie a été pensée de manière logique, séparant formellement le Frontend du Backend. Le grand avantage de ce clivage est de comprendre qu'on a _deux applications distinctes qui communiquent entre elles_.

```text
Gestion-Bibliotheque-Mohamed-justin/
│
├── library-frontend/               <-- 💻 PARTIE FRONTEND (Dossier React/Vite)
│   ├── package.json                # Dépendances Vite et React
│   └── src/
│       ├── api/                    # Configuration Axios (liaison avec http://localhost:3000)
│       ├── assets/                 # Images et médias statiques
│       ├── components/             # Composants UI réutilisables (Modal, Sidebar...)
│       ├── views/                  # Vues complètes (BooksView, LoansView, etc.)
│       ├── App.css & index.css     # Design system global
│       └── App.tsx                 # Point d'entrée de l'application Front
│
├── src/                            <-- ⚙️ PARTIE BACKEND (Dossier NestJS)
│   ├── app.module.ts               # Module racine du backend
│   ├── main.ts                     # Configuration du serveur (Port, Swagger)
│   ├── common/                     # Filtres (ex: exceptions) gérés globalement
│   ├── auth/                       # Module d'authentification
│   ├── authors/                    # Gestion des auteurs (avec tests unitaires .spec.ts)
│   ├── books/                      # Gestion des livres (Stock, DTOs, Covers)
│   ├── categories/                 # Gestion des catégories / genres
│   ├── loans/                      # Gestion des emprunts
│   ├── profiles/                   # Gestion des profils détaillés
│   └── users/                      # Gestion des adhérents / comptes
│
├── test/                           <-- 🧪 PARTIE TESTS (Dossier Jest)
│   ├── app.e2e-spec.ts             # Tests de bout en bout (scénarios réels)
│   └── jest-e2e.json               # Configuration Jest pour le mode E2E
│
├── db/
│   └── seed.sql                # Jeu de données SQL initial
│
├── docker-compose.yml              # Orchestration Docker (API + Database)
├── Dockerfile                      # Environnement de déploiement Node.js
├── package.json                    # Dépendances Node.js
└── README.md                       # Documentation intégrale
```

Dans les dossiers sources du Backend (comme `src/books`), la logique suit l'architecture NestJS :

- **Un Controller (`x.controller.ts`)** : Il ne s'occupe _que_ d'écouter les routes HTTP (ex: `GET /books`).
- **Un Service (`x.service.ts`)** : Il concentre toute l'intelligence algorithmique et la modification base de données.
- **Des Modèles (`x.model.ts`)** : Les schémas de vos tables MySQL Sequelize (Users, Books, Loans, Reservations, etc.).
- **Des DTO (`/dto`)** : Data Transfer Object définissant strictement les JSON que l'utilisateur a le droit d'envoyer pour la création ou l'update de l'entité.

---

## 4) Le Modèle de Données (Relations de la SAE)

Ce projet respecte religieusement toutes les contraintes de base de données exigées par votre projet SAE :

### 🔗 Relation One-to-One

- **`User` ↔ `MemberProfile`**
- **Cardinalités :** `User (1,1) ── (1,1) MemberProfile` (Un utilisateur possède un profil unique, le profil appartient à un seul utilisateur).
- Géré par `@HasOne` et `@BelongsTo`.
- Chaque adhérent n'a qu'un et _un seul_ profil détaillé physique (adresse, numéro).

### 🔗 Relation One-to-Many

- **`Category` ↔ `Book`**
- **Cardinalités :** `Category (0,n) ── (1,1) Book` (Une catégorie contient de 0 à _n_ livres, un livre n'a qu'une seule catégorie).
- Géré par `@HasMany` et `@BelongsTo`.
- Une catégorie regroupe de nombreux livres. Mais un livre n'appartient qu'à une seule catégorie.
- **Même principe pour : `Book` ↔ `Loan`, `User` ↔ `Loan`, `Book` ↔ `Reservation` et `User` ↔ `Reservation`** (Un membre réalise plusieurs emprunts ou réservations).

### 🔗 Relation Many-to-Many

- **`Book` ↔ `Author`**
- **Cardinalités :** `Book (1,n) ── (1,n) Author` (Un livre a au moins un à _n_ auteurs, un auteur participe à au moins un à _n_ livres).
- Géré par `BelongsToMany` en passant par une table intermédiaire.
- Un livre peut avoir été co-écrit par de multiples auteurs. Inversement, un auteur écrit plusieurs livres. Lors de la structuration, nous utilisons une table de jointure explicite : `book_authors`.

---

## 5) Lancement et Installation de l'Outil

### Étape 1 : Démarrer le Serveur et la DB (Via Docker)

Ouvrez le dossier principal du projet à l'endroit où se situe le document `docker-compose.yml`. Assurez-vous d'avoir lancé le service Docker.

### Étape 2 : Lancer le projet avec Docker

C'est la méthode recommandée pour avoir tout l'environnement (Base de données + Backend + Frontend) qui tourne ensemble.

```bash
# Tout lancer en arrière-plan
docker compose up -d

# Tout arrêter
docker compose down

# Forcer la reconstruction (si vous avez changé le code)
docker compose up -d --build

# Repartir d'une base vide (obligatoire après une mise à jour du schéma, voir ci-dessous)
docker compose down -v && docker compose up -d --build
```

> **Mise à jour depuis une ancienne version :** le schéma a changé (rôle des comptes, renouvellements, nouveaux statuts de réservation). Une base MySQL créée avant cette mise à jour n'est pas migrée automatiquement : lancez une fois `docker compose down -v` puis `docker compose up -d --build`.
>
> Le jeu de données n'est chargé **qu'une seule fois** (base vide). Pour tout réinitialiser sans supprimer le volume : `docker compose run --rm -e FORCE_SEED=1 db-seed`.

#### Accès aux services :
- **Backend API** : `http://localhost:3000`
- **Frontend** : `http://localhost:5173` (ou `http://localhost:80` en mode prod)
- **Swagger** : `http://localhost:3000/docs`

### Étape 3 : Lancer le Frontend (React)

Vous avez deux façons de lancer le frontend selon vos besoins :

#### A) Mode Développement (Vite)

Idéal pour modifier le code en temps réel. Ouvrez le terminal dans le sous-dossier `library-frontend` :

```bash
cd library-frontend
npm install
npm run dev
```

Accessible sur : `http://localhost:5173`.

#### B) Mode Production (Docker + Nginx)

C'est la méthode la plus robuste. Le frontend est compilé et servi par un serveur **Nginx** haute performance à l'intérieur d'un conteneur Docker.

```bash
# Depuis la racine du projet (là où est le docker-compose.yml)
docker compose up --build frontend
```

Accessible sur : `http://localhost:80` (Le port standard du web).

**Pourquoi Nginx ?**
Dans ce mode, Nginx remplace le serveur de développement de Vite. Il est configuré (via `nginx.conf`) pour :

1. **Servir les fichiers statiques** très rapidement.
2. **Gérer le routage SPA** : il redirige toutes les requêtes vers `index.html` pour que React puisse gérer les routes sans erreurs 404.
3. **Optimiser les performances** avec la compression Gzip.

### Étape 3 : Lancer les Tests Automatisés (Jest)

Le projet inclut une suite de tests pour garantir la qualité du code.

**Installation de l'environnement de test :**

```bash
npm install --save-dev @nestjs/testing jest ts-jest @types/jest supertest
```

**Exécution des tests :**

```bash
# Lancer les tests unitaires
npm test

# Lancer les tests de bout en bout (E2E)
npm run test:e2e
```

Les tests unitaires vérifient la logique des services, tandis que les tests E2E simulent des scénarios d'utilisation réels (création de livre, emprunt, etc.).

---

## 6) Utiliser efficacement Swagger

Nous avons inclus des décorateurs pointus (`@ApiProperty`) sur nos liaisons afin que Swagger reconnaisse avec exactitude la nature structurelle complexe de vos données.

Sans aucune installation, ouvrez votre lien vers l'API suivi de `/docs` dans votre navigateur principal tant que Docker est allumé (Ex: `http://localhost:3000/docs`). Un superbe portail UI exposera pour un autre dev toutes vos routes et affichera des champs pour écrire les valeurs d'API pour jouer avec.

## 7) Conformité Technique (Critères de la SAE)

Ce projet a été conçu en respectant les standards de développement professionnel demandés :

- **Structuration modulaire** : Utilisation de NestJS pour séparer les fonctionnalités (Livres, Membres, Emprunts) en modules indépendants et réutilisables.
- **Architecture API RESTful** : Utilisation stricte des standards REST (JSON, codes de statut HTTP appropriés, méthodes GET/POST/PATCH/DELETE).
- **Persistance des données** : Stockage sécurisé et durable via une base de données **MySQL** pilotée par l'ORM **Sequelize**.
- **Gestion des erreurs** : Mise en œuvre de filtres d'exception globaux pour capturer et formater proprement les erreurs (ex: erreurs de validation, conflits de base de données).
- **Documentation API** : Intégration complète de **Swagger** (OpenAPI) pour documenter et tester les points de terminaison en temps réel.
- **Tests automatisés** : Mise en place de tests unitaires avec **Jest** pour garantir la robustesse du code.
- **Gestion de versions** : Utilisation rigoureuse de **Git** avec des messages de commit clairs pour assurer le suivi du développement. Chaque fonctionnalité (Auth, CRUD, Docker, Tests) a fait l'objet d'un commit spécifique pour garder un historique propre.
- **Conteneurisation** : Déploiement simplifié et environnement identique via **Docker** et **Docker Compose**.

---

### 🔍 Détails sur la Gestion de Versions (Git)

Pour ce projet, nous avons adopté une stratégie de versionnage structurée :

1. **Historique des Commits** : Chaque étape majeure du projet est isolée dans l'historique Git.
2. **Messages Normés** : Utilisation de préfixes comme `feat:` (nouvelle fonctionnalité), `fix:` (correction), ou `docs:` (documentation).
3. **Traçabilité** : Possibilité de revenir en arrière sur n'importe quelle version du code en cas d'erreur.

---

## 8) Flux de Fonctionnement Global (Architecture End-to-End)

Cette section décrit précisément comment les trois couches du projet communiquent entre elles, de l'action utilisateur jusqu'à la base de données.

### Schéma du flux

```
Utilisateur
    │
    │  (interagit avec l'interface)
    ▼
┌─────────────────────────────────┐
│   Frontend React (port 5173)    │
│   library-frontend/src/         │
│   - App.tsx, views/, components/│
└────────────────┬────────────────┘
                 │
                 │  Requêtes HTTP (GET, POST, PUT, DELETE)
                 │  via Axios → http://localhost:3000
                 │
                 ▼
┌─────────────────────────────────┐
│   API NestJS (port 3000)        │
│   src/                          │
│   - Controllers : routing HTTP  │
│   - Services : logique métier   │
│   - Guards JWT : sécurité auth  │
└────────────────┬────────────────┘
                 │
                 │  Requêtes SQL via Sequelize ORM
                 │
                 ▼
┌─────────────────────────────────┐
│   MySQL 8.0 (port 3306)         │
│   Base : library_db             │
│   Tables : users, books,        │
│   authors, loans, categories,   │
│   member_profiles, book_authors │
└─────────────────────────────────┘
```

### Détail des étapes

**1. L'utilisateur interagit avec le Frontend React**

Le frontend (React + Vite, port `5173`) présente les vues : liste des livres, emprunts, utilisateurs, auteurs, etc. Chaque action (clic sur "Ajouter", "Supprimer", "Connexion"…) déclenche une fonction dans une vue (`BooksView.tsx`, `LoansView.tsx`…).

**2. React envoie une requête HTTP via Axios**

Le fichier `library-frontend/src/api/index.ts` configure une instance Axios pointant vers `http://localhost:3000`. Toutes les requêtes (avec le token JWT dans les headers pour les routes protégées) sont envoyées vers l'API NestJS.

```typescript
// library-frontend/src/api/index.ts
axios.defaults.baseURL = "http://localhost:3000";
axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
```

**3. L'API NestJS traite la logique métier**

Chaque module (`books`, `loans`, `users`…) suit la structure NestJS :

- Le **Controller** reçoit la requête HTTP et délègue au Service.
- Le **Service** contient la logique (vérification stock, calcul dates, règles métier).
- Le **Guard JWT** (`JwtAuthGuard`) protège les routes qui nécessitent une authentification.

**4. Sequelize échange avec MySQL**

Le Service appelle les modèles Sequelize (`Book.findAll()`, `Loan.create()`…). Sequelize traduit ces appels en requêtes SQL et les envoie à MySQL. Le résultat remonte en sens inverse jusqu'à l'interface React.

### Exemple concret : Créer un emprunt

```
[Clic "Emprunter" dans LoansView.tsx]
        │
        ▼
axios.post('/loans', { userId, bookId, dueDate })
        │
        ▼
LoansController → @Post() → loansService.create(dto)
        │
        ▼
loansService → vérifie stock du livre (booksService)
             → Loan.create({ userId, bookId, dueDate })
             → Book.decrement('stock', { where: { id: bookId } })
        │
        ▼
MySQL ← INSERT INTO loans ... / UPDATE books SET stock = stock - 1
        │
        ▼
Réponse JSON 201 → React met à jour l'affichage
```

**Oui, cette architecture est entièrement implémentée dans ce projet.** Le frontend React, l'API NestJS et la base MySQL sont chacun conteneurisés via Docker Compose et communiquent exactement selon ce schéma.

---

---

## 9) Rôles, règles de la bibliothèque et comptes

### Rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| **MEMBER** (adhérent / étudiant) | S'inscrire seul, consulter le catalogue, **réserver**, annuler ses réservations, voir **ses** prêts, **renouveler** ses prêts |
| **ADMIN** (bibliothécaire) | Tout le reste : livres, auteurs, catégories, membres, **enregistrer les prêts et retours** au comptoir, voir tous les prêts et réservations |

Toutes les routes exigent un jeton JWT, sauf `GET /health`, `POST /auth/login` et `POST /auth/register`. L'inscription crée toujours un compte `MEMBER` : le rôle `ADMIN` ne peut être donné que par un bibliothécaire. Les mots de passe sont chiffrés (bcrypt) et jamais renvoyés par l'API. Un adhérent ne voit jamais les prêts des autres.

### Règles de prêt (modifiables dans `src/circulation/circulation.rules.ts`)

- Prêt de **14 jours** par défaut (30 jours maximum), **3 livres** maximum en même temps, pas deux fois le même livre.
- **Renouvellement** : +14 jours, **2 fois** maximum, impossible si le prêt est en retard ou si un autre adhérent a réservé le livre.
- **Retard** : amende de **0,20 € par jour**. Tant qu'un livre est en retard, le membre ne peut ni emprunter, ni réserver, ni renouveler.

### Règles de réservation

- Livre **disponible** : un exemplaire est **mis de côté** au comptoir (statut `READY`) pendant **3 jours**. Passé ce délai, la réservation **expire** et l'exemplaire est remis en circulation.
- Livre **indisponible** : l'adhérent entre dans la **file d'attente** (`PENDING`, avec sa position). Quand un exemplaire est rendu, il est gardé pour le premier de la file.
- Maximum **3 réservations actives** par adhérent, pas de doublon. Quand le bibliothécaire enregistre le prêt, la réservation passe à `COMPLETED`.
- Un livre ne peut pas être supprimé tant qu'il est prêté ou réservé ; un adhérent ne peut pas être supprimé tant qu'il a un livre à rendre.

Stock : à tout moment, `exemplaires disponibles + prêtés + mis de côté = total`.

### Comptes du jeu de données

| Email | Rôle |
|---|---|
| `admin@admin.com` | ADMIN (bibliothécaire) : mot de passe défini dans `db/seed.sql` |
| `amina@example.com`, `yanis@example.com`, `mohamed@gmail.com`, `justin@gmail.com`, `Aliou@gmail.com` | MEMBER |

Le seed contient aussi des exemples de démonstration : une file d'attente, une réservation prête à retirer, un prêt en retard (avec amende) et un historique de prêt rendu.

### Tests

```bash
npm test            # tests unitaires
npm run test:e2e    # scénarios complets avec vrais comptes (droits, prêts, retards, réservations, suppressions)
```
