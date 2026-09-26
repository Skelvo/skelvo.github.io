// Étape 2 : tracker.
// Lit le GPS en local toutes les 15 s (gratuit) et n'utilise la data cellulaire que quand
// c'est utile :
//   - moto garée   : un "battement de cœur" par heure (dernière position + batterie)
//   - mouvement    : envoi immédiat (alerte), puis un envoi par minute tant que ça roule
// Les points non envoyés (pas de réseau, tunnel...) sont gardés en mémoire et renvoyés
// au prochain envoi réussi.

#include "board.h"

#include <ArduinoHttpClient.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copie include/secrets.example.h en include/secrets.h et remplis-le"
#endif

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------
static const uint32_t GPS_SAMPLE_MS       = 15UL * 1000;       // lecture GPS locale
static const uint32_t MOVING_UPLOAD_MS    = 60UL * 1000;       // envoi pendant un trajet
static const uint32_t PARKED_HEARTBEAT_MS = 60UL * 60 * 1000;  // envoi moto garée
static const uint32_t STOP_AFTER_MS       = 5UL * 60 * 1000;   // immobile depuis 5 min = garée
static const float    PARK_RADIUS_M       = 80;    // sortie de ce rayon = la moto bouge
static const float    MOVING_SPEED_KMH    = 10;    // vitesse GPS considérée comme un mouvement
static const float    STILL_MOVING_M      = 25;    // pendant un trajet : déplacement mini entre 2 lectures
static const float    STILL_MOVING_KMH    = 5;
static const float    MAX_HDOP            = 5;     // on ignore les fixes trop imprécis
static const size_t   QUEUE_SIZE          = 240;   // ~1 h de trajet sans réseau
static const size_t   BATCH_SIZE          = 30;    // points max par requête
static const int      MAX_FAILURES        = 5;     // échecs d'envoi avant redémarrage du modem

// ---------------------------------------------------------------------------

struct Point {
  uint32_t t;
  double   lat, lng;
  float    spd, alt, crs, hdop;
  uint8_t  sat;
};

static Point  queue[QUEUE_SIZE];
static size_t qHead = 0, qCount = 0;

static TinyGsmClient gsmClient(modem);
static HttpClient    http(gsmClient, CFG_SERVER_HOST, CFG_SERVER_PORT);

static bool     moving = false;
static bool     hasAnchor = false;
static double   anchorLat, anchorLng;  // position de stationnement (ou dernier point en trajet)
static bool     hasLastFix = false;
static GpsFix   lastFix;
static uint32_t lastSampleMs = 0, lastUploadMs = 0, lastMotionMs = 0;
static bool     uploadNow = true;  // premier envoi dès le démarrage
static int      failures = 0;

static void enqueue(const GpsFix &f) {
  size_t idx;
  if (qCount < QUEUE_SIZE) {
    idx = (qHead + qCount) % QUEUE_SIZE;
    qCount++;
  } else {  // file pleine : on écrase le plus ancien
    idx = qHead;
    qHead = (qHead + 1) % QUEUE_SIZE;
  }
  queue[idx] = Point{f.unixTime, f.lat, f.lng, f.speedKmh, f.altitude, f.course, f.hdop,
                     static_cast<uint8_t>(f.satsUsed)};
}

static void setAnchor(const GpsFix &f) {
  anchorLat = f.lat;
  anchorLng = f.lng;
  hasAnchor = true;
}

static void sample() {
  GpsFix fix;
  if (!gpsRead(fix)) {
    SerialMon.printf("[gps] pas de fix (%d satellites visibles)\n", fix.satsInView);
    return;
  }
  if (fix.hdop > MAX_HDOP) {
    SerialMon.printf("[gps] fix ignoré, hdop=%.1f\n", fix.hdop);
    return;
  }
  lastFix = fix;
  hasLastFix = true;

  const uint32_t now = millis();
  const double d = hasAnchor ? distanceMeters(anchorLat, anchorLng, fix.lat, fix.lng) : 0;

  if (!hasAnchor) {
    // Première position après le démarrage
    setAnchor(fix);
    enqueue(fix);
    uploadNow = true;
  } else if (!moving) {
    if (d >= PARK_RADIUS_M || fix.speedKmh >= MOVING_SPEED_KMH) {
      SerialMon.printf("[gps] MOUVEMENT détecté (%.0f m, %.1f km/h)\n", d, fix.speedKmh);
      moving = true;
      lastMotionMs = now;
      setAnchor(fix);
      enqueue(fix);
      uploadNow = true;  // alerte : on prévient tout de suite
    }
  } else {
    enqueue(fix);
    if (d >= STILL_MOVING_M || fix.speedKmh >= STILL_MOVING_KMH) {
      lastMotionMs = now;
      setAnchor(fix);
    } else if (now - lastMotionMs >= STOP_AFTER_MS) {
      SerialMon.println(F("[gps] moto à l'arrêt, passage en mode garé"));
      moving = false;
      setAnchor(fix);
      uploadNow = true;
    }
  }

  SerialMon.printf("[gps] %.6f,%.6f %.1fkm/h hdop=%.1f sats=%d %s file=%u\n", fix.lat, fix.lng,
                   fix.speedKmh, fix.hdop, fix.satsUsed, moving ? "EN MOUVEMENT" : "garée",
                   (unsigned)qCount);
}

