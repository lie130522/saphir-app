# Etape 1: Construire le Frontend (Vite/React)
FROM node:lts-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Etape 2: Construire le Backend et préparer l'image finale
FROM node:lts-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production

# Copier le code source du backend
COPY backend/ ./

# Créer le repertoire uplaods
RUN mkdir -p /app/uploads

# Copier le build du frontend dans un dossier accessible par le backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Exposer le port de l'API (qui servira aussi le frontend)
EXPOSE 3001

# Lancement du serveur backend
CMD ["npm", "run", "start"]
