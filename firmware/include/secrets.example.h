// Copie ce fichier en "secrets.h" (même dossier) et remplis les valeurs.
// secrets.h est ignoré par git : tes clés ne partent pas sur GitHub.
#pragma once

// APN de la carte SIM 1NCE (pas d'identifiant / mot de passe)
#define CFG_APN "iot.1nce.net"

// Backend (nom de domaine ou IP publique, SANS "http://")
#define CFG_SERVER_HOST "moto.example.com"
#define CFG_SERVER_PORT 80
#define CFG_SERVER_PATH "/api/positions"

// Clé d'écriture du tracker : doit être identique à DEVICE_KEY côté serveur
#define CFG_DEVICE_KEY "remplace-moi-par-une-longue-cle-aleatoire"
