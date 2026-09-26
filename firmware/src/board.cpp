#include "board.h"

#include <math.h>

TinyGsm modem(SerialAT);

bool modemPowerOn() {
  SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);

  // DTR à LOW : empêche le modem de passer en veille pendant qu'on lui parle.
  pinMode(PIN_DTR, OUTPUT);
  digitalWrite(PIN_DTR, LOW);

  // Le PWRKEY bascule marche/arrêt : on ne l'actionne que si le modem est muet,
  // sinon on l'éteindrait (cas d'un reset de l'ESP32 seul).
  if (!modem.testAT(1000)) {
    SerialMon.println(F("[modem] démarrage du SIM7000G..."));
    pinMode(PWR_PIN, OUTPUT);
    digitalWrite(PWR_PIN, HIGH);
    delay(1000);  // Ton >= 1 s d'après la datasheet SIM7000
    digitalWrite(PWR_PIN, LOW);

    bool ok = false;
    for (int i = 0; i < 20 && !ok; i++) ok = modem.testAT(1000);
    if (!ok) {
      SerialMon.println(F("[modem] pas de réponse aux commandes AT"));
      return false;
    }
  }

  if (!modem.init()) {
    SerialMon.println(F("[modem] init() a échoué, tentative de restart()"));
    if (!modem.restart()) return false;
  }
  return true;
}

bool gpsEnable() {
  // Sur la T-SIM7000G, la GPIO4 du SIM7000G alimente l'antenne GNSS active.
  modem.sendAT("+SGPIO=0,4,1,1");
  modem.waitResponse(10000L);
  return modem.enableGPS();
}

// Jours depuis 1970-01-01 pour une date civile (algorithme de H. Hinnant).
static int32_t daysFromCivil(int y, unsigned m, unsigned d) {
  y -= m <= 2;
  const int32_t era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = static_cast<unsigned>(y - era * 400);
  const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + static_cast<int32_t>(doe) - 719468;
}

// "20260926143512.000" -> timestamp Unix
static uint32_t parseGnssTime(const String &s) {
  if (s.length() < 14) return 0;
  int y  = s.substring(0, 4).toInt();
  int mo = s.substring(4, 6).toInt();
  int d  = s.substring(6, 8).toInt();
  int h  = s.substring(8, 10).toInt();
  int mi = s.substring(10, 12).toInt();
  int se = s.substring(12, 14).toInt();
  if (y < 2020 || mo < 1 || mo > 12 || d < 1 || d > 31) return 0;
  return static_cast<uint32_t>(daysFromCivil(y, mo, d)) * 86400UL + h * 3600UL + mi * 60UL + se;
}

bool gpsRead(GpsFix &fix) {
  fix = GpsFix{};

  // Réponse type (champs séparés par des virgules, certains vides) :
  // 1,1,20260926143512.000,48.856614,2.352222,35.2,0.00,0.0,1,,1.1,1.4,0.9,,12,8,,,38,,
  // run,fix,utc,lat,lng,alt,speed,course,mode,-,hdop,pdop,vdop,-,sats_vus,sats_utilisés,...
  String raw = modem.getGPSraw();
  raw.trim();
  if (raw.length() == 0) return false;

  const int MAX_FIELDS = 22;
  String f[MAX_FIELDS];
  int n = 0, start = 0;
  while (n < MAX_FIELDS) {
    int comma = raw.indexOf(',', start);
    if (comma < 0) {
      f[n++] = raw.substring(start);
      break;
    }
    f[n++] = raw.substring(start, comma);
    start = comma + 1;
  }
  if (n < 16) return false;

  fix.satsInView = f[14].toInt();
  fix.satsUsed   = f[15].toInt();
  if (f[1] != "1") return false;  // pas encore de fix

  fix.unixTime = parseGnssTime(f[2]);
  fix.lat      = strtod(f[3].c_str(), nullptr);
  fix.lng      = strtod(f[4].c_str(), nullptr);
  fix.altitude = f[5].toFloat();
  fix.speedKmh = f[6].toFloat();
  fix.course   = f[7].toFloat();
  fix.hdop     = f[10].length() ? f[10].toFloat() : 99.0f;
  fix.valid    = fix.unixTime != 0 && !(fix.lat == 0.0 && fix.lng == 0.0);
  return fix.valid;
}

uint32_t batteryMilliVolts() {
  uint32_t mv = analogReadMilliVolts(BAT_ADC) * 2;
  return (mv < 2500 || mv > 4500) ? 0 : mv;
}

double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
  const double R = 6371000.0;
  const double toRad = M_PI / 180.0;
  double dLat = (lat2 - lat1) * toRad;
  double dLng = (lng2 - lng1) * toRad;
  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(lat1 * toRad) * cos(lat2 * toRad) * sin(dLng / 2) * sin(dLng / 2);
  return 2 * R * atan2(sqrt(a), sqrt(1 - a));
}
