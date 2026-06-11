# Cultivons notre jardin

Tracker d'habitudes gamifié en HTML/CSS/JS vanilla, inspiré de la phrase de Candide : « Il faut cultiver notre jardin. »

## Lancer l'app

Depuis ce dossier :

```bash
python3 -m http.server 8765
```

Puis ouvrir :

http://127.0.0.1:8765

## Fonctionnalités

- Auth locale pseudo + code d'accès via localStorage.
- Données persistantes après refresh.
- CRUD d'habitudes quotidiennes.
- Récompense de pièces et XP à chaque coche.
- Streak et historique des 7 derniers jours.
- Jardin Canvas isométrique 5x4 avec tuiles losange.
- Obstacles initiaux : rochers et mauvaises herbes.
- Boutique de 6 items.
- Inventaire et placement d'items sur tuiles libres.
- Nettoyage d'obstacles contre des pièces.
- Module social local/simulé : recherche, demande, acceptation, visite lecture seule.

## Contraintes respectées

- Zéro framework.
- Zéro dépendance npm.
- Persistance localStorage uniquement.
- Assets dessinés via Canvas/CSS.
