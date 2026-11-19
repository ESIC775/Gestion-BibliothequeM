# BOOKIN

## Lancement et installation

### etape 1 : Demarrer le Serveur et la DB (Via Docker)

Ouvrez le dossier principal du projet a l'endroit ou se situe le document docker-compose.yml. Assurez-vous d'avoir lance le service Docker.

### etape 2 : Lancer le projet avec Docker

C'est la methode recommandee pour avoir tout l'environnement (Base de donnees + Backend + Frontend) qui tourne ensemble.

```bash
# Tout lancer en arriere-plan
docker compose up -d

# Tout arreter
docker compose down

# Forcer la reconstruction (si vous avez change le code)
docker compose up -d --build

# Repartir d'une base vide (obligatoire apres une mise a jour du schema, voir ci-dessous)
docker compose down -v
docker compose up -d --build
```

#### Acces aux services :

- **Backend API** : http://localhost:3000
- **Frontend** : http://localhost:5173 (ou http://localhost:80 en mode prod)
- **Swagger** : http://localhost:3000/docs

### etape 3 : Lancer le Frontend (React)

Vous avez deux facons de lancer le frontend selon vos besoins :

#### A) Mode Developpement (Vite)

Ideal pour modifier le code en temps reel. Ouvrez le terminal dans le sous-dossier library-frontend :

```bash
cd library-frontend
npm install
npm run dev
```

Accessible sur : http://localhost:5173.

#### B) Mode Production (Docker + Nginx)

C'est la mehode la plus robuste. Le frontend est compile et servi par un serveur **Nginx** haute performance a l'interieur d'un conteneur Docker.

```bash
# Depuis la racine du projet (la  ou est le docker-compose.yml)
docker compose up --build frontend
```

Accessible sur : http://localhost:80 (Le port standard du web).
