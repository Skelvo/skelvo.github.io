// Brochage de la LILYGO T-SIM7000G et fonctions communes (modem, GNSS, batterie).
// Brochage repris des exemples officiels : github.com/Xinyuan-LilyGO/LilyGO-T-SIM7000G
#pragma once

#include <Arduino.h>
#include <TinyGsmClient.h>

#define UART_BAUD 115200
#define PIN_DTR   25
#define PIN_TX    27
#define PIN_RX    26
#define PWR_PIN   4   // PWRKEY du SIM7000G (via transistor : HIGH sur l'ESP32 = appui)
#define LED_PIN   12  // LED verte, active à l'état bas
#define BAT_ADC   35  // tension batterie 18650 via pont diviseur 1/2

#define SerialMon Serial
#define SerialAT  Serial1

extern TinyGsm modem;

struct GpsFix {
  bool     valid;
  uint32_t unixTime;    // heure UTC donnée par le GNSS (secondes depuis 1970)
  double   lat;
  double   lng;
  float    altitude;    // m
  float    speedKmh;    // km/h
  float    course;      // degrés
  float    hdop;        // précision horizontale (plus petit = mieux, < 2 = très bon)
  int      satsInView;
  int      satsUsed;
};

// Allume le SIM7000G (s'il ne répond pas déjà) et initialise TinyGSM.
bool modemPowerOn();

// Alimente l'antenne GNSS active et démarre le GNSS.
bool gpsEnable();

// Lit AT+CGNSINF et remplit `fix`. Renvoie true si une position valide est disponible.
bool gpsRead(GpsFix &fix);

// Tension de la batterie 18650 en mV (0 si pas de batterie / lecture incohérente).
uint32_t batteryMilliVolts();

// Distance en mètres entre deux points (formule de haversine).
double distanceMeters(double lat1, double lng1, double lat2, double lng2);
