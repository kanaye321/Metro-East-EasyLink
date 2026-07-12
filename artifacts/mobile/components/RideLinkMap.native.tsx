import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { GroupMember, SharedRoute } from '@/context/AppContext';

interface Props {
  connectedRiders: GroupMember[];
  btCount: number;
  netCount: number;
  offlineCount: number;
  sharedRoutes: SharedRoute[];
  isSharingRoute: boolean;
  onToggleShareRoute: () => void;
}

const DEFAULT_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 60,
  longitudeDelta: 60,
};

export default function RideLinkMap({
  connectedRiders, btCount, netCount, offlineCount,
  sharedRoutes, isSharingRoute, onToggleShareRoute,
}: Props) {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const userRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setRegion(userRegion);
        mapRef.current?.animateToRegion(userRegion, 800);
      } catch {}
    })();
  }, []);

  const connectionColor = (type: string) => {
    if (type === 'bluetooth') return colors.success;
    if (type === 'network') return colors.network;
    return colors.offline;
  };

  const recenter = () => {
    if (userLocation) {
      const r = { ...userLocation, latitudeDelta: 0.015, longitudeDelta: 0.015 };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);
    }
  };

  // Only show riders who are online and have a valid live position.
  const liveRiders = connectedRiders.filter(r =>
    r.connectionType !== 'offline' &&
    r.latitude !== 0 && r.longitude !== 0 &&
    Date.now() - r.lastSeen < 60_000,
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsCompass
      >
        {liveRiders.map(rider => (
          <Marker
            key={rider.id}
            coordinate={{ latitude: rider.latitude, longitude: rider.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={rider.nickname}
            description={rider.speed > 0 ? `${rider.speed} km/h` : 'Live'}
          >
            <View style={styles.markerWrap}>
              <View style={[styles.riderMarker, { backgroundColor: connectionColor(rider.connectionType) }]}>
                <Text style={styles.markerInitial}>{rider.nickname.charAt(0)}</Text>
              </View>
              <View style={[styles.markerLabel, { backgroundColor: colors.card + 'EE', borderColor: colors.border }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.markerName, { color: colors.foreground }]} numberOfLines={1}>{rider.nickname}</Text>
              </View>
            </View>
          </Marker>
        ))}

        {sharedRoutes.map(route => (
          <Polyline
            key={route.riderId}
            coordinates={route.points.map(p => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={route.color}
            strokeWidth={4}
          />
        ))}
      </MapView>

      {/* Stats overlay */}
      <View style={styles.topOverlay}>
        <View style={[styles.statsBar, { backgroundColor: colors.card + 'EE', borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statLabel, { color: colors.foreground }]}>{btCount} BLE</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.network }]} />
            <Text style={[styles.statLabel, { color: colors.foreground }]}>{netCount} NET</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.offline }]} />
            <Text style={[styles.statLabel, { color: colors.foreground }]}>{offlineCount} OFFLINE</Text>
          </View>
        </View>
      </View>

      {/* Recenter button */}
      <Pressable
        style={[styles.recenterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={recenter}
      >
        <Ionicons name="locate" size={22} color={colors.primary} />
      </Pressable>

      {/* Share-my-route toggle */}
      <Pressable
        style={[
          styles.shareRouteBtn,
          { backgroundColor: isSharingRoute ? colors.primary : colors.card, borderColor: colors.border },
        ]}
        onPress={onToggleShareRoute}
      >
        <Ionicons name={isSharingRoute ? 'trail-sign' : 'trail-sign-outline'} size={16} color={isSharingRoute ? '#fff' : colors.primary} />
        <Text style={[styles.shareRouteText, { color: isSharingRoute ? '#fff' : colors.foreground }]}>
          {isSharingRoute ? 'Sharing Route' : 'Share My Route'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topOverlay: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center' },
  statsBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { width: 1, height: 14 },
  markerWrap: { alignItems: 'center', gap: 3 },
  riderMarker: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  markerInitial: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' },
  markerLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, maxWidth: 90 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  markerName: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  recenterBtn: { position: 'absolute', right: 16, bottom: 100, width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shareRouteBtn: { position: 'absolute', left: 16, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  shareRouteText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
