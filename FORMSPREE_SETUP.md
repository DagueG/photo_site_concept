# Configuration de Déploiement FormSubmit

Pour que l'email fonctionne, tu dois configurer **FormSubmit** qui est gratuit et sans serveur.

## Étape 1️⃣: Créer un Form FormSubmit

1. Va sur https://formspree.io
2. Clique sur "Create" ou "Sign Up"
3. **Inscris-toi** avec ton email Gmail
4. Crée un **"New Form"**
5. Donne-lui un nom (ex: "Valentine Garden")
6. **Valide** - Tu vas recevoir un email de confirmation

## Étape 2️⃣: Récupérer l'ID du Form

1. Après validation, tu verras un ID comme: **f/abc123def456**
2. Copie cet ID

## Étape 3️⃣: Mettre à jour script.js

Ouvre `script.js` et cherche cette ligne (~263):

```javascript
fetch('https://formspree.io/f/YOUR_FORM_ID', {
```

Remplace `YOUR_FORM_ID` par ton vrai ID. Par exemple:

```javascript
fetch('https://formspree.io/f/mrgeqnkl', {
```

## Étape 4️⃣: C'est tout!

Maintenant quand quelqu'un clique **"Oui ♥️"**, un email sera envoyé à `daniel.guedj.pro@gmail.com`

---

## ✅ Vérification

Pour tester:
1. Plante 14 arbres (ou modifie TREE_GOAL à 1 temporairement)
2. Clique sur "Oui" dans la popup
3. L'email devrait arriver dans la boîte !

---

## 🆘 Troubleshooting

- **Pas d'email reçu?** Vérifie que le FORM_ID est correct
- **Erreur CORS?** FormSubmit est compatible avec tous les domaines
- **Email dans les spams?** Ajoute l'adresse à tes contacts

Besoin d'aide? Je suis là! 🌹