static bool ensureNetwork() {
  if (modem.isGprsConnected()) return true;

  SerialMon.println(F("[net] attente du réseau..."));
  if (!modem.waitForNetwork(60000L)) {
    SerialMon.println(F("[net] pas de réseau"));
    return false;
  }
  SerialMon.println(F("[net] connexion data (APN " CFG_APN ")..."));
  if (!modem.gprsConnect(CFG_APN, "", "")) {
    SerialMon.println(F("[net] échec de la connexion data"));
    return false;
  }
  SerialMon.print(F("[net] connecté, IP "));
  SerialMon.println(modem.localIP());
  return true;
}

// Envoie jusqu'à BATCH_SIZE points (éventuellement zéro = simple battement de cœur).
static bool postBatch(size_t count) {
  String body;
  body.reserve(64 + count * 110);
  body += "{\"bat\":";
  body += batteryMilliVolts();
  body += ",\"csq\":";
  body += modem.getSignalQuality();
  body += ",\"pts\":[";
  char buf[160];
  for (size_t i = 0; i < count; i++) {
    const Point &p = queue[(qHead + i) % QUEUE_SIZE];
    snprintf(buf, sizeof(buf),
             "%s{\"t\":%u,\"lat\":%.6f,\"lng\":%.6f,\"spd\":%.1f,\"alt\":%.0f,\"crs\":%.0f,"
             "\"hdop\":%.1f,\"sat\":%u}",
             i ? "," : "", p.t, p.lat, p.lng, p.spd, p.alt, p.crs, p.hdop, p.sat);
    body += buf;
  }
  body += "]}";

  http.setHttpResponseTimeout(20000);
  http.beginRequest();
  int err = http.post(CFG_SERVER_PATH);
  if (err != 0) {
    SerialMon.printf("[http] connexion impossible (%d)\n", err);
    http.stop();
    return false;
  }
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", body.length());
  http.sendHeader("X-API-Key", CFG_DEVICE_KEY);
  http.beginBody();
  http.print(body);
  http.endRequest();

  int status = http.responseStatusCode();
  http.stop();
  SerialMon.printf("[http] %u point(s) -> HTTP %d\n", (unsigned)count, status);

  if (status >= 200 && status < 300) return true;
  if (status == 400 || status == 413) {
    // Données refusées par le serveur : inutile de les renvoyer en boucle
    SerialMon.println(F("[http] lot rejeté par le serveur, abandonné"));
    return true;
  }
  return false;
}

static void upload() {
  lastUploadMs = millis();
  uploadNow = false;

  // Moto garée : on renvoie la dernière position connue comme battement de cœur.
  // (Le serveur ignore les doublons grâce à l'horodatage GPS.)
  if (!moving && qCount == 0 && hasLastFix) enqueue(lastFix);

  bool ok = ensureNetwork();
  if (ok) {
    do {
      size_t n = qCount < BATCH_SIZE ? qCount : BATCH_SIZE;
      ok = postBatch(n);
      if (!ok) break;
      qHead = (qHead + n) % QUEUE_SIZE;
      qCount -= n;
    } while (qCount > 0);
  }

  if (ok) {
    failures = 0;
    return;
  }
  if (++failures >= MAX_FAILURES) {
    SerialMon.println(F("[net] trop d'échecs, redémarrage du modem"));
    failures = 0;
    modem.restart();
    gpsEnable();
  }
}

void setup() {
  SerialMon.begin(115200);
  delay(500);
  SerialMon.println(F("\n=== Tracker moto ==="));
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  while (!modemPowerOn()) {
    SerialMon.println(F("Modem injoignable, nouvel essai dans 5 s"));
    delay(5000);
  }
  SerialMon.print(F("Modem : "));
  SerialMon.println(modem.getModemInfo());

  // LTE-M en priorité, NB-IoT/GSM en secours (couverture 1NCE)
  modem.setNetworkMode(2);    // 2 = automatique
  modem.setPreferredMode(3);  // 3 = CAT-M et NB-IoT

  while (!gpsEnable()) {
    SerialMon.println(F("Échec de l'activation du GNSS, nouvel essai..."));
    delay(2000);
  }
  ensureNetwork();
}

void loop() {
  const uint32_t now = millis();

  if (now - lastSampleMs >= GPS_SAMPLE_MS || lastSampleMs == 0) {
    lastSampleMs = now;
    sample();
  }

  const uint32_t interval = moving ? MOVING_UPLOAD_MS : PARKED_HEARTBEAT_MS;
  if (uploadNow || now - lastUploadMs >= interval) upload();

  digitalWrite(LED_PIN, hasLastFix ? LOW : HIGH);  // LED allumée = GPS OK
  delay(200);
}
