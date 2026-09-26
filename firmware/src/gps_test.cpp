// Étape 1 : test du GNSS.
// Allume le SIM7000G, démarre le GPS et affiche la position toutes les 2 s sur le port série.
// Aucune carte SIM ni réseau nécessaire. Le premier fix peut prendre 1 à 5 minutes :
// antenne GPS branchée, à l'extérieur ou près d'une fenêtre, ciel dégagé.

#include "board.h"

static uint32_t bootMs;
static bool firstFixPrinted = false;

void setup() {
  SerialMon.begin(115200);
  delay(500);
  SerialMon.println();
  SerialMon.println(F("=== Tracker moto : test GPS ==="));

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // LED éteinte

  while (!modemPowerOn()) {
    SerialMon.println(F("Modem injoignable, nouvel essai dans 5 s (batterie/USB branchés ?)"));
    delay(5000);
  }

  SerialMon.print(F("Modem   : "));
  SerialMon.println(modem.getModemInfo());
  SerialMon.print(F("IMEI    : "));
  SerialMon.println(modem.getIMEI());
  SimStatus sim = modem.getSimStatus();
  SerialMon.print(F("SIM     : "));
  SerialMon.println(sim == SIM_READY ? F("prête") : F("absente / non prête (sans importance pour ce test)"));
  if (sim == SIM_READY) {
    SerialMon.print(F("ICCID   : "));
    SerialMon.println(modem.getSimCCID());
  }
  SerialMon.print(F("Batterie: "));
  SerialMon.print(batteryMilliVolts());
  SerialMon.println(F(" mV"));

  SerialMon.println(F("Activation du GNSS..."));
  while (!gpsEnable()) {
    SerialMon.println(F("Échec de l'activation du GNSS, nouvel essai..."));
    delay(2000);
  }
  bootMs = millis();
  SerialMon.println(F("GNSS actif, recherche des satellites..."));
}

void loop() {
  GpsFix fix;
  bool ok = gpsRead(fix);
  uint32_t elapsed = (millis() - bootMs) / 1000;

  if (!ok) {
    SerialMon.printf("[%4us] pas de fix — satellites visibles : %d\n", elapsed, fix.satsInView);
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // clignote pendant la recherche
    delay(2000);
    return;
  }

  digitalWrite(LED_PIN, LOW);  // LED allumée fixe = fix
  if (!firstFixPrinted) {
    SerialMon.printf(">>> Premier fix obtenu en %u s\n", elapsed);
    firstFixPrinted = true;
  }

  SerialMon.printf("[%4us] lat=%.6f lng=%.6f alt=%.0fm vitesse=%.1fkm/h cap=%.0f° hdop=%.1f sats=%d/%d t=%u\n",
                   elapsed, fix.lat, fix.lng, fix.altitude, fix.speedKmh, fix.course, fix.hdop,
                   fix.satsUsed, fix.satsInView, fix.unixTime);
  SerialMon.printf("        https://www.openstreetmap.org/?mlat=%.6f&mlon=%.6f#map=17/%.6f/%.6f\n",
                   fix.lat, fix.lng, fix.lat, fix.lng);
  delay(2000);
}
