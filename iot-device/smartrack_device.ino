// IoT Device Configuration for Arduino/Raspberry Pi with GPS, Sensors, and RFID

#include <SoftwareSerial.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>

// Pin Definitions
#define DHT_PIN 2
#define DHT_TYPE DHT22
#define RFID_RX_PIN 3
#define RFID_TX_PIN 4
#define GPS_RX_PIN 5
#define GPS_TX_PIN 6

// Initialize sensors
DHT dht(DHT_PIN, DHT_TYPE);
SoftwareSerial gpsSerial(GPS_RX_PIN, GPS_TX_PIN);
SoftwareSerial rfidSerial(RFID_RX_PIN, RFID_TX_PIN);
TinyGPSPlus gps;

// Tracking data
String shipmentId = "SHIP-001";
String deviceId = "DEVICE-001";

struct SensorData {
  float temperature;
  float humidity;
  float latitude;
  float longitude;
  float altitude;
  String rfidTag;
  unsigned long timestamp;
};

void setup() {
  Serial.begin(9600);     // Serial monitor
  gpsSerial.begin(9600);  // GPS module
  rfidSerial.begin(9600); // RFID reader
  
  dht.begin(); // DHT sensor
  
  delay(2000);
  Serial.println("SmartTrack IoT Device Initialized");
  Serial.println("Initializing sensors...");
}

void loop() {
  // Read sensor data
  SensorData data = readAllSensors();
  
  // Send to server
  sendDataToServer(data);
  
  // Print for debugging
  printSensorData(data);
  
  delay(5000); // Read every 5 seconds
}

SensorData readAllSensors() {
  SensorData data;
  
  // Read DHT22 (Temperature & Humidity)
  data.temperature = dht.readTemperature();
  data.humidity = dht.readHumidity();
  
  // Read GPS data
  if (gpsSerial.available()) {
    while (gpsSerial.available() > 0) {
      gps.encode(gpsSerial.read());
    }
    
    if (gps.location.isValid()) {
      data.latitude = gps.location.lat();
      data.longitude = gps.location.lng();
      data.altitude = gps.altitude.meters();
    }
  }
  
  // Read RFID tag
  if (rfidSerial.available()) {
    String rfidData = rfidSerial.readStringUntil('\n');
    data.rfidTag = rfidData;
  }
  
  data.timestamp = millis();
  
  return data;
}

void sendDataToServer(SensorData data) {
  // Create JSON payload
  StaticJsonDocument<256> doc;
  
  doc["shipmentId"] = shipmentId;
  doc["deviceId"] = deviceId;
  doc["temperature"] = data.temperature;
  doc["humidity"] = data.humidity;
  doc["latitude"] = data.latitude;
  doc["longitude"] = data.longitude;
  doc["altitude"] = data.altitude;
  doc["rfidTag"] = data.rfidTag;
  doc["timestamp"] = data.timestamp;
  
  // Serialize JSON
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send via Serial (to be connected to server via WiFi/GSM module)
  Serial.println(jsonString);
}

void printSensorData(SensorData data) {
  Serial.println("\n=== SENSOR DATA ===");
  Serial.print("Temperature: ");
  Serial.print(data.temperature);
  Serial.println("°C");
  
  Serial.print("Humidity: ");
  Serial.print(data.humidity);
  Serial.println("%");
  
  Serial.print("Latitude: ");
  Serial.println(data.latitude, 6);
  
  Serial.print("Longitude: ");
  Serial.println(data.longitude, 6);
  
  Serial.print("RFID Tag: ");
  Serial.println(data.rfidTag);
  Serial.println("==================");
}
