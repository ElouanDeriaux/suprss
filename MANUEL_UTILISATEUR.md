# Manuel Utilisateur - SUPRSS
*Lecteur de flux RSS collaboratif*

---

## Table des matières
0. [Installation rapide](#installation-rapide)
1. [Première connexion](#première-connexion)
2. [Interface principale](#interface-principale)
3. [Gestion des collections](#gestion-des-collections)
4. [Gestion des flux RSS](#gestion-des-flux-rss)
5. [Lecture des articles](#lecture-des-articles)
6. [Fonctionnalités collaboratives](#fonctionnalités-collaboratives)
7. [Archives et sauvegarde](#archives-et-sauvegarde)
8. [Paramètres](#paramètres)
9. [Import/Export](#importexport)
10. [Résolution de problèmes](#résolution-de-problèmes)

---

## Installation rapide

### Si vous n'avez PAS Git installé (Méthode recommandée)

1. **Télécharger SUPRSS**
   - Aller sur : https://github.com/ElouanDeriaux/suprss
   - Cliquer sur le bouton vert **"Code"** 
   - Cliquer sur **"Download ZIP"**
   - Extraire le fichier ZIP téléchargé
   - Renommer le dossier `suprss-main` en `suprss`

2. **Prérequis : Installer Docker Desktop**
   - Windows : https://docs.docker.com/desktop/windows/install/
   - Mac : https://docs.docker.com/desktop/mac/install/
   - Démarrer Docker Desktop

3. **Lancer SUPRSS**
   - Ouvrir un terminal/invite de commande
   - Naviguer dans le dossier : `cd suprss`
   - Windows : double-cliquer sur `start.bat`
   - Mac/Linux : `./start.sh`

4. **Accéder à l'application**
   - Ouvrir un navigateur
   - Aller sur : http://localhost:3000

### Si vous avez Git installé

```bash
git clone https://github.com/ElouanDeriaux/suprss.git
cd suprss
./start.sh    # Linux/Mac
start.bat     # Windows
```

---

## Première connexion

### Création de compte

1. **Rendez-vous sur** http://localhost:3000
2. **Cliquez sur "S'inscrire"**
3. **Remplissez le formulaire :**
   - Nom d'utilisateur (3-20 caractères)
   - Email valide
   - Mot de passe fort (8 caractères min, majuscule, minuscule, chiffre, caractère spécial)
4. **Cliquez "S'inscrire"**

### Connexion OAuth (optionnel)
- **Google** : Cliquez sur le bouton Google et suivez les instructions
- **GitHub** : Cliquez sur le bouton GitHub et autorisez l'application

### Authentification 2FA (optionnel)
Si la 2FA est activée, vous recevrez un code par email à saisir.

---

## Interface principale

### Dashboard
Après connexion, vous arrivez sur le **tableau de bord** qui contient :

- **🌟 Flux RSS populaires** : Suggestions de flux connus
- **📚 Mes Collections** : Vos collections personnelles
- **👥 Collections partagées** : Collections où vous êtes invité
- **📊 Zone de flux** : Flux de la collection sélectionnée

### Navigation
- **Dashboard** : Gestion des collections et flux
- **Flux** : Lecture des articles
- **⭐ Favoris** : Articles marqués comme favoris  
- **🗃️ Archives** : Articles sauvegardés définitivement
- **⚙️ Paramètres** : Configuration utilisateur

---

## Gestion des collections

### Créer une collection
1. **Dans le dashboard**, tapez le nom dans le champ "Nom de la collection"
2. **Cliquez "+ Créer"**
3. **La collection** apparaît dans "Mes Collections"

### Types de collections
- **📚 Personnelle** : Visible par vous seul
- **👥 Partagée** : Accessible à plusieurs utilisateurs avec permissions

### Sélectionner une collection
**Cliquez sur le nom** de la collection pour voir ses flux dans la zone du bas.

### Supprimer une collection
1. **Cliquez sur "🗑️"** à côté du nom de la collection
2. **Confirmez** la suppression dans la popup
3. ⚠️ **Attention** : Tous les flux et articles seront supprimés

---

## Gestion des flux RSS

### Ajouter un flux depuis les suggestions
1. **Dans la section "🌟 Flux RSS populaires"**
2. **Sélectionnez une collection** en cliquant dessus
3. **Cliquez "+ Ajouter"** sur le flux désiré
4. **Le flux** est automatiquement ajouté et synchronisé

### Ajouter un flux manuellement
1. **Sélectionnez une collection**
2. **Remplissez le formulaire d'ajout :**
   - Titre du flux
   - URL RSS (ex: https://www.lemonde.fr/rss/une.xml)
   - Description (optionnel)
3. **Cliquez "+ Ajouter"**

### Rafraîchir les flux
- **Automatique** : Tous les 10 minutes
- **Manuel** : Cliquez "🔄 Tout rafraîchir" sous la liste des flux
- **Flux spécifique** : Cliquez "🔄" à côté du nom du flux

### Supprimer un flux
1. **Cliquez "🗑️"** à côté du flux
2. **Confirmez** dans la popup
3. **Les articles** restent visibles dans l'historique

---

## Lecture des articles

### Accéder aux articles
1. **Cliquez sur "📖 Voir les articles"** d'un flux
2. **Ou cliquez "Flux"** dans la navigation pour voir tous les articles

### Interface de lecture
- **Liste des articles** : Titre, source, date, extrait
- **Filtres** : Tous, Non lus, Lus, Favoris
- **Recherche** : Barre de recherche en haut

### Marquer un article
- **📖 Lu/Non lu** : Cliquez sur l'icône œil
- **⭐ Favori** : Cliquez sur l'étoile
- **🗃️ Archiver** : Cliquez sur l'icône archive

### Lire un article
1. **Cliquez sur le titre** de l'article
2. **Lecture** dans l'interface intégrée avec contenu nettoyé
3. **Lien source** : "🔗 Lire l'article complet" pour l'original

### Recherche
1. **Tapez** vos mots-clés dans la barre de recherche
2. **Recherche** dans les titres et contenus
3. **Filtres combinables** avec statut (lu/non lu) et favoris

---

## Fonctionnalités collaboratives

### Partager une collection
1. **Sélectionnez** votre collection
2. **Cliquez "👥 Gérer les membres"**
3. **Ajoutez** un email et choisissez le rôle :
   - **👑 Propriétaire** : Tous droits
   - **🔧 Éditeur** : Ajouter/supprimer flux, écrire messages
   - **👀 Lecteur** : Lecture seule

### Rejoindre une collection partagée
Quand quelqu'un vous invite :
1. **Vous recevez** une notification
2. **La collection** apparaît dans "Collections partagées"
3. **Cliquez dessus** pour voir les flux selon vos permissions

### Messagerie dans les collections
1. **Sélectionnez** une collection partagée
2. **Dans l'interface des flux**, une zone de chat apparaît
3. **Tapez** votre message et appuyez Entrée
4. **Les messages** s'affichent en temps réel pour tous les membres

### Commenter un article
1. **Dans la vue détaillée** d'un article
2. **Zone de commentaires** en bas
3. **Tapez** votre commentaire
4. **Visible** par tous les membres de la collection

### Notifications
- **💬 Badge orange** : Messages non lus dans une collection
- **Compteur** : Nombre de messages non lus
- **Mise à jour** : Automatique toutes les 30 secondes

---

## Archives et sauvegarde

### Archiver un article
1. **Cliquez "🗃️"** à côté de l'article
2. **L'article** est sauvegardé définitivement avec son contenu complet
3. **Accessible** via le menu "Archives"

### Gérer les archives
1. **Menu "🗃️ Archives"**
2. **Liste** de tous vos articles archivés
3. **Filtres** : Par collection, recherche, date

### Télécharger une archive
1. **Dans la liste des archives**
2. **Cliquez "Télécharger"**
3. **Fichier .txt** avec métadonnées et contenu complet

### Supprimer une archive
1. **Cliquez "🗑️"** dans la liste des archives
2. **Confirmez** la suppression
3. ⚠️ **Irréversible** : Le contenu sera perdu

---

## Paramètres

### Accéder aux paramètres
**Cliquez "⚙️ Paramètres"** dans le menu utilisateur (coin supérieur droit)

### Changer le mot de passe
1. **Onglet "Mot de passe"**
2. **Saisissez** l'ancien mot de passe
3. **Nouveau mot de passe** (respecter les critères de sécurité)
4. **Cliquez "Mettre à jour"**

### Configurer l'authentification 2FA
1. **Onglet "Sécurité"**
2. **Activer/Désactiver** la double authentification
3. **Code de vérification** envoyé par email

### Préférences d'affichage
- **🌙/☀️ Thème** : Mode sombre ou clair (bouton en haut à droite)
- **Persistance** : Votre choix est sauvegardé automatiquement

### Gérer les comptes OAuth
- **Associer** des comptes Google/GitHub
- **Dissocier** des services OAuth existants

---

## Import/Export

### Exporter vos données
1. **Paramètres → Export**
2. **Cliquez "Exporter OPML"**
3. **Fichier téléchargé** avec toutes vos collections et flux
4. **Compatible** avec tous les lecteurs RSS

### Importer des données
1. **Paramètres → Import**
2. **Choisissez un fichier** OPML (.opml ou .xml)
3. **Cliquez "Importer"**
4. **Collections créées** automatiquement
5. **Doublons** détectés et ignorés

### Formats supportés
- **OPML** : Format standard des lecteurs RSS
- **Sources compatibles** : Feedly, Inoreader, NewsBlur, etc.

---

## Résolution de problèmes

### Flux qui ne se charge pas
**Causes possibles :**
- URL RSS incorrecte
- Flux temporairement indisponible
- Format RSS invalide

**Solutions :**
1. **Vérifiez l'URL** dans un navigateur
2. **Testez** avec un validateur RSS en ligne
3. **Contactez** l'administrateur du site source

### Articles qui n'apparaissent pas
1. **Attendez** la prochaine synchronisation (max 10 minutes)
2. **Rafraîchissez** manuellement le flux
3. **Vérifiez** que le flux publie de nouveaux articles

### Problèmes de connexion
1. **Vérifiez** votre nom d'utilisateur/email et mot de passe
2. **Si 2FA** : Assurez-vous d'avoir accès à votre email
3. **Mot de passe oublié** : Utilisez la fonction de récupération

### Collections partagées invisibles
1. **Vérifiez** l'onglet "Collections partagées"
2. **Demandez** à l'expéditeur de vérifier l'invitation
3. **Vérifiez** votre email d'inscription

### Performance lente
1. **Nombre d'articles** : Archivez les anciens articles
2. **Collections** : Répartissez les flux sur plusieurs collections
3. **Navigateur** : Effacez le cache et cookies

### Erreurs de téléchargement
1. **Vérifiez** que l'article est bien archivé
2. **Réessayez** le téléchargement
3. **Format** : Les fichiers sont en .txt par défaut

---

## Raccourcis utiles

### Raccourcis clavier
- **Ctrl + F** : Recherche dans la page
- **Espace** : Défiler vers le bas lors de la lecture
- **Échap** : Fermer les popups/modales

### Navigation rapide
- **Dashboard** : Gestion de collections
- **Flux** : Lecture d'articles
- **Favoris** : Articles marqués
- **Archives** : Sauvegarde permanente

### Conseils d'utilisation
- **Organisez** vos flux par thèmes avec des collections
- **Archivez** les articles importants avant qu'ils disparaissent
- **Utilisez** la recherche pour retrouver des articles spécifiques
- **Partagez** des collections pour collaborer avec votre équipe
- **Exportez** régulièrement vos données en sauvegarde

---

## Support

### Ressources
- **Documentation** : README.md du projet
- **Code source** : https://github.com/ElouanDeriaux/suprss
- **Issues** : Signaler des problèmes sur GitHub

### Contact
- **Email** : elouanderiaux@gmail.com
- **GitHub** : @ElouanDeriaux

---

*Guide utilisateur SUPRSS - Version 1.0*
*Dernière mise à jour : 2024*