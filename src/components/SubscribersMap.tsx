import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon paths in bundler environments to prevent 404 image errors
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
} catch (_) {}
import { Subscriber, AuditLog, User, MeterReading, SystemSettings, CustomRoad, AIAlleyDetected } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import { 
  Users, Info, Settings, MapPin, Layers, Globe, Map as MapIcon,
  Search, Compass, Crosshair, Ruler, Maximize, Minimize, AlertTriangle, 
  Check, Copy, Plus, Minus, X, Target, Navigation, MapPinOff, ExternalLink,
  Zap, Calculator, FilePlus, Car, Bike, Footprints, Route, ListOrdered, Sparkles,
  Play, CheckCircle2, Share2, RotateCcw, Volume2, ChevronDown, ChevronUp, SlidersHorizontal, Sliders, RefreshCw,
  Trash2, Edit3, Save, Signpost, GitBranch, Eye, EyeOff, CheckCheck, Radio
} from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface SubscribersMapProps {
  subscribers: Subscriber[];
  allSubscribers?: Subscriber[];
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
  onAddAuditLog?: (log: AuditLog) => void;
  currentUser?: User;
  onAddReading?: (reading: MeterReading) => void;
  settings?: SystemSettings;
}

function MarkerWithInfoWindow({ sub }: { sub: Subscriber; key?: React.Key }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!sub.coordinates) return null;

  const isDebt = sub.currentBalance > 0;

  return (
    <>
      <AdvancedMarker 
        ref={markerRef} 
        position={{ lat: sub.coordinates.lat, lng: sub.coordinates.lng }} 
        onClick={() => setOpen(true)}
      >
        <Pin 
          background={isDebt ? (sub.currentBalance > 10000 ? '#f43f5e' : '#f59e0b') : '#10b981'} 
          borderColor={isDebt ? (sub.currentBalance > 10000 ? '#881337' : '#78350f') : '#064e3b'}
          glyphColor="#fff" 
          scale={isMobile ? 0.75 : 0.48}
        />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
            <div className="text-slate-900 font-sans p-1 text-right" dir="rtl">
              <h4 className="font-bold text-sm mb-1">{sub.name}</h4>
              <div className="text-xs space-y-1">
                <p>رقم العداد: <span className="font-bold">{sub.meterNumber || 'غير مسجل'}</span></p>
                <p>رقم الهاتف: {sub.phone}</p>
                <p>الرصيد: <span className={sub.currentBalance > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{sub.currentBalance} ريال</span></p>
                <p>المنطقة: {sub.zone}</p>
                <p>المحول: {sub.transformer || 'غير محدد'}</p>
              </div>
            </div>
        </InfoWindow>
      )}
    </>
  );
}

function LeafletSubscribersMap({ 
  subscribers, 
  allSubscribers = subscribers,
  onUpdateSubscribers,
  onAddAuditLog,
  currentUser,
  onAddReading,
  settings
}: SubscribersMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map Reading Modal state
  const [selectedSubForReading, setSelectedSubForReading] = useState<Subscriber | null>(null);
  const [readingInputVal, setReadingInputVal] = useState<string>('');
  const [readingSuccessMsg, setReadingSuccessMsg] = useState<string | null>(null);

  // Directions & Advanced Field Navigation State
  type TravelMode = 'driving' | 'motorcycle' | 'walking';
  const [travelMode, setTravelMode] = useState<TravelMode>('motorcycle');
  
  const [routeDestinationSub, setRouteDestinationSub] = useState<Subscriber | null>(null);
  const routeDestinationSubRef = useRef<Subscriber | null>(null);
  const isTourActiveRef = useRef<boolean>(false);
  const tourWaypointsRef = useRef<Subscriber[]>([]);
  const activeTourIndexRef = useRef<number>(0);
  const travelModeRef = useRef<TravelMode>('motorcycle');

  const lastRoutedStartCoordsRef = useRef<[number, number] | null>(null);
  const lastRoutedTargetSubIdRef = useRef<string | null>(null);
  const lastRoutedModeRef = useRef<TravelMode | null>(null);
  const lastRoutedTourIndexRef = useRef<number | null>(null);

  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number;
    distanceText: string;
    driveTimeMinutes: number;
    startCoords: [number, number];
    endCoords: [number, number];
  } | null>(null);

  // Multi-Stop Collection Tour State
  const [tourWaypoints, setTourWaypoints] = useState<Subscriber[]>([]);
  const [activeTourIndex, setActiveTourIndex] = useState<number>(0);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  useEffect(() => { routeDestinationSubRef.current = routeDestinationSub; }, [routeDestinationSub]);
  useEffect(() => { isTourActiveRef.current = isTourActive; }, [isTourActive]);
  useEffect(() => { tourWaypointsRef.current = tourWaypoints; }, [tourWaypoints]);
  useEffect(() => { activeTourIndexRef.current = activeTourIndex; }, [activeTourIndex]);
  useEffect(() => { travelModeRef.current = travelMode; }, [travelMode]);
  const [tourStats, setTourStats] = useState<{
    totalMeters: number;
    totalDistanceText: string;
    totalMinutes: number;
    totalUnpaid: number;
  } | null>(null);

  // Live GPS Tracking (Always Active & Mandatory)
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(false);
  const [isLiveGpsActive, setIsLiveGpsActive] = useState<boolean>(true);
  const [isMapLockedToUser, setIsMapLockedToUser] = useState<boolean>(true);
  const isMapLockedToUserRef = useRef<boolean>(true);
  useEffect(() => { isMapLockedToUserRef.current = isMapLockedToUser; }, [isMapLockedToUser]);

  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number | null>(null);
  const navGpsWatchIdRef = useRef<number | null>(null);

  const [isDirectionsMenuOpen, setIsDirectionsMenuOpen] = useState(false);
  const [directionsSearchQuery, setDirectionsSearchQuery] = useState('');
  const routeGroupRef = useRef<L.FeatureGroup | null>(null);
  const routingReqIdRef = useRef<number>(0);

  // --- CUSTOM MAPPED SIDE-STREETS & ALLEYS STATE ---
  const [customRoads, setCustomRoads] = useState<CustomRoad[]>(() => {
    try {
      const saved = localStorage.getItem('voltera_custom_roads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const customRoadsRef = useRef<CustomRoad[]>(customRoads);

  const [isRoadDrawingMode, setIsRoadDrawingMode] = useState<boolean>(false);
  const isRoadDrawingModeRef = useRef<boolean>(false);

  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<[number, number][]>([]);
  const currentDrawingPointsRef = useRef<[number, number][]>([]);

  const [isRoadSaveModalOpen, setIsRoadSaveModalOpen] = useState<boolean>(false);
  const [isRoadsListModalOpen, setIsRoadsListModalOpen] = useState<boolean>(false);
  const [newRoadName, setNewRoadName] = useState<string>('');
  const [newRoadType, setNewRoadType] = useState<'alley' | 'dirt_path' | 'side_street' | 'shortcut'>('alley');
  const [newRoadNotes, setNewRoadNotes] = useState<string>('');

  const customRoadsLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const aiAlleysLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const liveRecordingLayerGroupRef = useRef<L.FeatureGroup | null>(null);

  // --- GPS LIVE BREADCRUMBS TRACK RECORDING STATE (تسجيل المسار الحي أثناء القيادة) ---
  const [isGpsRecording, setIsGpsRecording] = useState<boolean>(false);
  const isGpsRecordingRef = useRef<boolean>(false);
  useEffect(() => { isGpsRecordingRef.current = isGpsRecording; }, [isGpsRecording]);

  const [gpsRecordedPoints, setGpsRecordedPoints] = useState<[number, number][]>([]);
  const gpsRecordedPointsRef = useRef<[number, number][]>([]);
  useEffect(() => { gpsRecordedPointsRef.current = gpsRecordedPoints; }, [gpsRecordedPoints]);

  const [gpsRecordDistanceMeters, setGpsRecordDistanceMeters] = useState<number>(0);
  const [isGpsSaveModalOpen, setIsGpsSaveModalOpen] = useState<boolean>(false);
  const [gpsRoadName, setGpsRoadName] = useState<string>('');
  const [gpsRoadType, setGpsRoadType] = useState<'alley' | 'dirt_path' | 'side_street' | 'shortcut'>('dirt_path');
  const [gpsRoadNotes, setGpsRoadNotes] = useState<string>('');

  // --- AI ALLEY SATELLITE OUTLINE DETECTION STATE ---
  const [aiDetectedAlleys, setAiDetectedAlleys] = useState<AIAlleyDetected[]>([]);
  const [isScanningAIAlleys, setIsScanningAIAlleys] = useState<boolean>(false);
  const [isAiAlleysModalOpen, setIsAiAlleysModalOpen] = useState<boolean>(false);
  const [aiScanErrorMessage, setAiScanErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    renderAiAlleysOnMap();
  }, [aiDetectedAlleys]);

  const renderAiAlleysOnMap = () => {
    const group = aiAlleysLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    aiDetectedAlleys.forEach((alley) => {
      if (!alley.path || alley.path.length < 2) return;

      // Outer purple glowing casing
      const casing = L.polyline(alley.path, {
        color: '#c084fc',
        weight: 9,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      });
      group.addLayer(casing);

      // Main pulsing magenta line
      const polyline = L.polyline(alley.path, {
        color: '#e879f9',
        weight: 5,
        dashArray: '6, 6',
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });

      let distMeters = 0;
      for (let i = 0; i < alley.path.length - 1; i++) {
        distMeters += L.latLng(alley.path[i]).distanceTo(L.latLng(alley.path[i + 1]));
      }

      const popupContent = `
        <div style="font-family: Cairo, sans-serif; text-align: right; direction: rtl; padding: 4px; min-width: 170px;" dir="rtl">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: #581c87;">✨ ${alley.name}</strong>
            <span style="background: #a855f7; color: #ffffff; font-weight: 900; font-size: 9px; padding: 2px 6px; border-radius: 4px;">${alley.confidence}% ثقة AI</span>
          </div>
          <div style="font-size: 10px; color: #475569; margin-bottom: 4px;">
            الطول: <strong style="color: #059669;">${Math.round(distMeters)} متر</strong>
          </div>
          <p style="font-size: 10px; color: #64748b; margin-bottom: 6px; background: #f3e8ff; padding: 4px; border-radius: 4px; border: 1px solid #d8b4fe;">${alley.description}</p>
          <button id="adopt-ai-alley-${alley.id}" style="width: 100%; background: #9333ea; color: white; font-weight: bold; font-size: 10px; padding: 5px 8px; border: none; border-radius: 6px; cursor: pointer;">
            اعتماد هذا الزقاق في الملاحة ➕
          </button>
        </div>
      `;

      polyline.bindPopup(popupContent);
      polyline.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`adopt-ai-alley-${alley.id}`);
          if (btn) {
            btn.onclick = () => {
              adoptAiAlley(alley);
            };
          }
        }, 50);
      });

      // AI Badge Marker
      const midIdx = Math.floor(alley.path.length / 2);
      const midPt = alley.path[midIdx];
      const aiIcon = L.divIcon({
        className: 'ai-alley-badge-icon',
        html: `<div style="background: rgba(88, 28, 135, 0.95); color: #f0abfc; border: 1px solid #c084fc; font-family: Cairo, sans-serif; font-weight: 800; font-size: 9px; padding: 2px 7px; border-radius: 8px; white-space: nowrap; box-shadow: 0 2px 10px rgba(168,85,247,0.6); display: flex; align-items: center; gap: 3px;">✨ ${alley.name} (${alley.confidence}%)</div>`,
        iconSize: [110, 22],
        iconAnchor: [55, 11]
      });
      const badgeMarker = L.marker(midPt, { icon: aiIcon, interactive: false });
      group.addLayer(badgeMarker);

      group.addLayer(polyline);
    });
  };

  const adoptAiAlley = (alley: AIAlleyDetected) => {
    const newRoad: CustomRoad = {
      id: `road_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: alley.name,
      type: alley.type,
      path: alley.path,
      createdAt: new Date().toISOString(),
      notes: `مكتشف آلياً بالذكاء الاصطناعي بنسبة ثقة ${alley.confidence}%: ${alley.description}`
    };

    setCustomRoads(prev => [...prev, newRoad]);
    setAiDetectedAlleys(prev => prev.filter(a => a.id !== alley.id));

    if (routeDestinationSub && userLocation && mapInstanceRef.current) {
      drawRouteOnMap(mapInstanceRef.current, userLocation, [routeDestinationSub.coordinates!.lat, routeDestinationSub.coordinates!.lng], routeDestinationSub, travelMode, false);
    }
  };

  const adoptAllAiAlleys = () => {
    if (aiDetectedAlleys.length === 0) return;

    const newRoads: CustomRoad[] = aiDetectedAlleys.map(alley => ({
      id: `road_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: alley.name,
      type: alley.type,
      path: alley.path,
      createdAt: new Date().toISOString(),
      notes: `مكتشف آلياً بالذكاء الاصطناعي بنسبة ثقة ${alley.confidence}%: ${alley.description}`
    }));

    setCustomRoads(prev => [...prev, ...newRoads]);
    setAiDetectedAlleys([]);
    setIsAiAlleysModalOpen(false);

    if (routeDestinationSub && userLocation && mapInstanceRef.current) {
      drawRouteOnMap(mapInstanceRef.current, userLocation, [routeDestinationSub.coordinates!.lat, routeDestinationSub.coordinates!.lng], routeDestinationSub, travelMode, false);
    }
  };

  const handleScanAIAlleys = async (uploadedImageBase64?: string) => {
    setIsScanningAIAlleys(true);
    setAiScanErrorMessage(null);

    try {
      const map = mapInstanceRef.current;
      const center = map ? map.getCenter() : { lat: 31.95, lng: 35.91 };
      const bounds = map ? map.getBounds() : null;

      const payloadBounds = bounds ? {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      } : {
        north: center.lat + 0.003,
        south: center.lat - 0.003,
        east: center.lng + 0.003,
        west: center.lng - 0.003
      };

      const res = await fetch('/api/ai/detect-alleys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapCenter: { lat: center.lat, lng: center.lng },
          bounds: payloadBounds,
          imageBase64: uploadedImageBase64 || undefined
        })
      });

      if (!res.ok) {
        throw new Error(`خطأ في خادم الذكاء الاصطناعي (${res.status})`);
      }

      const data = await res.json();
      if (data.alleys && Array.isArray(data.alleys)) {
        setAiDetectedAlleys(data.alleys);
        setIsAiAlleysModalOpen(true);
      } else {
        throw new Error('لم يتم إرجاع أزقة مكتشفة');
      }
    } catch (err: any) {
      console.error('AI Alley Scan failed:', err);
      setAiScanErrorMessage(err?.message || 'فشل في الاتصال بمحرك تحليل الصور الجوية بالذكاء الاصطناعي');
    } finally {
      setIsScanningAIAlleys(false);
    }
  };

  const handleFileUploadAndScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageFile(file, 1024, 1024, 0.70);
      if (compressedBase64) {
        handleScanAIAlleys(compressedBase64);
      }
    } catch (err) {
      console.error('Failed to compress image for AI scan:', err);
    }
  };

  // --- GPS LIVE BREADCRUMBS TRACK RECORDING METHODS ---
  useEffect(() => {
    renderLiveGpsBreadcrumbsOnMap();
  }, [gpsRecordedPoints, isGpsRecording]);

  const renderLiveGpsBreadcrumbsOnMap = () => {
    const group = liveRecordingLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (gpsRecordedPoints.length === 0) return;

    // Glowing casing polyline
    const casing = L.polyline(gpsRecordedPoints, {
      color: '#059669',
      weight: 10,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(casing);

    // Glowing vibrant emerald track line
    const trackLine = L.polyline(gpsRecordedPoints, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    group.addLayer(trackLine);

    // Add start marker
    const firstPt = gpsRecordedPoints[0];
    const startIcon = L.divIcon({
      className: 'gps-breadcrumb-start-icon',
      html: `<div style="background: #10b981; color: white; border: 2px solid #ffffff; width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 12px rgba(16,185,129,0.9); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">🚩</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    group.addLayer(L.marker(firstPt, { icon: startIcon }).bindTooltip('بداية التسجيل الحي 🚩', { permanent: false, direction: 'top' }));

    // Add breadcrumb dots along recorded points
    gpsRecordedPoints.forEach((pt, idx) => {
      if (idx > 0 && idx < gpsRecordedPoints.length - 1 && idx % 3 === 0) {
        const dotIcon = L.divIcon({
          className: 'gps-breadcrumb-dot-icon',
          html: `<div style="background: #34d399; border: 1.5px solid #064e3b; width: 8px; height: 8px; border-radius: 50%;"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4]
        });
        group.addLayer(L.marker(pt, { icon: dotIcon }));
      }
    });

    // Add pulsing head marker if actively recording
    if (isGpsRecording && gpsRecordedPoints.length > 1) {
      const lastPt = gpsRecordedPoints[gpsRecordedPoints.length - 1];
      const headIcon = L.divIcon({
        className: 'gps-breadcrumb-head-icon',
        html: `<div style="background: #10b981; border: 2px solid #ecfdf5; width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 14px #10b981;" class="animate-ping"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      group.addLayer(L.marker(lastPt, { icon: headIcon }).bindTooltip('موقع القيادة الميداني 🚴', { permanent: false, direction: 'top' }));
    }
  };

  const startGpsBreadcrumbsRecording = () => {
    setIsGpsRecording(true);
    setGpsRecordedPoints(userLocation ? [userLocation] : []);
    setGpsRecordDistanceMeters(0);

    if (!gpsTrackingActive) {
      startGpsTracking();
    }
  };

  const handleStopAndSaveGpsBreadcrumbs = () => {
    if (gpsRecordedPoints.length < 2) {
      alert('المسار المسجل قصير جداً (يتطلب تحركين أو نقطتين إحداثيات على الأقل). قم بالقيادة أو المشي لمسافة أطول داخل الزقاق.');
      return;
    }

    setIsGpsRecording(false);
    const nowStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
    setGpsRoadName(`زقاق حي مسجل بالـ GPS (${nowStr})`);
    setGpsRoadType('dirt_path');
    setGpsRoadNotes(`مسار محصّل حي تم تسجيله تلقائياً أثناء القيادة بالطول الميداني ${Math.round(gpsRecordDistanceMeters)} متر (${gpsRecordedPoints.length} نقطة GPS)`);
    setIsGpsSaveModalOpen(true);
  };

  const handleConfirmSaveGpsRoad = () => {
    if (!gpsRoadName.trim()) {
      alert('يرجى إدخال اسم للشارع/الزقاق المسجل');
      return;
    }

    const newRoad: CustomRoad = {
      id: `road_gps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: gpsRoadName.trim(),
      type: gpsRoadType,
      path: gpsRecordedPoints,
      createdAt: new Date().toISOString(),
      notes: gpsRoadNotes.trim()
    };

    setCustomRoads(prev => [...prev, newRoad]);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'collector',
        username: currentUser?.username || 'المحصل الميداني',
        action: 'تسجيل مسار حي GPS',
        details: `تم تسجيل واعتماد شارع فرعي/زقاق حي بالـ GPS باسم "${gpsRoadName}" بطول ${Math.round(gpsRecordDistanceMeters)} متر`,
        timestamp: new Date().toISOString()
      });
    }

    setGpsRecordedPoints([]);
    setGpsRecordDistanceMeters(0);
    setIsGpsSaveModalOpen(false);

    if (routeDestinationSub && userLocation && mapInstanceRef.current) {
      drawRouteOnMap(mapInstanceRef.current, userLocation, [routeDestinationSub.coordinates!.lat, routeDestinationSub.coordinates!.lng], routeDestinationSub, travelMode, false);
    }
  };

  const handleCancelGpsRecording = () => {
    setIsGpsRecording(false);
    setGpsRecordedPoints([]);
    setGpsRecordDistanceMeters(0);
    setIsGpsSaveModalOpen(false);
  };


  useEffect(() => {
    customRoadsRef.current = customRoads;
    try {
      localStorage.setItem('voltera_custom_roads', JSON.stringify(customRoads));
    } catch (e) {
      console.warn('Failed to save custom roads to localStorage', e);
    }
    renderCustomRoadsOnMap();
  }, [customRoads]);

  useEffect(() => {
    isRoadDrawingModeRef.current = isRoadDrawingMode;
    if (!isRoadDrawingMode) {
      setCurrentDrawingPoints([]);
    }
  }, [isRoadDrawingMode]);

  useEffect(() => {
    currentDrawingPointsRef.current = currentDrawingPoints;
    renderActiveDrawingOnMap();
  }, [currentDrawingPoints]);

  const renderCustomRoadsOnMap = () => {
    const group = customRoadsLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    customRoadsRef.current.forEach((road) => {
      if (!road.path || road.path.length < 2) return;

      let color = '#f59e0b'; // amber
      let dashArray: string | undefined = '6, 6';
      let labelType = 'زقاق ضيق';

      if (road.type === 'dirt_path') {
        color = '#d97706';
        dashArray = '3, 6';
        labelType = 'طريق ترابي';
      } else if (road.type === 'side_street') {
        color = '#06b6d4';
        dashArray = undefined;
        labelType = 'شارع فرعي';
      } else if (road.type === 'shortcut') {
        color = '#10b981';
        dashArray = '8, 4';
        labelType = 'اختصار ممر';
      }

      // Outer dark casing for contrast
      const casing = L.polyline(road.path, {
        color: '#000000',
        weight: 8,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round'
      });
      group.addLayer(casing);

      // Main line
      const polyline = L.polyline(road.path, {
        color: color,
        weight: 5,
        opacity: 0.95,
        dashArray: dashArray,
        lineCap: 'round',
        lineJoin: 'round'
      });

      let distMeters = 0;
      for (let i = 0; i < road.path.length - 1; i++) {
        distMeters += L.latLng(road.path[i]).distanceTo(L.latLng(road.path[i + 1]));
      }

      const popupContent = `
        <div style="font-family: Cairo, sans-serif; text-align: right; direction: rtl; padding: 4px; min-width: 160px;" dir="rtl">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: #0f172a;">${road.name}</strong>
            <span style="background: ${color}; color: #020617; font-weight: 900; font-size: 9px; padding: 2px 6px; border-radius: 4px;">${labelType}</span>
          </div>
          <div style="font-size: 10px; color: #475569; margin-bottom: 6px;">
            الطول: <strong style="color: #059669;">${Math.round(distMeters)} متر</strong>
          </div>
          ${road.notes ? `<p style="font-size: 10px; color: #64748b; margin-bottom: 6px; background: #f8fafc; padding: 4px; border-radius: 4px; border: 1px solid #e2e8f0;">${road.notes}</p>` : ''}
          <button id="del-road-${road.id}" style="width: 100%; background: #ef4444; color: white; font-weight: bold; font-size: 10px; padding: 4px 8px; border: none; border-radius: 6px; cursor: pointer; margin-top: 2px;">
            حذف الشارع / الزقاق 🗑️
          </button>
        </div>
      `;

      polyline.bindPopup(popupContent);
      polyline.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`del-road-${road.id}`);
          if (btn) {
            btn.onclick = () => {
              deleteCustomRoad(road.id);
            };
          }
        }, 50);
      });

      // Label Badge Marker
      const midIdx = Math.floor(road.path.length / 2);
      const midPt = road.path[midIdx];
      const roadIcon = L.divIcon({
        className: 'custom-road-label-icon',
        html: `<div style="background: rgba(2, 6, 23, 0.95); color: ${color}; border: 1px solid ${color}; font-family: Cairo, sans-serif; font-weight: 800; font-size: 9px; padding: 1px 6px; border-radius: 6px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.8);">${road.name}</div>`,
        iconSize: [90, 20],
        iconAnchor: [45, 10]
      });
      const labelMarker = L.marker(midPt, { icon: roadIcon, interactive: false });
      group.addLayer(labelMarker);

      group.addLayer(polyline);
    });
  };

  const renderActiveDrawingOnMap = () => {
    const group = drawingLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();
    if (currentDrawingPoints.length === 0) return;

    if (currentDrawingPoints.length >= 2) {
      const casing = L.polyline(currentDrawingPoints, {
        color: '#000000',
        weight: 8,
        opacity: 0.6
      });
      const line = L.polyline(currentDrawingPoints, {
        color: '#f59e0b',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.9
      });
      group.addLayer(casing);
      group.addLayer(line);
    }

    currentDrawingPoints.forEach((pt, idx) => {
      const isLast = idx === currentDrawingPoints.length - 1;
      const nodeIcon = L.divIcon({
        className: 'drawing-node-icon',
        html: `<div style="background: ${isLast ? '#10b981' : '#f59e0b'}; color: #020617; font-family: Cairo, sans-serif; font-weight: 900; font-size: 10px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,0,0,0.8);">${idx + 1}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      const marker = L.marker(pt, { icon: nodeIcon });
      group.addLayer(marker);
    });

    if (currentDrawingPoints.length >= 2) {
      let totalDist = 0;
      for (let i = 0; i < currentDrawingPoints.length - 1; i++) {
        totalDist += L.latLng(currentDrawingPoints[i]).distanceTo(L.latLng(currentDrawingPoints[i + 1]));
      }
      const lastPt = currentDrawingPoints[currentDrawingPoints.length - 1];
      const badgeIcon = L.divIcon({
        className: 'drawing-badge-icon',
        html: `<div style="background: #10b981; color: #020617; font-family: Cairo, sans-serif; font-weight: 900; font-size: 10px; padding: 2px 8px; border-radius: 12px; border: 2px solid #ffffff; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.7);">الطول: ${Math.round(totalDist)} متر</div>`,
        iconSize: [110, 24],
        iconAnchor: [55, -12]
      });
      const badgeMarker = L.marker(lastPt, { icon: badgeIcon, interactive: false });
      group.addLayer(badgeMarker);
    }
  };

  const deleteCustomRoad = (roadId: string) => {
    setCustomRoads(prev => prev.filter(r => r.id !== roadId));
  };

  const handleSaveCurrentRoad = () => {
    if (currentDrawingPoints.length < 2) return;
    const finalName = newRoadName.trim() || `زقاق فرعي ${customRoads.length + 1}`;
    const newRoad: CustomRoad = {
      id: `road_${Date.now()}`,
      name: finalName,
      type: newRoadType,
      path: currentDrawingPoints,
      createdAt: new Date().toISOString(),
      notes: newRoadNotes.trim() || undefined
    };

    setCustomRoads(prev => [...prev, newRoad]);
    setIsRoadSaveModalOpen(false);
    setIsRoadDrawingMode(false);
    setCurrentDrawingPoints([]);
    setNewRoadName('');
    setNewRoadNotes('');

    if (routeDestinationSub && userLocation && mapInstanceRef.current) {
      drawRouteOnMap(mapInstanceRef.current, userLocation, [routeDestinationSub.coordinates!.lat, routeDestinationSub.coordinates!.lng], routeDestinationSub, travelMode, false);
    }
  };

  const evaluateCustomRoadsForRoute = (
    start: [number, number],
    end: [number, number]
  ): { latLngs: [number, number][]; distanceMeters: number; durationSeconds: number; roadName: string } | null => {
    if (!customRoadsRef.current || customRoadsRef.current.length === 0) return null;

    let bestCustomCandidate: {
      latLngs: [number, number][];
      distanceMeters: number;
      durationSeconds: number;
      roadName: string;
    } | null = null;

    customRoadsRef.current.forEach((road) => {
      if (!road.path || road.path.length < 2) return;

      let startMinDist = Infinity;
      let startClosestIdx = 0;
      let endMinDist = Infinity;
      let endClosestIdx = 0;

      road.path.forEach((pt, idx) => {
        const dS = L.latLng(start).distanceTo(L.latLng(pt));
        if (dS < startMinDist) {
          startMinDist = dS;
          startClosestIdx = idx;
        }
        const dE = L.latLng(end).distanceTo(L.latLng(pt));
        if (dE < endMinDist) {
          endMinDist = dE;
          endClosestIdx = idx;
        }
      });

      if (startMinDist < 400 && endMinDist < 400) {
        const subPath: [number, number][] = [];
        const step = startClosestIdx <= endClosestIdx ? 1 : -1;
        for (let i = startClosestIdx; i !== endClosestIdx + step; i += step) {
          subPath.push(road.path[i]);
        }

        let customDist = startMinDist + endMinDist;
        for (let i = 0; i < subPath.length - 1; i++) {
          customDist += L.latLng(subPath[i]).distanceTo(L.latLng(subPath[i + 1]));
        }

        const fullLatLngs: [number, number][] = [start, ...subPath, end];
        const speedMs = travelModeRef.current === 'motorcycle' ? 11.1 : travelModeRef.current === 'walking' ? 1.38 : 9.7;
        const duration = Math.round(customDist / speedMs);

        if (!bestCustomCandidate || customDist < bestCustomCandidate.distanceMeters) {
          bestCustomCandidate = {
            latLngs: fullLatLngs,
            distanceMeters: Math.round(customDist),
            durationSeconds: Math.max(10, duration),
            roadName: road.name
          };
        }
      }
    });

    return bestCustomCandidate;
  };

  const getSpeedMeterPerMin = (mode: TravelMode) => {
    switch (mode) {
      case 'motorcycle': return 750; // ~45 km/h
      case 'walking': return 83;   // ~5 km/h
      case 'driving': default: return 583; // ~35 km/h
    }
  };

  // Helper to fetch real street geometries from OSRM street network (Selecting Shortest Street Route including narrow alleys & dirt tracks)
  const fetchStreetRoute = async (
    points: [number, number][],
    mode: TravelMode
  ): Promise<{ latLngs: [number, number][]; distanceMeters: number; durationSeconds: number } | null> => {
    if (points.length < 2) return null;
    const formatted = points.map(p => `${p[1]},${p[0]}`).join(';');

    // For motorcycle, query bike, foot, and driving profiles concurrently to find narrow alleys and dirt track shortcuts
    const profilesToTest = mode === 'motorcycle'
      ? ['bike', 'foot', 'driving']
      : mode === 'walking'
      ? ['foot', 'bike']
      : ['driving', 'bike'];

    const urls: string[] = [];
    profilesToTest.forEach(prof => {
      urls.push(`https://router.project-osrm.org/route/v1/${prof}/${formatted}?overview=full&geometries=geojson&alternatives=true`);
      urls.push(`https://routing.openstreetmap.de/routed-${prof === 'foot' ? 'foot' : prof === 'bike' ? 'bike' : 'car'}/route/v1/${prof}/${formatted}?overview=full&geometries=geojson&alternatives=true`);
    });

    const candidateRoutes: { latLngs: [number, number][]; distanceMeters: number; durationSeconds: number; profile: string }[] = [];

    await Promise.all(
      urls.map(async (url) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!res.ok) return;
          const data = await res.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            data.routes.forEach((rt: any) => {
              const rawCoords: [number, number][] = rt.geometry.coordinates; // [lng, lat]
              const latLngs: [number, number][] = rawCoords.map(c => [c[1], c[0]]);
              const dist = Math.round(rt.distance);

              // Calculate realistic duration based on travel mode speed
              let duration = Math.round(rt.duration);
              if (mode === 'motorcycle') {
                duration = Math.round(dist / 11.1); // ~40 km/h on motorcycle through alleys/roads
              } else if (mode === 'walking') {
                duration = Math.round(dist / 1.38); // ~5 km/h on foot
              }

              candidateRoutes.push({
                latLngs,
                distanceMeters: dist,
                durationSeconds: Math.max(10, duration),
                profile: url.includes('/foot/') ? 'foot' : url.includes('/bike/') ? 'bike' : 'driving'
              });
            });
          }
        } catch {
          // silent fallback
        }
      })
    );

    // Evaluate user-mapped custom roads & alleys
    const customCandidate = evaluateCustomRoadsForRoute(points[0], points[points.length - 1]);
    if (customCandidate) {
      candidateRoutes.push({
        latLngs: customCandidate.latLngs,
        distanceMeters: customCandidate.distanceMeters,
        durationSeconds: customCandidate.durationSeconds,
        profile: 'custom_road'
      });
    }

    if (candidateRoutes.length > 0) {
      // Sort all gathered candidate routes strictly by distance to prioritize the shortest shortcuts (narrow alleys, dirt tracks, unpaved paths)
      candidateRoutes.sort((a, b) => a.distanceMeters - b.distanceMeters);
      return candidateRoutes[0];
    }

    return null;
  };

  const drawRouteOnMap = (
    map: L.Map,
    startCoords: [number, number],
    endCoords: [number, number],
    targetSub: Subscriber,
    mode: TravelMode = travelMode,
    shouldFitBounds: boolean = true
  ) => {
    const routeGroup = routeGroupRef.current;
    if (!routeGroup) return;

    const startPt = L.latLng(startCoords[0], startCoords[1]);
    const endPt = L.latLng(endCoords[0], endCoords[1]);

    // Ensure user live GPS marker with compass beam is positioned at startPt and brought to top
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(startPt);
      userMarkerRef.current.setZIndexOffset(5000);
    } else {
      const userMarker = L.marker(startPt, {
        icon: createGpsIcon(userHeadingRef.current || 0),
        zIndexOffset: 5000
      }).addTo(map);
      userMarkerRef.current = userMarker;
    }

    // Keep live compass beam updated on DOM
    const currentHeading = userHeadingRef.current || 0;
    const beamElems = document.querySelectorAll('.user-gps-beam-container, #user-gps-beam-container');
    beamElems.forEach(el => {
      (el as HTMLElement).style.transform = `rotate(${currentHeading}deg)`;
    });

    // Check if this is a live position update during active navigation
    if (!shouldFitBounds && lastRoutedStartCoordsRef.current && lastRoutedTargetSubIdRef.current === targetSub.id && lastRoutedModeRef.current === mode) {
      const distFromLastStart = getGeodesicDistanceMeters(
        startCoords[0], startCoords[1],
        lastRoutedStartCoordsRef.current[0], lastRoutedStartCoordsRef.current[1]
      );
      if (distFromLastStart < 15) {
        // Smoothly follow user position if camera lock is active without clearing route lines or spamming OSRM
        if (isMapLockedToUserRef.current) {
          map.panTo(startPt, { animate: true, duration: 0.8 });
        }
        return;
      }
    }

    lastRoutedStartCoordsRef.current = startCoords;
    lastRoutedTargetSubIdRef.current = targetSub.id;
    lastRoutedModeRef.current = mode;

    routeGroup.clearLayers();
    const currentReqId = ++routingReqIdRef.current;

    // Target Destination Marker (Meter)
    const targetIcon = L.divIcon({
      className: 'route-target-icon',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(16, 185, 129, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 13px; font-weight: 900;">
            ⚡
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const isDebt = targetSub.currentBalance > 0;
    L.marker(endPt, { icon: targetIcon })
      .addTo(routeGroup)
      .bindTooltip(`
        <div style="text-align: right; font-family: system-ui;">
          <strong>عداد: ${targetSub.name}</strong><br/>
          <span style="color: ${isDebt ? '#f43f5e' : '#10b981'}; font-weight: 800;">
            ${isDebt ? `المطلوب: ${targetSub.currentBalance.toLocaleString()} ريال` : 'خالي المديونية'}
          </span>
        </div>
      `, { permanent: true, direction: 'top', className: 'ruler-tooltip-design' });

    const modeIcon = mode === 'motorcycle' ? '🏍️' : mode === 'walking' ? '🚶' : '🚗';

    const renderMidBadge = (distStr: string, minutesNum: number, position: L.LatLng) => {
      const midIcon = L.divIcon({
        className: 'route-mid-icon',
        html: `
          <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #06b6d4; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 8px 20px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 6px;">
            <span style="color: #38bdf8;">${modeIcon} ${distStr}</span>
            <span style="color: #64748b;">•</span>
            <span style="color: #f59e0b;">⏱️ ~${minutesNum} دقيقة</span>
          </div>
        `,
        iconSize: [140, 26],
        iconAnchor: [70, 13]
      });

      return L.marker(position, { icon: midIcon }).addTo(routeGroup);
    };

    if (shouldFitBounds) {
      map.fitBounds(L.latLngBounds([startPt, endPt]).pad(0.28), { animate: true, duration: 1.2 });
    }

    // Fetch pure street network route (No straight line drawing)
    fetchStreetRoute([startCoords, endCoords], mode).then(streetResult => {
      if (routingReqIdRef.current !== currentReqId || !routeGroupRef.current) return;

      if (streetResult && streetResult.latLngs.length >= 2) {
        const realMeters = streetResult.distanceMeters;
        const realText = realMeters >= 1000 ? `${(realMeters / 1000).toFixed(2)} كم` : `${realMeters} متر`;
        const realMinutes = Math.max(1, Math.round(streetResult.durationSeconds / 60));

        setRouteInfo({
          distanceMeters: realMeters,
          distanceText: realText,
          driveTimeMinutes: realMinutes,
          startCoords,
          endCoords
        });

        // Draw real street outer glow polyline
        L.polyline(streetResult.latLngs, {
          color: '#0284c7',
          weight: 8,
          opacity: 0.65
        }).addTo(routeGroup);

        // Draw real street inner animated dashed polyline
        L.polyline(streetResult.latLngs, {
          color: '#06b6d4',
          weight: 4.5,
          dashArray: '10, 14',
          opacity: 0.95
        }).addTo(routeGroup);

        // Place badge at middle street coordinate along actual road geometry
        const midIndex = Math.floor(streetResult.latLngs.length / 2);
        const streetMidPt = L.latLng(streetResult.latLngs[midIndex][0], streetResult.latLngs[midIndex][1]);
        renderMidBadge(realText, realMinutes, streetMidPt);

        if (shouldFitBounds) {
          map.fitBounds(L.latLngBounds(streetResult.latLngs).pad(0.22), { animate: true, duration: 1.2 });
        }
      } else {
        // Safe fallback estimation if routing service unreachable
        const straightMeters = startPt.distanceTo(endPt);
        const roadMeters = Math.round(straightMeters * 1.35);
        const realText = roadMeters >= 1000 ? `${(roadMeters / 1000).toFixed(2)} كم` : `${roadMeters} متر`;
        const speed = getSpeedMeterPerMin(mode);
        const driveTimeMinutes = Math.max(1, Math.round(roadMeters / speed));

        setRouteInfo({
          distanceMeters: roadMeters,
          distanceText: realText,
          driveTimeMinutes,
          startCoords,
          endCoords
        });

        // Draw curved street-like arc fallback instead of a harsh straight line
        const midLat = (startCoords[0] + endCoords[0]) / 2 + 0.0008;
        const midLng = (startCoords[1] + endCoords[1]) / 2 + 0.0008;
        const curvedPath: [number, number][] = [startCoords, [midLat, midLng], endCoords];

        L.polyline(curvedPath, {
          color: '#0284c7',
          weight: 6,
          opacity: 0.7,
          dashArray: '6, 10'
        }).addTo(routeGroup);

        renderMidBadge(realText, driveTimeMinutes, L.latLng(midLat, midLng));
      }
    });
  };

  // Draw Multi-Stop Collection Tour Along Real Streets
  const drawMultiStopTourOnMap = (
    map: L.Map,
    startCoords: [number, number],
    waypoints: Subscriber[],
    currIndex: number = 0,
    mode: TravelMode = travelMode,
    shouldFitBounds: boolean = true
  ) => {
    const routeGroup = routeGroupRef.current;
    if (!routeGroup || waypoints.length === 0) return;

    const startPt = L.latLng(startCoords[0], startCoords[1]);

    // Ensure user live GPS marker with compass beam is positioned at startPt and brought to top
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(startPt);
      userMarkerRef.current.setZIndexOffset(5000);
    } else {
      const userMarker = L.marker(startPt, {
        icon: createGpsIcon(userHeadingRef.current || 0),
        zIndexOffset: 5000
      }).addTo(map);
      userMarkerRef.current = userMarker;
    }

    const currentHeading = userHeadingRef.current || 0;
    const beamElems = document.querySelectorAll('.user-gps-beam-container, #user-gps-beam-container');
    beamElems.forEach(el => {
      (el as HTMLElement).style.transform = `rotate(${currentHeading}deg)`;
    });

    // Check if this is a live position update during active tour navigation
    if (!shouldFitBounds && lastRoutedStartCoordsRef.current && lastRoutedTourIndexRef.current === currIndex && lastRoutedModeRef.current === mode) {
      const distFromLastStart = getGeodesicDistanceMeters(
        startCoords[0], startCoords[1],
        lastRoutedStartCoordsRef.current[0], lastRoutedStartCoordsRef.current[1]
      );
      if (distFromLastStart < 15) {
        if (isMapLockedToUserRef.current) {
          map.panTo(startPt, { animate: true, duration: 0.8 });
        }
        return;
      }
    }

    lastRoutedStartCoordsRef.current = startCoords;
    lastRoutedTourIndexRef.current = currIndex;
    lastRoutedModeRef.current = mode;

    routeGroup.clearLayers();
    const currentReqId = ++routingReqIdRef.current;

    const rawPoints: [number, number][] = [startCoords];
    waypoints.forEach(wp => {
      if (wp.coordinates) {
        rawPoints.push([wp.coordinates.lat, wp.coordinates.lng]);
      }
    });

    const leafPoints = rawPoints.map(p => L.latLng(p[0], p[1]));
    let totalUnpaidSum = 0;

    // Waypoint Markers with Numbered Flags
    waypoints.forEach((wp, idx) => {
      if (!wp.coordinates) return;
      const pt = L.latLng(wp.coordinates.lat, wp.coordinates.lng);
      totalUnpaidSum += wp.currentBalance;

      const isActiveStop = (idx === currIndex);
      const isCompleted = (idx < currIndex);

      const flagBg = isActiveStop 
        ? 'linear-gradient(135deg, #10b981, #059669)' 
        : isCompleted 
        ? 'linear-gradient(135deg, #64748b, #475569)' 
        : 'linear-gradient(135deg, #0284c7, #0369a1)';

      const flagIcon = L.divIcon({
        className: `tour-stop-icon-${idx}`,
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${isActiveStop ? '<div style="position: absolute; inset: -6px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s infinite;"></div>' : ''}
            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${flagBg}; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 11px; font-weight: 900;">
              ${isCompleted ? '✓' : `#${idx + 1}`}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker(pt, { icon: flagIcon })
        .addTo(routeGroup)
        .bindTooltip(`
          <div style="text-align: right; font-family: system-ui;">
            <strong style="color: ${isActiveStop ? '#10b981' : '#ffffff'};">محطة #${idx + 1}: ${wp.name}</strong><br/>
            <span>المطلوب: ${wp.currentBalance.toLocaleString()} ريال</span>
          </div>
        `, { permanent: isActiveStop, direction: 'top', className: 'ruler-tooltip-design' });
    });

    if (shouldFitBounds) {
      map.fitBounds(L.latLngBounds(leafPoints).pad(0.25), { animate: true, duration: 1.2 });
    }

    // Async fetch street network route through all tour stops
    fetchStreetRoute(rawPoints, mode).then(streetResult => {
      if (routingReqIdRef.current !== currentReqId || !routeGroupRef.current) return;

      if (streetResult && streetResult.latLngs.length >= 2) {
        const realMeters = streetResult.distanceMeters;
        const realText = realMeters >= 1000 ? `${(realMeters / 1000).toFixed(2)} كم` : `${realMeters} متر`;
        const realMinutes = Math.max(1, Math.round(streetResult.durationSeconds / 60));

        setTourStats({
          totalMeters: realMeters,
          totalDistanceText: realText,
          totalMinutes: realMinutes,
          totalUnpaid: totalUnpaidSum
        });

        // Draw street polyline for the full tour along actual roads
        L.polyline(streetResult.latLngs, {
          color: '#0284c7',
          weight: 6,
          opacity: 0.75
        }).addTo(routeGroup);

        L.polyline(streetResult.latLngs, {
          color: '#06b6d4',
          weight: 3.5,
          dashArray: '8, 12',
          opacity: 0.95
        }).addTo(routeGroup);

        if (shouldFitBounds) {
          map.fitBounds(L.latLngBounds(streetResult.latLngs).pad(0.22), { animate: true, duration: 1.2 });
        }
      } else {
        // Fallback curved paths if offline
        let estMeters = 0;
        for (let i = 0; i < leafPoints.length - 1; i++) {
          estMeters += Math.round(leafPoints[i].distanceTo(leafPoints[i + 1]) * 1.35);
        }
        const speed = getSpeedMeterPerMin(mode);
        const estMinutes = Math.max(1, Math.round(estMeters / speed));
        const estText = estMeters >= 1000 ? `${(estMeters / 1000).toFixed(2)} كم` : `${estMeters} متر`;

        setTourStats({
          totalMeters: estMeters,
          totalDistanceText: estText,
          totalMinutes: estMinutes,
          totalUnpaid: totalUnpaidSum
        });
      }
    });
  };

  const handleStartDirections = (sub: Subscriber) => {
    if (!sub.coordinates) {
      alert(`عذراً! المشترك (${sub.name}) ليس لديه إحداثيات موقع مسجلة على الخريطة بعد.`);
      return;
    }

    lastRoutedStartCoordsRef.current = null;
    setIsMapLockedToUser(true);
    isMapLockedToUserRef.current = true;
    setIsLiveGpsActive(true);
    setIsTourActive(false);
    setRouteDestinationSub(sub);
    setIsDirectionsMenuOpen(false);

    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      drawRouteOnMap(map, userLocation, [sub.coordinates.lat, sub.coordinates.lng], sub, travelMode);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const uLat = pos.coords.latitude;
            const uLng = pos.coords.longitude;
            setUserLocation([uLat, uLng]);
            drawRouteOnMap(map, [uLat, uLng], [sub.coordinates.lat, sub.coordinates.lng], sub, travelMode);
          },
          () => {
            const center = map.getCenter();
            drawRouteOnMap(map, [center.lat, center.lng], [sub.coordinates.lat, sub.coordinates.lng], sub, travelMode);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        const center = map.getCenter();
        drawRouteOnMap(map, [center.lat, center.lng], [sub.coordinates.lat, sub.coordinates.lng], sub, travelMode);
      }
    }
  };

  // Geodesic distance calculator (Haversine formula in meters)
  const getGeodesicDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Sort candidate subscribers in Nearest-Neighbor order starting from startCoords
  const sortSubscribersByNearestRoute = (startCoords: [number, number], candidates: Subscriber[]): Subscriber[] => {
    if (candidates.length <= 1) return candidates;
    const pool = [...candidates];
    const ordered: Subscriber[] = [];
    let currentLat = startCoords[0];
    let currentLng = startCoords[1];

    while (pool.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < pool.length; i++) {
        const sub = pool[i];
        if (!sub.coordinates) continue;
        const dist = getGeodesicDistanceMeters(currentLat, currentLng, sub.coordinates.lat, sub.coordinates.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextSub = pool.splice(nearestIdx, 1)[0];
      ordered.push(nextSub);
      if (nextSub.coordinates) {
        currentLat = nextSub.coordinates.lat;
        currentLng = nextSub.coordinates.lng;
      }
    }

    return ordered;
  };

  // Launch Auto Collection / Inspection Tour sorted strictly by nearest proximity
  const handleStartAutoTour = (count: number = 10, mode: 'nearest' | 'debt' = 'nearest') => {
    const map = mapInstanceRef.current;
    const startLoc: [number, number] = userLocation || (map ? [map.getCenter().lat, map.getCenter().lng] as [number, number] : [15.3694, 44.1910] as [number, number]);

    let candidateSubs: Subscriber[] = [];

    if (mode === 'debt') {
      // Top Debtors reordered by nearest route
      const debtors = validSubscribers
        .filter(s => s.currentBalance > 0 && s.coordinates && typeof s.coordinates.lat === 'number')
        .sort((a, b) => b.currentBalance - a.currentBalance)
        .slice(0, count);

      if (debtors.length === 0) {
        alert('لا يوجد مشتركون ذوو مديونيات مستحقة ولديهم مواقع مسجلة على الخريطة حالياً.');
        return;
      }
      candidateSubs = debtors;
    } else {
      // Pure Nearest Meters to current GPS location
      const allWithCoords = validSubscribers.filter(s => s.coordinates && typeof s.coordinates.lat === 'number');

      if (allWithCoords.length === 0) {
        alert('لا يوجد مشتركون لديهم مواقع جغرافية مسجلة على الخريطة حالياً.');
        return;
      }

      // Sort all subscribers by direct distance from current location first
      const sortedByDistance = [...allWithCoords].sort((a, b) => {
        const distA = getGeodesicDistanceMeters(startLoc[0], startLoc[1], a.coordinates!.lat, a.coordinates!.lng);
        const distB = getGeodesicDistanceMeters(startLoc[0], startLoc[1], b.coordinates!.lat, b.coordinates!.lng);
        return distA - distB;
      });

      candidateSubs = sortedByDistance.slice(0, Math.min(count, sortedByDistance.length));
    }

    // Perform Nearest Neighbor Path Optimization so stops are ordered sequentially by proximity
    const optimizedTourList = sortSubscribersByNearestRoute(startLoc, candidateSubs);

    lastRoutedStartCoordsRef.current = null;
    setIsMapLockedToUser(true);
    isMapLockedToUserRef.current = true;
    setIsLiveGpsActive(true);
    setRouteDestinationSub(null);
    setTourWaypoints(optimizedTourList);
    setActiveTourIndex(0);
    setIsTourActive(true);
    setIsDirectionsMenuOpen(false);

    if (map) {
      drawMultiStopTourOnMap(map, startLoc, optimizedTourList, 0, travelMode, true);
    }
  };

  const advanceTourNextStop = () => {
    const nextIdx = activeTourIndex + 1;
    if (nextIdx >= tourWaypoints.length) {
      alert('🎉 تهانينا! تمت جولة الجباية الميدانية بالكامل بنجاح واستيفاء جميع المحطات المحددة.');
      clearRouteDirections();
      return;
    }

    setActiveTourIndex(nextIdx);
    const map = mapInstanceRef.current;
    if (map) {
      const startLoc = userLocation || [map.getCenter().lat, map.getCenter().lng] as [number, number];
      drawMultiStopTourOnMap(map, startLoc, tourWaypoints, nextIdx, travelMode, false);
      
      const nextSub = tourWaypoints[nextIdx];
      if (nextSub.coordinates) {
        map.flyTo([nextSub.coordinates.lat, nextSub.coordinates.lng], 18, { animate: true, duration: 1.2 });
      }
    }
  };

  const handleFocusRouteBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const startLoc = userLocation || [map.getCenter().lat, map.getCenter().lng] as [number, number];

    if (isTourActive && tourWaypoints.length > 0) {
      drawMultiStopTourOnMap(map, startLoc, tourWaypoints, activeTourIndex, travelMode, true);
    } else if (routeDestinationSub && routeDestinationSub.coordinates) {
      drawRouteOnMap(map, startLoc, [routeDestinationSub.coordinates.lat, routeDestinationSub.coordinates.lng], routeDestinationSub, travelMode, true);
    }
  };

  const copyTourManifestText = () => {
    if (tourWaypoints.length === 0) return;
    
    let text = `📋 *جدول جولة الجباية الميدانية (شبكة الفولطيرا الكهربائية)*\n`;
    text += `⏱️ عدد المحطات: ${tourWaypoints.length} عداد\n`;
    text += `💰 إجمالي المبلغ المستهدف: ${tourStats?.totalUnpaid.toLocaleString() || 0} ريال\n`;
    text += `🛣️ المسافة الكلية: ${tourStats?.totalDistanceText || ''}\n\n`;
    text += `------------------------------\n`;

    tourWaypoints.forEach((wp, i) => {
      text += `${i + 1}. *${wp.name}*\n   - العداد: ${wp.meterNumber || 'غير مسجل'}\n   - المطلوب: ${wp.currentBalance.toLocaleString()} ريال\n`;
    });

    navigator.clipboard.writeText(text);
    alert('تم نسخ بيان جولة الجباية الميدانية إلى الحافظة! يمكنك الآن لصقه في مجموعات الواتساب أو مشاركته مع المحصل.');
  };

  const clearRouteDirections = () => {
    lastRoutedStartCoordsRef.current = null;
    lastRoutedTargetSubIdRef.current = null;
    lastRoutedModeRef.current = null;
    lastRoutedTourIndexRef.current = null;

    setRouteDestinationSub(null);
    setRouteInfo(null);
    setIsTourActive(false);
    setTourWaypoints([]);
    setActiveTourIndex(0);
    setTourStats(null);
    setIsBannerCollapsed(false);
    if (routeGroupRef.current) {
      routeGroupRef.current.clearLayers();
    }
  };

  // Toggle Live GPS Position Tracking
  useEffect(() => {
    if (!isLiveGpsActive) {
      if (navGpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(navGpsWatchIdRef.current);
        navGpsWatchIdRef.current = null;
      }
      setCurrentSpeedKmh(null);
      return;
    }

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speedMs = pos.coords.speed;
          if (typeof speedMs === 'number' && !isNaN(speedMs)) {
            setCurrentSpeedKmh(Math.round(speedMs * 3.6));
          } else {
            setCurrentSpeedKmh(0);
          }

          setUserLocation([lat, lng]);
          if (pos.coords.heading !== null && pos.coords.heading !== undefined && !isNaN(pos.coords.heading)) {
            setUserHeading(pos.coords.heading);
            userHeadingRef.current = pos.coords.heading;
          }

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
            userMarkerRef.current.setZIndexOffset(5000);
          }

          const currentHeading = userHeadingRef.current || 0;
          const beamElems = document.querySelectorAll('.user-gps-beam-container, #user-gps-beam-container');
          beamElems.forEach(el => {
            (el as HTMLElement).style.transform = `rotate(${currentHeading}deg)`;
          });

          // Redraw active navigation smoothly with new live GPS coordinates WITHOUT resetting camera view unless locked
          const map = mapInstanceRef.current;
          if (map) {
            if (isMapLockedToUserRef.current && (isTourActive || routeDestinationSub)) {
              map.panTo([lat, lng], { animate: true, duration: 0.8 });
            }

            if (isTourActive && tourWaypoints.length > 0) {
              drawMultiStopTourOnMap(map, [lat, lng], tourWaypoints, activeTourIndex, travelMode, false);
            } else if (routeDestinationSub && routeDestinationSub.coordinates) {
              drawRouteOnMap(map, [lat, lng], [routeDestinationSub.coordinates.lat, routeDestinationSub.coordinates.lng], routeDestinationSub, travelMode, false);
            }
          }
        },
        (err) => {
          console.warn('Live GPS watch error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
      navGpsWatchIdRef.current = watchId;
    }

    return () => {
      if (navGpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(navGpsWatchIdRef.current);
      }
    };
  }, [isLiveGpsActive, isTourActive, tourWaypoints, activeTourIndex, routeDestinationSub, travelMode]);

  // Handle travel mode switch
  const handleTravelModeChange = (newMode: TravelMode) => {
    setTravelMode(newMode);
    const map = mapInstanceRef.current;
    if (!map) return;

    const startLoc = userLocation || [map.getCenter().lat, map.getCenter().lng] as [number, number];

    if (isTourActive && tourWaypoints.length > 0) {
      drawMultiStopTourOnMap(map, startLoc, tourWaypoints, activeTourIndex, newMode, false);
    } else if (routeDestinationSub && routeDestinationSub.coordinates) {
      drawRouteOnMap(map, startLoc, [routeDestinationSub.coordinates.lat, routeDestinationSub.coordinates.lng], routeDestinationSub, newMode, false);
    }
  };

  // Event Delegation for Popup Reading and Directions Buttons
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const readBtn = target.closest('[data-reading-sub-id]') as HTMLElement;
      if (readBtn) {
        const subId = readBtn.getAttribute('data-reading-sub-id');
        if (subId) {
          const sub = (allSubscribers || []).find(s => s.id === subId) || subscribers.find(s => s.id === subId);
          if (sub) {
            setSelectedSubForReading(sub);
            setReadingInputVal('');
          }
        }
        return;
      }

      const dirBtn = target.closest('[data-directions-sub-id]') as HTMLElement;
      if (dirBtn) {
        const subId = dirBtn.getAttribute('data-directions-sub-id');
        if (subId) {
          const sub = (allSubscribers || []).find(s => s.id === subId) || subscribers.find(s => s.id === subId);
          if (sub) {
            handleStartDirections(sub);
          }
        }
        return;
      }
    };

    mapContainer.addEventListener('click', handleContainerClick);
    return () => {
      mapContainer.removeEventListener('click', handleContainerClick);
    };
  }, [allSubscribers, subscribers]);

  const handleSaveMapReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForReading) return;

    const prevReading = selectedSubForReading.currentReading;
    const currReading = parseFloat(readingInputVal);

    if (isNaN(currReading) || currReading < prevReading) {
      alert(`عذراً! القراءة الحالية (${currReading || 0}) يجب أن تكون أكبر من أو تساوي القراءة السابقة (${prevReading}).`);
      return;
    }

    const consumption = currReading - prevReading;
    const tType = selectedSubForReading.tariffType || 'residential';
    const rate = settings?.tariffs ? ((settings.tariffs as any)[tType] ?? settings.tariffs.residential ?? 0) : 0;

    const fixedFee = settings?.fixedFee ?? 0;
    const serviceFee = settings?.serviceFee ?? 0;
    const taxPercent = settings?.taxPercent ?? 0;

    const consumptionCost = consumption * rate;
    const taxAmount = (consumptionCost * taxPercent) / 100;
    const totalAmount = consumption > 0 ? consumptionCost + fixedFee + serviceFee + taxAmount : 0;
    const existingCredit = selectedSubForReading.currentBalance < 0 ? Math.abs(selectedSubForReading.currentBalance) : 0;
    const prepaidCreditDeducted = Number(Math.min(totalAmount, existingCredit).toFixed(2));
    const netAmountDue = Number(Math.max(0, totalAmount - prepaidCreditDeducted).toFixed(2));

    const newReading: MeterReading = {
      id: `rd-map-${Date.now()}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      subscriberId: selectedSubForReading.id,
      subscriberName: selectedSubForReading.name,
      meterNumber: selectedSubForReading.meterNumber,
      previousReading: prevReading,
      currentReading: currReading,
      consumption,
      ratePerKwh: rate,
      fixedFee,
      taxAmount,
      totalAmount,
      prepaidCreditDeducted,
      netAmountDue,
      billingMonth: new Date().toISOString().substring(0, 7),
      readingDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      enteredBy: currentUser?.username || 'محصل الميدان',
      isPosted: false
    };

    if (onAddReading) {
      onAddReading(newReading);
    }

    if (onUpdateSubscribers && allSubscribers) {
      const updatedSubs = allSubscribers.map(s =>
        s.id === selectedSubForReading.id ? { ...s, currentReading: currReading } : s
      );
      onUpdateSubscribers(updatedSubs);
    }

    if (onAddAuditLog && currentUser) {
      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'تسجيل قراءة عبر الخريطة',
        details: `تم إدخال القراءة (${currReading}) للمشترك ${selectedSubForReading.name} مباشرة من الخريطة الميدانية`,
        timestamp: new Date().toISOString()
      });
    }

    setReadingSuccessMsg(`تم حفظ القراءة (${currReading} ك.و) بنجاح للمشترك: ${selectedSubForReading.name}`);
    setSelectedSubForReading(null);
    setReadingInputVal('');
    setTimeout(() => setReadingSuccessMsg(null), 5000);
  };

  // Custom Controls State
  const [mapType, setMapType] = useState<'google-satellite' | 'satellite' | 'dark' | 'streets'>('google-satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileTab, setMobileTab] = useState<'map' | 'directory'>('map');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Coordinate auto assignment state
  const [selectedSubForLocationAssign, setSelectedSubForLocationAssign] = useState<Subscriber | null>(null);
  const [clickedLocationToAssign, setClickedLocationToAssign] = useState<{ lat: number; lng: number } | null>(null);
  const [activeDirectoryTab, setActiveDirectoryTab] = useState<'registered' | 'unregistered'>('registered');

  const selectedSubRef = useRef<Subscriber | null>(null);
  useEffect(() => {
    selectedSubRef.current = selectedSubForLocationAssign;
  }, [selectedSubForLocationAssign]);

  // Synchronize browser Fullscreen State
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const userHeadingRef = useRef<number>(0);
  const displayRotationRef = useRef<number>(0);
  const lastRawHeadingRef = useRef<number | null>(null);
  const [gpsTrackingActive, setGpsTrackingActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const trackingIntervalRef = useRef<any | null>(null);
  const hasCenteredOnceRef = useRef<boolean>(false);

  // Compass calibration manual offset in degrees (-180 to +180)
  const [compassOffset, setCompassOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('compass_calibration_offset');
      return saved !== null ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const compassOffsetRef = useRef<number>(compassOffset);
  const [showCompassModal, setShowCompassModal] = useState<boolean>(false);
  const showCompassModalRef = useRef<boolean>(false);
  const [rawCompassHeading, setRawCompassHeading] = useState<number | null>(null);
  const [mobileToolsCollapsed, setMobileToolsCollapsed] = useState<boolean>(false);
  const headingBufferRef = useRef<number[]>([]);
  const lastThrottledUpdateRef = useRef<number>(0);

  useEffect(() => {
    compassOffsetRef.current = compassOffset;
    try {
      localStorage.setItem('compass_calibration_offset', compassOffset.toString());
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [compassOffset]);

  useEffect(() => {
    showCompassModalRef.current = showCompassModal;
  }, [showCompassModal]);

  const getArabicDirectionName = (deg: number) => {
    const norm = ((deg % 360) + 360) % 360;
    if (norm >= 337.5 || norm < 22.5) return 'شمال (North 0°)';
    if (norm >= 22.5 && norm < 67.5) return 'شمال شرق (NE 45°)';
    if (norm >= 67.5 && norm < 112.5) return 'شرق (East 90°)';
    if (norm >= 112.5 && norm < 157.5) return 'جنوب شرق (SE 135°)';
    if (norm >= 157.5 && norm < 202.5) return 'جنوب (South 180°)';
    if (norm >= 202.5 && norm < 247.5) return 'جنوب غرب (SW 225°)';
    if (norm >= 247.5 && norm < 292.5) return 'غرب (West 270°)';
    if (norm >= 292.5 && norm < 337.5) return 'شمال غرب (NW 315°)';
    return 'شمال (0°)';
  };

  // Device Orientation Listener with Advanced Anti-Jitter Deadband & Adaptive Low-Pass Filter
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let rawHeading: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
        rawHeading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        rawHeading = (360 - e.alpha) % 360;
      }

      if (rawHeading !== null && !isNaN(rawHeading)) {
        rawHeading = (rawHeading % 360 + 360) % 360;

        // 5-sample ring buffer smoothing for raw sensor input noise
        const buf = headingBufferRef.current;
        buf.push(rawHeading);
        if (buf.length > 5) buf.shift();

        // Calculate circular mean of buffer angles
        let sinSum = 0;
        let cosSum = 0;
        for (const angle of buf) {
          const rad = (angle * Math.PI) / 180;
          sinSum += Math.sin(rad);
          cosSum += Math.cos(rad);
        }
        const avgRaw = (Math.atan2(sinSum, cosSum) * 180 / Math.PI + 360) % 360;

        // Apply manual calibration offset to raw sensor reading
        const calibratedRaw = (avgRaw + compassOffsetRef.current + 360) % 360;

        if (lastRawHeadingRef.current === null) {
          displayRotationRef.current = calibratedRaw;
          lastRawHeadingRef.current = calibratedRaw;
        } else {
          // Shortest angular difference (-180° to +180°)
          let diff = (calibratedRaw - (displayRotationRef.current % 360) + 540) % 360 - 180;
          
          // Smooth deadband filter so compass stays responsive during routing
          if (Math.abs(diff) >= 0.8) {
            const alpha = Math.min(0.4, 0.15 + Math.abs(diff) * 0.02);
            displayRotationRef.current += diff * alpha;
            lastRawHeadingRef.current = calibratedRaw;
          }
        }

        const finalRotation = Math.round(displayRotationRef.current);
        const normHeading = ((finalRotation % 360) + 360) % 360;
        userHeadingRef.current = normHeading;

        // Direct DOM mutation for 60fps zero-flicker rotation across all active compass beam elements
        const beamElems = document.querySelectorAll('.user-gps-beam-container, #user-gps-beam-container');
        beamElems.forEach(el => {
          (el as HTMLElement).style.transform = `rotate(${finalRotation}deg)`;
        });

        // Throttle React state updates to avoid unnecessary component re-renders
        const now = Date.now();
        if (showCompassModalRef.current || now - lastThrottledUpdateRef.current > 600) {
          lastThrottledUpdateRef.current = now;
          setRawCompassHeading(Math.round(rawHeading));
          setUserHeading(normHeading);
        }
      }
    };

    // Use deviceorientationabsolute if available, fallback to deviceorientation
    const eventName = ('ondeviceorientationabsolute' in window) ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName as any, handleOrientation, true);

    return () => {
      window.removeEventListener(eventName as any, handleOrientation, true);
    };
  }, []);

  const createGpsIcon = (headingDeg: number) => {
    return L.divIcon({
      className: 'gps-marker-container',
      html: `
        <div style="position: relative; width: 70px; height: 70px; pointer-events: none;">
          <!-- Compact 90-Degree Radar Beam Fan pointing North/Up -->
          <div id="user-gps-beam-container" class="user-gps-beam-container" style="position: absolute; inset: 0; transform: rotate(${headingDeg}deg); transform-origin: 35px 35px; transition: transform 0.15s ease-out; pointer-events: none;">
            <svg width="70" height="70" viewBox="0 0 70 70" style="overflow: visible; display: block;">
              <defs>
                <radialGradient id="radarBeamGradient" cx="35" cy="35" r="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#0284c7" stop-opacity="0.85" />
                  <stop offset="40%" stop-color="#38bdf8" stop-opacity="0.45" />
                  <stop offset="75%" stop-color="#0ea5e9" stop-opacity="0.18" />
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
                </radialGradient>
              </defs>

              <!-- 90-Degree Sector Path (Centered at 35,35, Radius 28, Pointing Up) -->
              <path d="M 35 35 L 15.2 15.2 A 28 28 0 0 1 54.8 15.2 Z" 
                    fill="url(#radarBeamGradient)" 
                    stroke="#38bdf8" 
                    stroke-width="1.2" 
                    stroke-opacity="0.8" 
                    class="radar-beam-glow" />

              <!-- Inner Guidance Wave Arcs -->
              <path d="M 23.7 23.7 A 16 16 0 0 1 46.3 23.7" 
                    fill="none" stroke="#7dd3fc" stroke-width="1.2" opacity="0.75" class="animate-pulse" />
              <path d="M 19.4 19.4 A 22 22 0 0 1 50.6 19.4" 
                    fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.6" />
                    
              <!-- Outer Curved Arc Edge -->
              <path d="M 15.2 15.2 A 28 28 0 0 1 54.8 15.2" 
                    fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" opacity="0.9" />
            </svg>
          </div>

          <!-- Center GPS Pulsing Dot -->
          <div style="position: absolute; left: 35px; top: 35px; transform: translate(-50%, -50%); pointer-events: auto;">
            <div class="gps-pulsing-ring"></div>
            <div class="gps-pulsing-dot"></div>
          </div>
        </div>
      `,
      iconSize: [70, 70],
      iconAnchor: [35, 35]
    });
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (trackingIntervalRef.current !== null) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);
  
  // Ruler Measuring Tool State
  const [rulerEnabled, setRulerEnabled] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<L.LatLng[]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  
  // Crosshair Target State
  const [crosshairEnabled, setCrosshairEnabled] = useState(false);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  const rulerEnabledRef = useRef(rulerEnabled);
  const crosshairEnabledRef = useRef(crosshairEnabled);

  useEffect(() => {
    rulerEnabledRef.current = rulerEnabled;
  }, [rulerEnabled]);

  useEffect(() => {
    crosshairEnabledRef.current = crosshairEnabled;
  }, [crosshairEnabled]);

  // Map Tile Refs
  const streetsTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteTileLayerRef = useRef<L.TileLayer | null>(null);
  const googleSatelliteTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);
  const darkTileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Feature Groups and Marker Registry Refs
  const userMarkerRef = useRef<L.Marker | null>(null);
  const rulerGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const mapMarkersMapRef = useRef<{ [subId: string]: L.Marker }>({});

  const validSubscribers = subscribers.filter(
    s => s.coordinates && typeof s.coordinates.lat === 'number' && typeof s.coordinates.lng === 'number'
  );

  const filteredSubscribers = validSubscribers.filter(sub => {
    const q = searchQuery.toLowerCase();
    return (
      sub.name.toLowerCase().includes(q) ||
      sub.id.toLowerCase().includes(q) ||
      (sub.phone && sub.phone.includes(q)) ||
      (sub.zone && sub.zone.toLowerCase().includes(q)) ||
      (sub.meterNumber && sub.meterNumber.toLowerCase().includes(q))
    );
  });

  const unregisteredSubscribers = subscribers.filter(
    s => !s.coordinates || typeof s.coordinates.lat !== 'number' || typeof s.coordinates.lng !== 'number'
  );

  const filteredUnregisteredSubscribers = unregisteredSubscribers.filter(sub => {
    const q = searchQuery.toLowerCase();
    return (
      sub.name.toLowerCase().includes(q) ||
      sub.id.toLowerCase().includes(q) ||
      (sub.phone && sub.phone.includes(q)) ||
      (sub.zone && sub.zone.toLowerCase().includes(q)) ||
      (sub.meterNumber && sub.meterNumber.toLowerCase().includes(q))
    );
  });

  // Handle subscriber selection to fly and show details
  const handleSelectSubscriber = (sub: Subscriber) => {
    setMobileTab('map');
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!sub.coordinates) {
      setSelectedSubForLocationAssign(sub);
      setClickedLocationToAssign(null);
      return;
    }

    // Force map recalculate on mobile transition
    setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 50);

    map.flyTo([sub.coordinates.lat, sub.coordinates.lng], 18, {
      animate: true,
      duration: 1.2
    });

    const marker = mapMarkersMapRef.current[sub.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 1200);
    }
  };

  const confirmAssignLocation = () => {
    if (!selectedSubForLocationAssign || !clickedLocationToAssign) return;

    const updatedSub: Subscriber = {
      ...selectedSubForLocationAssign,
      coordinates: {
        lat: clickedLocationToAssign.lat,
        lng: clickedLocationToAssign.lng
      }
    };

    const updatedList = allSubscribers.map(sub => 
      sub.id === selectedSubForLocationAssign.id ? updatedSub : sub
    );

    if (onUpdateSubscribers) {
      onUpdateSubscribers(updatedList);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.username || 'المدير العام',
        action: 'تحديث الموقع',
        details: `تم تعيين موقع المشترك ${selectedSubForLocationAssign.name} تلقائياً من الخريطة (Lat: ${clickedLocationToAssign.lat.toFixed(6)}, Lng: ${clickedLocationToAssign.lng.toFixed(6)})`,
        timestamp: new Date().toISOString()
      });
    }

    // Reset states
    setSelectedSubForLocationAssign(null);
    setClickedLocationToAssign(null);
  };

  // GPS Coordinates Success Handler
  const onGpsSuccess = (lat: number, lng: number, shouldCenter: boolean = true, heading?: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setGpsLoading(false);
    setGpsSuccess(true);
    setGpsError(null);
    setUserLocation([lat, lng]);

    // Append to live GPS breadcrumbs recording track if active
    if (isGpsRecordingRef.current) {
      const pts = gpsRecordedPointsRef.current;
      const newPt: [number, number] = [lat, lng];

      if (pts.length === 0) {
        setGpsRecordedPoints([newPt]);
      } else {
        const lastPt = pts[pts.length - 1];
        const dist = L.latLng(lastPt).distanceTo(L.latLng(newPt));
        if (dist >= 2.5) {
          const updatedPts = [...pts, newPt];
          setGpsRecordedPoints(updatedPts);

          let totalMeters = 0;
          for (let i = 0; i < updatedPts.length - 1; i++) {
            totalMeters += L.latLng(updatedPts[i]).distanceTo(L.latLng(updatedPts[i + 1]));
          }
          setGpsRecordDistanceMeters(totalMeters);
        }
      }
    }

    if (heading !== undefined && heading !== null && !isNaN(heading)) {
      setUserHeading(heading);
      userHeadingRef.current = heading;
    }

    const currentHeading = userHeadingRef.current || 0;
    
    if (shouldCenter) {
      map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
    }
    
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setZIndexOffset(5000);
    } else {
      const userMarker = L.marker([lat, lng], {
        icon: createGpsIcon(currentHeading),
        zIndexOffset: 5000
      })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: right; font-family: inherit; direction: rtl; min-width: 140px; padding: 4px;">
            <h5 style="margin: 0 0 4px 0; font-weight: bold; color: #3b82f6; font-size: 12px; display: flex; align-items: center; gap: 4px;">
              <span class="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block self-center ml-1"></span>
              موقعك الفعلي الحالي
            </h5>
            <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">لقد تم رصد إحداثياتك بدقة مع شعاع التوجيه والبث (90°).</p>
          </div>
        `);
        
      userMarkerRef.current = userMarker;
      if (shouldCenter) {
        setTimeout(() => {
          if (userMarkerRef.current) {
            userMarkerRef.current.openPopup();
          }
        }, 1000);
      }
    }

    const beamElems = document.querySelectorAll('.user-gps-beam-container, #user-gps-beam-container');
    beamElems.forEach(el => {
      (el as HTMLElement).style.transform = `rotate(${currentHeading}deg)`;
    });

    // Dynamically update active route if navigating
    if (routeDestinationSubRef.current && routeDestinationSubRef.current.coordinates) {
      drawRouteOnMap(
        map,
        [lat, lng],
        [routeDestinationSubRef.current.coordinates.lat, routeDestinationSubRef.current.coordinates.lng],
        routeDestinationSubRef.current,
        travelModeRef.current,
        false
      );
    } else if (isTourActiveRef.current && tourWaypointsRef.current.length > 0) {
      drawMultiStopTourOnMap(
        map,
        [lat, lng],
        tourWaypointsRef.current,
        activeTourIndexRef.current,
        travelModeRef.current,
        false
      );
    }
  };

  // 1. Initial Leaflet Map Setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default coordinates: Sana'a, Yemen
    const defaultCenter: L.LatLngExpression = [15.3695, 44.1910];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false, // Custom styled zoom control
      preferCanvas: true, // Render vector elements on Canvas for ultra-fast performance
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    });

    mapInstanceRef.current = map;

    // Tile Layers Definition
    // CartoDB Voyager Streets
    const streetsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '© OpenStreetMap contributors, © CartoDB',
      subdomains: 'abcd',
      keepBuffer: 8,
      updateWhenIdle: true
    });

    // Esri High-Res Satellite Imagery (To see actual houses, buildings and streets)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri — Source: Esri, GeoEye, Earthstar Geographics, and the GIS User Community',
      keepBuffer: 8,
      updateWhenIdle: true
    });

    // Google High-Res Satellite (Constantly updated and includes newly built houses without POIs/labels)
    const googleSatelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 22,
      attribution: '© Google Maps Satellite',
      keepBuffer: 8,
      updateWhenIdle: true
    });

    // Reference labels for Satellite Hybrid view
    const labelsLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Labels © Esri',
      keepBuffer: 8,
      updateWhenIdle: true
    });

    // CartoDB Dark Matter
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '© OpenStreetMap, © CartoDB',
      subdomains: 'abcd',
      keepBuffer: 8,
      updateWhenIdle: true
    });

    streetsTileLayerRef.current = streetsLayer;
    satelliteTileLayerRef.current = satelliteLayer;
    googleSatelliteTileLayerRef.current = googleSatelliteLayer;
    labelsTileLayerRef.current = labelsLayer;
    darkTileLayerRef.current = darkLayer;

    // Mount initial layer
    if (mapType === 'streets') {
      streetsLayer.addTo(map);
    } else if (mapType === 'satellite') {
      satelliteLayer.addTo(map);
      labelsLayer.addTo(map);
    } else if (mapType === 'google-satellite') {
      googleSatelliteLayer.addTo(map);
    } else if (mapType === 'dark') {
      darkLayer.addTo(map);
    }

    // Initialize subscriber markers group
    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Initialize ruler group
    const rulerGroup = L.featureGroup().addTo(map);
    rulerGroupRef.current = rulerGroup;

    // Initialize route directions group
    const routeGroup = L.featureGroup().addTo(map);
    routeGroupRef.current = routeGroup;

    // Initialize custom mapped roads group
    const customRoadsGroup = L.featureGroup().addTo(map);
    customRoadsLayerGroupRef.current = customRoadsGroup;

    // Initialize active road drawing group
    const drawingGroup = L.featureGroup().addTo(map);
    drawingLayerGroupRef.current = drawingGroup;

    // Initialize AI detected alleys group
    const aiAlleysGroup = L.featureGroup().addTo(map);
    aiAlleysLayerGroupRef.current = aiAlleysGroup;

    // Initialize GPS live breadcrumbs recording group
    const liveRecordingGroup = L.featureGroup().addTo(map);
    liveRecordingLayerGroupRef.current = liveRecordingGroup;

    // Setup map event listeners
    map.on('move', () => {
      const center = map.getCenter();
      setCenterCoords({ lat: center.lat, lng: center.lng });
    });

    // Detect user manual interaction with map (drag, pinch, zoom, touch) to unlock free camera panning mode
    map.on('dragstart', () => {
      setIsMapLockedToUser(false);
      isMapLockedToUserRef.current = false;
    });

    map.on('zoomstart', (e: any) => {
      if (e.originalEvent) {
        setIsMapLockedToUser(false);
        isMapLockedToUserRef.current = false;
      }
    });

    map.on('touchstart', (e: any) => {
      if (e.originalEvent) {
        setIsMapLockedToUser(false);
        isMapLockedToUserRef.current = false;
      }
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isRoadDrawingModeRef.current) {
        const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
        setCurrentDrawingPoints(prev => [...prev, newPt]);
        return;
      }
      // If we are in subscriber location assignment mode, set coordinates
      if (selectedSubRef.current) {
        setClickedLocationToAssign({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (rulerEnabledRef.current) {
        setRulerPoints(prev => [...prev, e.latlng]);
      } else if (crosshairEnabledRef.current) {
        map.flyTo(e.latlng, map.getZoom(), { animate: true, duration: 0.5 });
      }
    });

    // Handle GPS geolocation events
    map.on('locationfound', (e: L.LocationEvent) => {
      onGpsSuccess(e.latlng.lat, e.latlng.lng);
    });

    map.on('locationerror', (e: L.ErrorEvent) => {
      // Leaflet internal fallback - only set error if not already set by direct GPS call
      setGpsLoading(false);
      console.warn('Leaflet map locate error:', e.message);
    });

    // Setup initial coordinates value
    const center = map.getCenter();
    setCenterCoords({ lat: center.lat, lng: center.lng });

    // Staggered Map Invalidation to handle responsive canvas loading flawlessly
    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
      setTimeout(() => map.invalidateSize(), 1200)
    ];

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      timers.forEach(clearTimeout);
      map.remove();
    };
  }, []);

  // 2. Render & Update Subscriber Markers dynamically when list changes with chunked batching for smooth UI
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    mapMarkersMapRef.current = {};

    let isCancelled = false;
    let animFrameId: number;

    const outerSize = isMobile ? 24 : 15.36;
    const innerSize = isMobile ? 9 : 5.76;
    const borderWidth = isMobile ? 2 : 1.2;
    const shadowRadius = isMobile ? 8 : 5.6;

    const renderBatch = (startIndex: number) => {
      if (isCancelled) return;
      const batchSize = 100;
      const endIndex = Math.min(startIndex + batchSize, validSubscribers.length);

      for (let i = startIndex; i < endIndex; i++) {
        const sub = validSubscribers[i];
        if (!sub.coordinates) continue;

        const isDebt = sub.currentBalance > 0;
        const markerColor = isDebt ? (sub.currentBalance > 10000 ? '#f43f5e' : '#f59e0b') : '#10b981';
        const shadowGlow = isDebt ? (sub.currentBalance > 10000 ? 'rgba(244, 63, 94, 0.7)' : 'rgba(245, 158, 11, 0.7)') : 'rgba(16, 185, 129, 0.7)';

        const customIcon = L.divIcon({
          className: 'custom-sub-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${outerSize}px;
              height: ${outerSize}px;
              background-color: rgba(15, 23, 42, 0.95);
              border: ${borderWidth}px solid ${markerColor};
              border-radius: 50%;
              box-shadow: 0 0 ${shadowRadius}px ${shadowGlow}, 0 2px 4px rgba(0,0,0,0.5);
              cursor: pointer;
              transition: all 0.2s ease;
            " class="marker-hover-pulse">
              <div style="
                width: ${innerSize}px;
                height: ${innerSize}px;
                background-color: ${markerColor};
                border-radius: 50%;
              "></div>
            </div>
          `,
          iconSize: [outerSize, outerSize],
          iconAnchor: [outerSize / 2, outerSize / 2],
          popupAnchor: [0, -(outerSize / 2)]
        });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; text-align: right; direction: rtl; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 6px; margin-bottom: 8px;">
              <h4 style="margin: 0; font-weight: 800; font-size: 14px; color: #f8fafc;">${sub.name}</h4>
              <span style="font-size: 9px; font-weight: bold; background-color: rgba(148, 163, 184, 0.15); color: #cbd5e1; padding: 2px 6px; border-radius: 6px;">
                ${sub.id}
              </span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1; space-y: 6px; line-height: 1.6;">
              <p style="margin: 3px 0; display: flex; align-items: center; gap: 4px;">
                <span style="color: #94a3b8;">رقم العداد:</span> <strong style="color: #ffffff;">${sub.meterNumber || 'غير مسجل'}</strong>
              </p>
              <p style="margin: 3px 0; display: flex; align-items: center; gap: 4px;">
                <span style="color: #94a3b8;">الهاتف:</span> <strong style="color: #ffffff;">${sub.phone || 'غير مسجل'}</strong>
              </p>
              <p style="margin: 3px 0; display: flex; align-items: center; gap: 4px;">
                <span style="color: #94a3b8;">المنطقة والحي:</span> <strong style="color: #ffffff;">${sub.zone}</strong>
              </p>
              <p style="margin: 3px 0; display: flex; align-items: center; gap: 4px;">
                <span style="color: #94a3b8;">المحول المغذي:</span> <strong style="color: #ffffff;">${sub.transformer || 'غير محدد'}</strong>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 800; padding-top: 6px; border-top: 1px dashed rgba(148, 163, 184, 0.2); display: flex; justify-content: space-between; align-items: center;">
                <span style="display: inline-flex; align-items: center; gap: 5px;">
                  <span>الرصيد المستحق:</span>
                  <span style="font-size: 8px; font-weight: 800; color: #10b981; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;">
                    <span style="width: 5px; height: 5px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span>
                    بث مباشر
                  </span>
                </span>
                <span style="color: ${isDebt ? '#f43f5e' : '#10b981'}; font-size: 14px; font-weight: 900; background-color: ${isDebt ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)'}; padding: 2px 8px; border-radius: 6px; border: 1px solid ${isDebt ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)'};">
                  ${sub.currentBalance.toLocaleString()} ريال
                </span>
              </p>
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.2); display: flex; flex-direction: column; gap: 6px;">
              <button data-reading-sub-id="${sub.id}" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; padding: 7px 12px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <span>⚡ إدخال القراءة الحالية</span>
              </button>
              <button data-directions-sub-id="${sub.id}" style="width: 100%; background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; padding: 7px 12px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); transition: all 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <span>🧭 الاتجاهات والملاحة الميدانية</span>
              </button>
            </div>
          </div>
        `;

        const marker = L.marker([sub.coordinates.lat, sub.coordinates.lng], { icon: customIcon })
          .addTo(group)
          .bindPopup(popupContent);

        mapMarkersMapRef.current[sub.id] = marker;
      }

      if (endIndex < validSubscribers.length) {
        animFrameId = requestAnimationFrame(() => renderBatch(endIndex));
      } else {
        if (validSubscribers.length > 0 && !userLocation && group.getLayers().length > 0) {
          try { map.fitBounds(group.getBounds().pad(0.18)); } catch {}
        }
      }
    };

    renderBatch(0);

    return () => {
      isCancelled = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [subscribers, isMobile]);

  // 3. Handle Switch of Map Base Layers Seamlessly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Safely remove active layers
    if (streetsTileLayerRef.current && map.hasLayer(streetsTileLayerRef.current)) {
      map.removeLayer(streetsTileLayerRef.current);
    }
    if (satelliteTileLayerRef.current && map.hasLayer(satelliteTileLayerRef.current)) {
      map.removeLayer(satelliteTileLayerRef.current);
    }
    if (googleSatelliteTileLayerRef.current && map.hasLayer(googleSatelliteTileLayerRef.current)) {
      map.removeLayer(googleSatelliteTileLayerRef.current);
    }
    if (labelsTileLayerRef.current && map.hasLayer(labelsTileLayerRef.current)) {
      map.removeLayer(labelsTileLayerRef.current);
    }
    if (darkTileLayerRef.current && map.hasLayer(darkTileLayerRef.current)) {
      map.removeLayer(darkTileLayerRef.current);
    }

    // Add selected layer
    if (mapType === 'streets') {
      if (streetsTileLayerRef.current) streetsTileLayerRef.current.addTo(map);
    } else if (mapType === 'satellite') {
      if (satelliteTileLayerRef.current) satelliteTileLayerRef.current.addTo(map);
      if (labelsTileLayerRef.current) labelsTileLayerRef.current.addTo(map);
    } else if (mapType === 'google-satellite') {
      if (googleSatelliteTileLayerRef.current) googleSatelliteTileLayerRef.current.addTo(map);
    } else if (mapType === 'dark') {
      if (darkTileLayerRef.current) darkTileLayerRef.current.addTo(map);
    }
  }, [mapType]);

  // 4. Handle Distance Measuring Ruler Tool Updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = rulerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (rulerPoints.length === 0) {
      setMeasuredDistance(null);
      return;
    }

    // Draw glowing nodes for clicked points
    rulerPoints.forEach((pt, idx) => {
      const nodeIcon = L.divIcon({
        className: 'ruler-node-container',
        html: `
          <div style="
            width: 14px;
            height: 14px;
            background-color: #f59e0b;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(245,158,11,0.8), 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      L.marker(pt, { icon: nodeIcon })
        .addTo(group)
        .bindTooltip(`النقطة ${idx + 1}`, {
          permanent: true,
          direction: 'top',
          className: 'ruler-tooltip-design'
        });
    });

    // Draw dashed connecting path
    if (rulerPoints.length > 1) {
      L.polyline(rulerPoints, {
        color: '#f59e0b',
        weight: 3.5,
        dashArray: '8, 8',
        opacity: 0.95
      }).addTo(group);

      // Calculate cumulative geodesic distance
      let totalMeters = 0;
      for (let i = 0; i < rulerPoints.length - 1; i++) {
        totalMeters += rulerPoints[i].distanceTo(rulerPoints[i + 1]);
      }
      setMeasuredDistance(totalMeters);

      // Draw interactive summary tooltip at latest point
      const lastPoint = rulerPoints[rulerPoints.length - 1];
      L.marker(lastPoint, {
        icon: L.divIcon({ html: '', className: 'hidden-helper-marker' })
      })
        .addTo(group)
        .bindTooltip(`المسافة الكلية: ${totalMeters.toFixed(1)} متر`, {
          permanent: true,
          direction: 'bottom',
          className: 'ruler-result-badge'
        });
    }
  }, [rulerPoints]);

  // Clean-up ruler when disabled
  useEffect(() => {
    if (!rulerEnabled) {
      setRulerPoints([]);
      setMeasuredDistance(null);
    }
  }, [rulerEnabled]);

  // Start continuous active tracking
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('عذراً، متصفحك الحالي أو جهازك لا يدعم خدمات الـ GPS.');
      return;
    }

    setGpsError(null);
    setGpsLoading(true);
    setGpsTrackingActive(true);
    hasCenteredOnceRef.current = false;

    // Clear any previous watch/interval safely
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (trackingIntervalRef.current !== null) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    const handleLocationUpdate = (latitude: number, longitude: number, heading?: number | null) => {
      setGpsLoading(false);
      setGpsSuccess(true);
      setGpsError(null);
      
      const shouldCenter = !hasCenteredOnceRef.current;
      if (shouldCenter) {
        hasCenteredOnceRef.current = true;
      }
      onGpsSuccess(latitude, longitude, shouldCenter, heading);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude, heading } = position.coords;
      handleLocationUpdate(latitude, longitude, heading);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.warn('GPS watchPosition update warning/error (code ' + error.code + '):', error.message);
      
      if (error.code === error.PERMISSION_DENIED) {
        setGpsLoading(false);
        setGpsTrackingActive(false);
        stopGpsTracking();
        setGpsError('تم رفض صلاحية الوصول للموقع الجغرافي. يرجى إعطاء الصلاحية للمتصفح.');
      } else {
        // Keep tracking state active because mobile browser GPS locks can be transiently lost
        setGpsLoading(true); // Show search indicator
      }
    };

    // 1. Primary WatchPosition
    try {
      const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
      watchIdRef.current = watchId;
    } catch (ex: any) {
      console.warn('Failed to initiate watchPosition:', ex);
    }

    // 2. Secondary Active Polling Interval (Every 5 seconds) as fallback/booster
    // Extremely effective when watchPosition fails or stalls on mobile devices/iframes
    trackingIntervalRef.current = setInterval(() => {
      if (!navigator.geolocation) return;
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleLocationUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.heading);
        },
        (err) => {
          console.warn('Polling getCurrentPosition warning (code ' + err.code + '):', err.message);
          if (err.code === err.PERMISSION_DENIED) {
            stopGpsTracking();
            setGpsError('تم رفض صلاحية الوصول للموقع الجغرافي.');
          }
        },
        {
          enableHighAccuracy: false, // Standard accuracy uses cell towers/Wi-Fi, which is faster and more reliable indoors/under bad GPS locks
          timeout: 8000,
          maximumAge: 5000
        }
      );
    }, 5000);
  };

  // Stop continuous active tracking
  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (trackingIntervalRef.current !== null) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setGpsTrackingActive(false);
    setGpsLoading(false);
  };

  // Automatically start continuous tracking when the map is opened
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        console.log("Auto-initiating live GPS tracking...");
        startGpsTracking();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      stopGpsTracking();
    };
  }, []);

  // Trigger browser-level GPS locate with high precision & multi-tier fallbacks
  const handleGpsLocate = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    console.log("Locating current position and starting automatic continuous tracking...");
    hasCenteredOnceRef.current = false; // Reset centering to force-center on next coordinate update
    startGpsTracking();
  };

  // Copy center crosshair coords to clipboard
  const handleCopyCoords = () => {
    if (!centerCoords) return;
    const text = `${centerCoords.lat.toFixed(6)}, ${centerCoords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Zoom handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Fullscreen toggler with browser native support & CSS fallback
  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.warn('Native fullscreen failed, falling back to CSS fullscreen:', err);
          setIsFullscreen(true);
        });
    } else {
      document.exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch(() => {
          setIsFullscreen(false);
        });
    }
  };

  return (
    <div ref={containerRef} className={`w-full font-sans transition-all duration-300 relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col md:flex-row bg-slate-950 ${
      isFullscreen ? 'fixed inset-0 z-[9999] h-[100dvh] w-screen rounded-none' : 'h-[580px] sm:h-[640px] md:h-[700px] lg:h-[760px] min-h-[480px]'
    }`}>
      
      {/* Mobile Top View Switcher (Map vs Directory) - Only on mobile screens */}
      <div className="md:hidden flex items-center justify-between bg-slate-950/98 border-b border-slate-800/90 px-2.5 py-1.5 z-[650] shrink-0 gap-2" dir="rtl">
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 flex-1 shadow-inner">
          <button
            onClick={() => {
              setMobileTab('map');
              setTimeout(() => {
                try { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); } catch {}
              }, 80);
            }}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white font-bold'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>الخريطة الميدانية</span>
          </button>

          <button
            onClick={() => setMobileTab('directory')}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'directory'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white font-bold'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>دليل المشتركين ({filteredSubscribers.length})</span>
          </button>
        </div>

        {/* Mobile Fullscreen Toggle button */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:text-white active:scale-95 transition-all shrink-0 cursor-pointer"
          title={isFullscreen ? 'تصغير الشاشة' : 'تكبير ملء الشاشة'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Global CSS Injector for beautiful Map elements */}
      <style>{`
        @keyframes gpsPulse {
          0%, 100% {
            opacity: 0.95;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5), 0 0 8px rgba(59, 130, 246, 0.8);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4), 0 0 12px rgba(59, 130, 246, 0.6);
          }
        }
        @keyframes radarWave {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6);
            opacity: 0.85;
          }
          100% {
            box-shadow: 0 0 0 24px rgba(59, 130, 246, 0);
            opacity: 0;
          }
        }
        @keyframes gpsBtnPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .gps-btn-pulse-active {
          animation: gpsBtnPulse 2s infinite ease-in-out;
          will-change: opacity;
        }
        .gps-pulsing-dot {
          width: 14px;
          height: 14px;
          background-color: #3b82f6;
          border: 2px solid #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          animation: gpsPulse 2s infinite ease-in-out;
          will-change: opacity, box-shadow;
        }
        .gps-pulsing-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          animation: radarWave 2.2s infinite cubic-bezier(0.215, 0.610, 0.355, 1);
          pointer-events: none;
          will-change: opacity, box-shadow;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(251, 191, 36, 0.2) !important;
          border-radius: 16px !important;
          color: #f8fafc !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
          padding: 6px !important;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(251, 191, 36, 0.2) !important;
        }
        .ruler-tooltip-design {
          background-color: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(245, 158, 11, 0.4) !important;
          color: #f59e0b !important;
          font-weight: bold !important;
          font-size: 10px !important;
          padding: 2px 6px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important;
        }
        .ruler-result-badge {
          background-color: #f59e0b !important;
          border: none !important;
          color: #0f172a !important;
          font-weight: 900 !important;
          font-size: 11px !important;
          padding: 4px 10px !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.4) !important;
        }
        .leaflet-container {
          font-family: inherit !important;
          background: #090d16 !important;
        }
        .marker-hover-pulse:hover {
          transform: scale(1.15);
          box-shadow: 0 0 20px rgba(251,191,36,0.8) !important;
        }
      `}</style>

      {/* 1. Left Side: Interactive Map Visuals & Absolute Widgets */}
      <div className={`flex-1 relative w-full h-full order-1 md:order-2 ${
        mobileTab === 'map' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
      }`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Custom HUD Header - Crosshair indicator / Coordinate tracker */}
        {crosshairEnabled && (
          <>
            {/* Real Screen Absolute Center Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
              <div className="relative flex items-center justify-center">
                {/* Visual Target circles and crosslines */}
                <div className="w-8 h-8 border-2 border-dashed border-amber-500 rounded-full animate-spin [animation-duration:8s] opacity-75"></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full absolute"></div>
                <div className="w-10 h-[2px] bg-amber-500/50 absolute"></div>
                <div className="h-10 w-[2px] bg-amber-500/50 absolute"></div>
              </div>
            </div>

            {/* Futuristic floating digital coordinate readout display */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 p-3.5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 max-w-[90%] md:max-w-md text-right pointer-events-auto" dir="rtl">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                <Crosshair className="w-4 h-4 animate-pulse" />
                <span>منظومة التقاط الإحداثيات للمنازل</span>
              </div>
              <p className="text-[10px] text-slate-400 text-center">اسحب الخريطة لتضع المصلب البرتقالي بدقة فوق المنزل المستهدف، ثم انسخ الإحداثيات لإدراجها في بيانات المشترك.</p>
              
              {centerCoords && (
                <div className="flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 w-full justify-between">
                  <div>
                    <span className="text-slate-500 text-[9px] block">خط العرض (Latitude)</span>
                    <span className="text-emerald-400 font-bold">{centerCoords.lat.toFixed(6)}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-800"></div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">خط الطول (Longitude)</span>
                    <span className="text-emerald-400 font-bold">{centerCoords.lng.toFixed(6)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleCopyCoords}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {copiedCoords ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>تم نسخ الإحداثيات بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الإحداثيات الحالية</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Floating Top Bar controls - Style switcher & status badge */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[500] flex flex-col gap-1 sm:gap-2 pointer-events-auto items-end max-w-[calc(100%-1rem)] sm:max-w-none" style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden', willChange: 'transform' }}>
          {/* Futuristic pill selector */}
          <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl flex items-center gap-0.5 sm:gap-1 shadow-2xl overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setMapType('google-satellite')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 ${
                mapType === 'google-satellite'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
              <span className="hidden sm:inline">قمر صناعي Google</span>
              <span className="sm:hidden">Google</span>
            </button>

            <button
              onClick={() => setMapType('satellite')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 ${
                mapType === 'satellite'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
              <span className="hidden sm:inline">قمر صناعي Esri</span>
              <span className="sm:hidden">Esri</span>
            </button>
            
            <button
              onClick={() => setMapType('streets')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 ${
                mapType === 'streets'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <MapIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">خريطة شوارع</span>
              <span className="sm:hidden">شوارع</span>
            </button>

            <button
              onClick={() => setMapType('dark')}
              className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 ${
                mapType === 'dark'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">نمط داكن</span>
              <span className="sm:hidden">ليلي</span>
            </button>
          </div>

          <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/30 text-slate-200 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-bold flex items-center gap-1 sm:gap-2 shadow-lg pointer-events-none">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-extrabold hidden sm:inline">بث مباشر لقواعد البيانات</span>
            <span className="text-emerald-400 font-extrabold sm:hidden">مباشر</span>
          </div>
        </div>

        {/* Floating Side Tools Toolbar - Compact, Organized & Mobile-Optimized */}
        <div className="absolute bottom-3 right-2 sm:bottom-6 sm:right-4 z-[500] flex flex-col gap-1.5 sm:gap-2 pointer-events-auto items-center" style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden', willChange: 'transform' }}>
          
          {/* Mobile Collapse/Expand Toggle Pill */}
          {mobileToolsCollapsed ? (
            <button
              onClick={() => setMobileToolsCollapsed(false)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full bg-slate-950/95 backdrop-blur-xl border border-amber-500/60 text-amber-400 font-bold text-[11px] sm:text-xs shadow-2xl flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse sm:animate-none"
              title="إظهار أدوات الخريطة"
            >
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>أدوات الخريطة</span>
              <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
            </button>
          ) : (
            <>
              {/* Mobile Collapse Header Button */}
              <button
                onClick={() => setMobileToolsCollapsed(true)}
                className="sm:hidden px-2 py-0.5 rounded-lg bg-slate-950/90 text-slate-400 border border-slate-800 text-[9px] font-bold flex items-center gap-1 shadow-md hover:text-white transition-all cursor-pointer"
                title="طي الأدوات لتوسيع الخريطة"
              >
                <span>طي الأدوات</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Module 1: Navigation & GPS Group */}
              <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 flex flex-col gap-0.5 sm:gap-1 shadow-2xl">
                {/* GPS Locate tool */}
                <button
                  onClick={handleGpsLocate}
                  disabled={gpsLoading}
                  title="تحديد موقعي الفعلي الحالي"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    gpsSuccess 
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30' 
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {gpsLoading && !gpsTrackingActive ? (
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Target className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gpsSuccess ? 'gps-btn-pulse-active' : ''}`} />
                  )}
                </button>

                {/* GPS Live Tracking / Follow Me */}
                <button
                  onClick={startGpsTracking}
                  title="التعقب المستمر المباشر"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    gpsTrackingActive 
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 gps-btn-pulse-active' 
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-emerald-400'
                  }`}
                >
                  {gpsLoading && gpsTrackingActive ? (
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Navigation className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gpsTrackingActive ? 'rotate-[135deg] transition-transform' : ''}`} />
                  )}
                </button>

                {/* Directions Navigation tool */}
                <button
                  onClick={() => setIsDirectionsMenuOpen(!isDirectionsMenuOpen)}
                  title="دليل الاتجاهات والملاحة"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    routeDestinationSub || isDirectionsMenuOpen
                      ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30 font-bold' 
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-sky-400'
                  }`}
                >
                  <Compass className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${routeDestinationSub ? 'animate-spin-slow' : ''}`} />
                </button>

                {/* Compass Calibration tool */}
                <button
                  onClick={() => setShowCompassModal(true)}
                  title="معايرة دقة البوصلة والانحراف اليدوي"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border relative ${
                    showCompassModal || compassOffset !== 0
                      ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-500/30' 
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-amber-400'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {compassOffset !== 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center text-[6px] sm:text-[7px] font-black text-slate-950" title={`الإزاحة: ${compassOffset > 0 ? `+${compassOffset}` : compassOffset}°`}>
                      !
                    </span>
                  )}
                </button>
              </div>

              {/* Module 2: Inspection & Measurement Group */}
              <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 flex flex-col gap-0.5 sm:gap-1 shadow-2xl">
                {/* Custom Road / Alley Mapping Tool */}
                <button
                  onClick={() => {
                    setIsRoadDrawingMode(!isRoadDrawingMode);
                    if (isRoadDrawingMode) {
                      setCurrentDrawingPoints([]);
                    }
                  }}
                  title="تخطيط وتعيين الشوارع والأزقة الفرعية للتوجيه الملاحي"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border relative ${
                    isRoadDrawingMode 
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 font-bold animate-pulse' 
                      : customRoads.length > 0
                      ? 'bg-slate-900/80 text-amber-400 border-amber-500/40 hover:bg-slate-800'
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-amber-400'
                  }`}
                >
                  <Route className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {customRoads.length > 0 && !isRoadDrawingMode && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border border-slate-950 text-slate-950 text-[8px] font-extrabold flex items-center justify-center">
                      {customRoads.length}
                    </span>
                  )}
                </button>

                {/* AI Alley Outline Satellite Detection Tool */}
                <button
                  onClick={handleScanAIAlleys}
                  disabled={isScanningAIAlleys}
                  title="التعرف الآلي على الأزقة والممرات الترابية من الصور الجوية بالذكاء الاصطناعي (AI Satellite)"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border relative ${
                    isScanningAIAlleys 
                      ? 'bg-purple-600 text-white border-purple-300 shadow-lg shadow-purple-500/50 animate-pulse' 
                      : aiDetectedAlleys.length > 0
                      ? 'bg-purple-900/90 text-purple-300 border-purple-500/60 hover:bg-purple-800'
                      : 'bg-slate-900/80 text-purple-400 border-purple-500/40 hover:bg-purple-950/80 hover:text-purple-300'
                  }`}
                >
                  {isScanningAIAlleys ? (
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-purple-200" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 animate-pulse" />
                  )}
                  {aiDetectedAlleys.length > 0 && !isScanningAIAlleys && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-purple-500 border border-slate-950 text-white text-[8px] font-extrabold flex items-center justify-center shadow-md">
                      {aiDetectedAlleys.length}
                    </span>
                  )}
                </button>

                {/* GPS Live Breadcrumbs Recording Tool */}
                <button
                  onClick={() => {
                    if (isGpsRecording) {
                      handleStopAndSaveGpsBreadcrumbs();
                    } else {
                      startGpsBreadcrumbsRecording();
                    }
                  }}
                  title="تسجيل المسار الحي أثناء القيادة (GPS Breadcrumbs Tracking)"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border relative ${
                    isGpsRecording 
                      ? 'bg-rose-600 text-white border-rose-300 shadow-lg shadow-rose-500/50 animate-pulse' 
                      : gpsRecordedPoints.length > 0
                      ? 'bg-emerald-900/90 text-emerald-300 border-emerald-500/60 hover:bg-emerald-800'
                      : 'bg-slate-900/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/80 hover:text-emerald-300'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isGpsRecording ? 'animate-spin text-white' : 'text-emerald-400'}`} />
                  {gpsRecordedPoints.length > 0 && !isGpsRecording && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-slate-950 text-white text-[8px] font-extrabold flex items-center justify-center shadow-md">
                      {gpsRecordedPoints.length}
                    </span>
                  )}
                </button>

                {/* Measuring Ruler tool */}
                <button
                  onClick={() => setRulerEnabled(!rulerEnabled)}
                  title="مسطرة قياس المسافات والأسلاك"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    rulerEnabled 
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30' 
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-amber-400'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Coordinate Picker Crosshair tool */}
                <button
                  onClick={() => setCrosshairEnabled(!crosshairEnabled)}
                  title="منظار التقاط الإحداثيات للمباني"
                  className={`w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    crosshairEnabled 
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30' 
                      : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-800 hover:text-emerald-400'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Module 3: Map View Controls Group */}
              <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 flex flex-col gap-0.5 sm:gap-1 shadow-2xl">
                <button
                  onClick={handleZoomIn}
                  title="تكبير الخريطة"
                  className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl bg-slate-900/80 text-slate-200 border border-slate-800/80 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  title="تصغير الخريطة"
                  className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl bg-slate-900/80 text-slate-200 border border-slate-800/80 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  title="شاشة كاملة"
                  className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg sm:rounded-xl bg-slate-900/80 text-slate-200 border border-slate-800/80 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Floating Tool Notifications and Statuses (Left Side) */}
        <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2 max-w-xs text-right pointer-events-auto" dir="rtl">
          {/* Location Assignment Card */}
          {selectedSubForLocationAssign && (
            <div className="bg-slate-950/95 backdrop-blur-xl border border-emerald-500/55 p-3.5 rounded-2xl shadow-2xl space-y-2 text-right">
              <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                <MapPin className="w-4 h-4 animate-pulse" />
                <span>نمط تحديد موقع المشترك</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="text-slate-400 text-[10px] leading-relaxed">الاسم:</p>
                <p className="text-white font-bold text-xs">{selectedSubForLocationAssign.name}</p>
              </div>
              
              {!clickedLocationToAssign ? (
                <p className="text-[10px] text-amber-400/90 leading-normal animate-pulse font-bold">
                  👈 انقر الآن على أي مكان على الخريطة لتحديد موقع المنزل تلقائياً.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">خط العرض (Lat):</span>
                      <span className="text-slate-200 font-mono font-bold">{clickedLocationToAssign.lat.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">خط الطول (Lng):</span>
                      <span className="text-slate-200 font-mono font-bold">{clickedLocationToAssign.lng.toFixed(6)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={confirmAssignLocation}
                      className="flex-1 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                    >
                      تأكيد وحفظ
                    </button>
                    <button
                      onClick={() => setClickedLocationToAssign(null)}
                      className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                    >
                      إعادة اختيار
                    </button>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  setSelectedSubForLocationAssign(null);
                  setClickedLocationToAssign(null);
                }}
                className="w-full py-1 text-[9px] bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded-lg transition-all border border-rose-500/20"
              >
                إلغاء النمط
              </button>
            </div>
          )}

          {/* Ruler Tool Guide Card */}
          {rulerEnabled && (
            <div className="bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 p-3 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-[11px] mb-1">
                <Ruler className="w-3.5 h-3.5" />
                <span>رادار قياس أطوال كابلات الكهرباء</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-normal mb-2">
                انقر في أي مكان على الخريطة لتحديد نقطة البداية (مثل المحول)، ثم انقر فوق المنزل لحساب طول الكابل بدقة بالمتر.
              </p>
              {rulerPoints.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>عدد النقاط المحددة:</span>
                    <span className="text-amber-400 font-bold">{rulerPoints.length}</span>
                  </div>
                  {measuredDistance !== null && (
                    <div className="text-xs bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex justify-between items-center">
                      <span className="text-slate-400 text-[10px]">المسافة المقدرة:</span>
                      <span className="text-emerald-400 font-extrabold text-sm">{measuredDistance.toFixed(1)} متر</span>
                    </div>
                  )}
                  <button
                    onClick={() => setRulerPoints([])}
                    className="w-full py-1 text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    إعادة تعيين القياس
                  </button>
                </div>
              ) : (
                <span className="text-[9px] text-amber-500/80 animate-pulse font-bold">بانتظار النقر على الخريطة...</span>
              )}
            </div>
          )}

          {/* GPS Locate Failure Notification */}
          {gpsError && (
            <div className="bg-slate-900/98 backdrop-blur-xl border-2 border-red-500/40 p-4 rounded-2xl shadow-2xl flex items-start gap-3 text-slate-100 max-w-sm" dir="rtl">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5 animate-bounce" />
              <div className="text-right flex-1">
                <h5 className="font-extrabold text-xs mb-1 text-rose-400">تنبيه تحديد الموقع الجغرافي</h5>
                <p className="text-[10px] text-slate-300 leading-relaxed mb-3">{gpsError}</p>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      try {
                        window.open(window.location.href, '_blank');
                      } catch (e) {
                        alert("يرجى نسخ رابط الصفحة الحالي وفتحه في علامة تبويب جديدة.");
                      }
                    }}
                    className="w-full text-center py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-[10px] font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>الفتح في نافذة مستقلة 🌐</span>
                  </button>

                  <button
                    onClick={() => {
                      setGpsError(null);
                      handleGpsLocate();
                    }}
                    className="w-full text-center py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-[10px] font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>إعادة المحاولة 🔄</span>
                  </button>

                  <button 
                    onClick={() => setGpsError(null)} 
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold rounded-xl border border-slate-700 transition-all cursor-pointer text-center"
                  >
                    إغلاق التنبيه
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Directions Navigation Banner (Top Center) */}
        <AnimatePresence>
          {( (routeDestinationSub && routeInfo) || (isTourActive && tourWaypoints.length > 0) ) && (
            isBannerCollapsed ? (
              /* Compact Collapsed Mini-Pill Bar for Mobile */
              <motion.div
                key="collapsed-banner"
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-[600] bg-slate-950/95 backdrop-blur-2xl border border-sky-500/60 px-2.5 py-1 rounded-full shadow-xl max-w-xs sm:max-w-sm w-[90%] sm:w-auto text-right flex items-center justify-between gap-2 text-white pointer-events-auto"
                dir="rtl"
              >
                <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                  <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin-slow shrink-0" />
                  <span className="text-[11px] font-bold truncate text-sky-300">
                    {isTourActive 
                      ? `محطة ${activeTourIndex + 1}/${tourWaypoints.length}: ${tourWaypoints[activeTourIndex]?.name}`
                      : routeDestinationSub?.name
                    }
                  </span>
                  {(isTourActive && tourStats ? tourStats.totalDistanceText : routeInfo?.distanceText) && (
                    <span className="text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded-full border border-sky-500/30 shrink-0">
                      {isTourActive && tourStats ? tourStats.totalDistanceText : routeInfo?.distanceText}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleFocusRouteBounds}
                    className="p-1 rounded-full bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 transition-all cursor-pointer border border-sky-500/30"
                    title="تركيز الرؤية على المسار"
                  >
                    <Target className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIsBannerCollapsed(false)}
                    className="px-2 py-0.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all cursor-pointer text-[9px] font-extrabold flex items-center gap-0.5 shadow-sm"
                    title="توسيع شاشة التوجيه"
                  >
                    <ChevronDown className="w-3 h-3" />
                    <span>توسيع</span>
                  </button>
                  <button
                    onClick={clearRouteDirections}
                    className="p-1 rounded-full bg-slate-900 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-all cursor-pointer border border-slate-800"
                    title="إلغاء التوجيه"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Compact Expanded Navigation Banner */
              <motion.div
                key="expanded-banner"
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-[600] bg-slate-950/98 backdrop-blur-2xl border-2 border-sky-500/60 p-2 sm:p-3 rounded-2xl shadow-2xl max-w-xs sm:max-w-md w-[92%] sm:w-auto text-right flex flex-col gap-1.5 text-white pointer-events-auto"
                dir="rtl"
              >
                {/* Header Bar */}
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                      <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin-slow" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="text-[11px] sm:text-xs font-black text-white truncate">
                          {isTourActive ? 'جولة الجباية الذكية' : 'توجيه الملاحة'}
                        </h4>
                        <div className="text-[8px] px-1.5 py-0.2 rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center gap-0.5 shrink-0">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>{`GPS`}{currentSpeedKmh !== null && currentSpeedKmh > 0 ? ` ${currentSpeedKmh}كم/س` : ''}</span>
                        </div>
                      </div>
                      {isTourActive ? (
                        <p className="text-[9px] text-slate-300 truncate">
                          محطة (<strong className="text-emerald-400 font-bold">{activeTourIndex + 1}/{tourWaypoints.length}</strong>): <strong className="text-sky-300 font-bold">{tourWaypoints[activeTourIndex]?.name}</strong>
                        </p>
                      ) : (
                        <p className="text-[9px] text-slate-300 truncate">
                          الوجهة: <strong className="text-sky-300 font-bold">{routeDestinationSub?.name}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleFocusRouteBounds}
                      className="px-1.5 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 transition-all cursor-pointer border border-sky-500/30 flex items-center gap-0.5 text-[9px] font-bold"
                      title="تركيز الخريطة على كامل مسار الملاحة"
                    >
                      <Target className="w-3 h-3 text-sky-400" />
                      <span>تركيز المسار</span>
                    </button>
                    <button
                      onClick={() => setIsBannerCollapsed(true)}
                      className="px-1.5 py-0.5 rounded-lg bg-slate-900 hover:bg-sky-900/50 text-sky-400 hover:text-sky-300 transition-all cursor-pointer border border-slate-800 flex items-center gap-0.5 text-[9px] font-bold"
                      title="تصغير الشاشة"
                    >
                      <ChevronUp className="w-3 h-3" />
                      <span>إخفاء</span>
                    </button>
                    <button
                      onClick={clearRouteDirections}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-all cursor-pointer border border-slate-800"
                      title="إلغاء التوجيه"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Combined Compact Mode & Stats Row */}
                <div className="flex flex-wrap items-center justify-between gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[9px]">
                  {/* Travel Mode Pills */}
                  <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
                    <button
                      onClick={() => handleTravelModeChange('driving')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                        travelMode === 'driving' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'
                      }`}
                    >
                      <Car className="w-2.5 h-2.5" />
                      <span>سيارة</span>
                    </button>

                    <button
                      onClick={() => handleTravelModeChange('motorcycle')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                        travelMode === 'motorcycle' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                      }`}
                      title="دراجة نارية: المسار الأقصر عبر الأزقة الضيقة والمسارات الترابية والفرعية"
                    >
                      <Bike className="w-2.5 h-2.5" />
                      <span>دراجة نارية 🏍️</span>
                    </button>

                    <button
                      onClick={() => handleTravelModeChange('walking')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                        travelMode === 'walking' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
                      }`}
                    >
                      <Footprints className="w-2.5 h-2.5" />
                      <span>مشي</span>
                    </button>
                  </div>

                  {/* Distance & Time Info */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[9px] font-mono">
                    {isTourActive && tourStats ? (
                      <>
                        <span className="text-sky-300 font-bold">{tourStats.totalDistanceText}</span>
                        <span className="text-slate-700">|</span>
                        <span className="text-amber-300 font-bold">~{tourStats.totalMinutes}د</span>
                        <span className="text-slate-700">|</span>
                        <span className="text-emerald-400 font-extrabold">{tourStats.totalUnpaid.toLocaleString()} ر.ي</span>
                      </>
                    ) : routeInfo ? (
                      <>
                        <span className="text-sky-300 font-bold">{routeInfo.distanceText}</span>
                        <span className="text-slate-700">|</span>
                        <span className="text-amber-300 font-bold">~{routeInfo.driveTimeMinutes}د</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 pt-0.5">
                  {isTourActive ? (
                    <>
                      <button
                        onClick={advanceTourNextStop}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold py-1 px-2 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>المحطة التالية ➔</span>
                      </button>

                      <button
                        onClick={() => {
                          const activeSub = tourWaypoints[activeTourIndex];
                          if (activeSub) {
                            setSelectedSubForReading(activeSub);
                            setReadingInputVal('');
                          }
                        }}
                        className="bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/30 font-bold py-1 px-1.5 rounded-lg text-[10px] flex items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>قراءة</span>
                      </button>

                      <button
                        onClick={copyTourManifestText}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold py-1 px-1.5 rounded-lg text-[10px] flex items-center justify-center gap-0.5 transition-all cursor-pointer"
                        title="مشاركة جدول الجولة عبر الواتساب"
                      >
                        <Share2 className="w-3 h-3 text-emerald-400" />
                        <span>واتساب</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (!routeInfo) return;
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${routeInfo.startCoords[0]},${routeInfo.startCoords[1]}&destination=${routeInfo.endCoords[0]},${routeInfo.endCoords[1]}&travelmode=${travelMode}`;
                          window.open(url, '_blank');
                        }}
                        className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold py-1 px-2 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Google Maps</span>
                      </button>

                      <button
                        onClick={() => {
                          if (routeDestinationSub) {
                            setSelectedSubForReading(routeDestinationSub);
                            setReadingInputVal('');
                          }
                        }}
                        className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 font-extrabold py-1 px-2 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>إدخال القراءة</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>



        {/* Directions Quick Selector Overlay Drawer */}
        <AnimatePresence>
          {isDirectionsMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-16 sm:bottom-20 right-2 sm:right-16 left-2 sm:left-auto z-[600] bg-slate-950/98 backdrop-blur-2xl border border-sky-500/50 p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-2xl w-auto sm:w-80 max-w-[calc(100vw-16px)] sm:max-w-xs max-h-[330px] sm:max-h-[380px] flex flex-col gap-2 text-right pointer-events-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin-slow shrink-0" />
                  <h4 className="font-extrabold text-[11px] sm:text-xs text-white">مرشد الملاحة وجولات الجباية</h4>
                </div>
                <button
                  onClick={() => setIsDirectionsMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Auto-Tour Preset Buttons - Sorted By Proximity */}
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] text-amber-400 font-black flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>جولات الجباية (مرتبة حسب الأقرب 📍):</span>
                  </span>
                  <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    مسار متسلسل ذكي
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleStartAutoTour(5, 'nearest')}
                    className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500 hover:to-teal-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                    title="جولة لأقرب 5 عدادات جغرافياً من موقعك الفعلي"
                  >
                    <Route className="w-3 h-3 text-emerald-400" />
                    <span>أقرب 5 عدادات</span>
                  </button>

                  <button
                    onClick={() => handleStartAutoTour(10, 'nearest')}
                    className="p-1.5 rounded-lg bg-gradient-to-r from-sky-500/20 to-blue-500/20 hover:from-sky-500 hover:to-blue-500 text-sky-300 hover:text-slate-950 border border-sky-500/30 text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                    title="جولة لأقرب 10 عدادات جغرافياً من موقعك الفعلي"
                  >
                    <Compass className="w-3 h-3 text-sky-400" />
                    <span>أقرب 10 عدادات</span>
                  </button>

                  <button
                    onClick={() => handleStartAutoTour(5, 'debt')}
                    className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                    title="أعلى المديونيات مرتبة بالأقرب مكاناً لك"
                  >
                    <ListOrdered className="w-3 h-3 text-amber-400" />
                    <span>أعلى المديونيات</span>
                  </button>
                </div>

                <button
                  onClick={() => handleStartAutoTour(validSubscribers.length, 'nearest')}
                  className="w-full py-1 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-2.5 h-2.5 text-amber-400 rotate-45" />
                  <span>جولة شاملة لكافة العدادات ({validSubscribers.length} عداد) مرتبة بالأقرب</span>
                </button>
              </div>

              {/* Single Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute right-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="ابحث عن مشترك بالاسم أو رقم العداد..."
                  value={directionsSearchQuery}
                  onChange={(e) => setDirectionsSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-7 pl-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="overflow-y-auto flex-1 space-y-1 pr-1 custom-scrollbar">
                {(() => {
                  const startLoc: [number, number] = userLocation || (mapInstanceRef.current ? [mapInstanceRef.current.getCenter().lat, mapInstanceRef.current.getCenter().lng] : [15.3694, 44.1910]);
                  
                  return validSubscribers
                    .filter(s => 
                      s.name.toLowerCase().includes(directionsSearchQuery.toLowerCase()) ||
                      s.id.toLowerCase().includes(directionsSearchQuery.toLowerCase()) ||
                      (s.meterNumber && s.meterNumber.toLowerCase().includes(directionsSearchQuery.toLowerCase()))
                    )
                    .sort((a, b) => {
                      if (!a.coordinates || !b.coordinates) return 0;
                      const distA = getGeodesicDistanceMeters(startLoc[0], startLoc[1], a.coordinates.lat, a.coordinates.lng);
                      const distB = getGeodesicDistanceMeters(startLoc[0], startLoc[1], b.coordinates.lat, b.coordinates.lng);
                      return distA - distB;
                    })
                    .map(sub => {
                      const isDebt = sub.currentBalance > 0;
                      const distMeters = sub.coordinates ? Math.round(getGeodesicDistanceMeters(startLoc[0], startLoc[1], sub.coordinates.lat, sub.coordinates.lng)) : null;
                      const distText = distMeters !== null ? (distMeters >= 1000 ? `${(distMeters / 1000).toFixed(1)} كم` : `${distMeters} م`) : '';

                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleStartDirections(sub)}
                          className="p-2 rounded-lg bg-slate-900/80 hover:bg-sky-950/50 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer flex items-center justify-between gap-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] font-bold text-slate-200 truncate">{sub.name}</p>
                              {distText && (
                                <span className="text-[8px] bg-slate-800 text-amber-400 font-mono font-bold px-1 py-0.2 rounded border border-slate-700 shrink-0">
                                  {distText}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-slate-400">
                              <span>عداد: <strong className="text-sky-400 font-mono">{sub.meterNumber || 'غير مسجل'}</strong></span>
                              <span className={isDebt ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                {isDebt ? `${sub.currentBalance.toLocaleString()} ر.ي` : 'خالي'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded-md border border-sky-500/30 flex items-center gap-0.5 shrink-0">
                            <Navigation className="w-2.5 h-2.5 rotate-45" />
                            <span>توجيه</span>
                          </span>
                        </div>
                      );
                    });
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Right Side: Premium Interactive Sidebar (Subscribers Search Directory) */}
      <div className={`bg-slate-950/95 backdrop-blur-md border-r border-slate-800/80 w-full md:w-[320px] lg:w-[350px] shrink-0 flex flex-col h-full order-2 md:order-1 ${
        mobileTab === 'directory' ? 'flex' : 'hidden md:flex'
      }`} dir="rtl">
        {/* Sidebar Header */}
        <div className="p-2.5 sm:p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <h3 className="font-extrabold text-slate-200 text-xs sm:text-sm">دليل مواقع المشتركين</h3>
          </div>
          <span className="text-[9px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
            {activeDirectoryTab === 'registered' ? `${filteredSubscribers.length} من ${validSubscribers.length}` : `${filteredUnregisteredSubscribers.length} من ${unregisteredSubscribers.length}`}
          </span>
        </div>

        {/* Directory Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-800/60 bg-slate-900/20 p-1 gap-1 text-center">
          <button
            onClick={() => setActiveDirectoryTab('registered')}
            className={`py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeDirectoryTab === 'registered'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>على الخريطة ({filteredSubscribers.length})</span>
          </button>
          <button
            onClick={() => setActiveDirectoryTab('unregistered')}
            className={`py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeDirectoryTab === 'unregistered'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <MapPinOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>بدون موقع ({filteredUnregisteredSubscribers.length})</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="p-2 sm:p-2.5 border-b border-slate-800/60 relative">
          <input
            type="text"
            placeholder="البحث بالاسم، رقم العداد، الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-8 pl-2.5 py-1 bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg text-[11px] sm:text-xs text-slate-200 focus:outline-none transition-all placeholder:text-slate-500 font-medium text-right"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-4.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Directory List Container */}
        <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1 sm:space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {activeDirectoryTab === 'registered' ? (
            filteredSubscribers.length > 0 ? (
              filteredSubscribers.map((sub) => {
                const isDebt = sub.currentBalance > 0;
                const subColor = isDebt ? (sub.currentBalance > 10000 ? 'border-rose-500/40 bg-rose-500/5' : 'border-amber-500/40 bg-amber-500/5') : 'border-emerald-500/40 bg-emerald-500/5';
                const textBadgeColor = isDebt ? (sub.currentBalance > 10000 ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10') : 'text-emerald-400 bg-emerald-500/10';
                
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubscriber(sub)}
                    className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border ${subColor} hover:border-amber-500 hover:bg-slate-900/60 transition-all cursor-pointer text-right flex flex-col gap-0.5 sm:gap-1`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-slate-200 text-[11px] sm:text-xs truncate max-w-[150px] sm:max-w-[170px]">{sub.name}</span>
                      <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded ${textBadgeColor}`}>
                        {sub.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                      <span>المنطقة: {sub.zone || 'غير محدد'}</span>
                      <span>عداد: <span className="font-mono font-bold text-slate-300">{sub.meterNumber || 'غير مسجل'}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                      <span className="text-slate-500">الرصيد:</span>
                      <span className={`font-mono font-bold ${isDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {sub.currentBalance.toLocaleString()} ريال
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5 pt-1 border-t border-slate-900/40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubForReading(sub);
                          setReadingInputVal('');
                        }}
                        className="flex-1 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-[8px] sm:text-[9px] font-bold transition-all flex items-center justify-center gap-0.5 active:scale-95 border border-emerald-500/20 cursor-pointer"
                        title="تسجيل قراءة العداد الحالية"
                      >
                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                        <span>القراءة</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDirections(sub);
                        }}
                        className="flex-1 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-950 text-[8px] sm:text-[9px] font-bold transition-all flex items-center justify-center gap-0.5 active:scale-95 border border-sky-500/20 cursor-pointer"
                        title="حساب الاتجاهات والملاحة إلى هذا العداد"
                      >
                        <Compass className="w-2.5 h-2.5 text-sky-400" />
                        <span>الاتجاهات</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubForLocationAssign(sub);
                          setClickedLocationToAssign(null);
                        }}
                        className="flex-1 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-[8px] sm:text-[9px] font-bold transition-all flex items-center justify-center gap-0.5 active:scale-95 border border-amber-500/20 cursor-pointer"
                        title="تغيير موقع المنزل على الخريطة"
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        <span>الموقع</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
                <MapPin className="w-6 h-6 stroke-[1.5] text-slate-700 mb-1 animate-bounce" />
                <p className="text-[11px] font-bold">لا يوجد مشتركين مطابقين للبحث</p>
                <p className="text-[9px] text-slate-600 mt-0.5">تأكد من كتابة الاسم بشكل صحيح أو تزويدهم بإحداثيات موقع أولاً.</p>
              </div>
            )
          ) : (
            filteredUnregisteredSubscribers.length > 0 ? (
              filteredUnregisteredSubscribers.map((sub) => {
                const isDebt = sub.currentBalance > 0;
                const subColor = isDebt ? (sub.currentBalance > 10000 ? 'border-rose-500/40 bg-rose-500/5' : 'border-amber-500/40 bg-amber-500/5') : 'border-emerald-500/40 bg-emerald-500/5';
                const textBadgeColor = isDebt ? (sub.currentBalance > 10000 ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10') : 'text-emerald-400 bg-emerald-500/10';
                
                return (
                  <div
                    key={sub.id}
                    className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border ${subColor} hover:border-amber-500 hover:bg-slate-900/60 transition-all text-right flex flex-col gap-0.5 sm:gap-1`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-slate-200 text-[11px] sm:text-xs truncate max-w-[150px] sm:max-w-[170px]">{sub.name}</span>
                      <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded ${textBadgeColor}`}>
                        {sub.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                      <span>المنطقة: {sub.zone || 'غير محدد'}</span>
                      <span>عداد: <span className="font-mono font-bold text-slate-300">{sub.meterNumber || 'غير مسجل'}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                      <span className="text-slate-500">الرصيد:</span>
                      <span className={`font-mono font-bold ${isDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {sub.currentBalance.toLocaleString()} ريال
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5 pt-1 border-t border-slate-900/40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubForReading(sub);
                          setReadingInputVal('');
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-[8px] sm:text-[9px] font-bold transition-all flex items-center gap-0.5 active:scale-95 border border-emerald-500/20 cursor-pointer"
                      >
                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                        <span>إدخال القراءة</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubForLocationAssign(sub);
                          setClickedLocationToAssign(null);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-[8px] sm:text-[9px] font-bold transition-all flex items-center gap-0.5 active:scale-95 border border-emerald-500/20 cursor-pointer"
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        <span>تحديد الموقع</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
                <MapPinOff className="w-6 h-6 stroke-[1.5] text-slate-700 mb-1" />
                <p className="text-[11px] font-bold">كل المشتركين تم تحديد موقعهم!</p>
                <p className="text-[9px] text-slate-600 mt-0.5">كافة الحسابات والبيوت في النظام لديها مواقع مسجلة بدقة.</p>
              </div>
            )
          )}
        </div>

        {/* Color Legend Footer */}
        <div className="p-2 sm:p-2.5 bg-slate-900/40 border-t border-slate-800/80 text-[8px] sm:text-[9px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300">دليل الألوان والحالة:</span>
            <span className="text-[8px] text-slate-500">تفاعلي</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
              <span>سليم</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"></span>
              <span>مدين</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]"></span>
              <span>حرج</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {readingSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] bg-emerald-500 text-slate-950 px-5 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <Check className="w-5 h-5 bg-slate-950 text-emerald-400 p-0.5 rounded-full" />
            <span>{readingSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Reading Entry Modal Overlay */}
      <AnimatePresence>
        {selectedSubForReading && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl text-right flex flex-col gap-4 text-white"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Zap className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">تسجيل القراءة الحالية عبر الخريطة</h3>
                    <p className="text-[11px] text-slate-400">إدخال مباشر لقراءة العداد وتوليد فاتورة الاستهلاك</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubForReading(null)}
                  className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subscriber Summary Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">اسم المشترك</span>
                  <span className="font-extrabold text-amber-400 truncate block">{selectedSubForReading.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">رقم العداد</span>
                  <span className="font-mono font-bold text-slate-200">{selectedSubForReading.meterNumber || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">المنطقة والحي</span>
                  <span className="text-slate-300 font-bold">{selectedSubForReading.zone}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">القراءة السابقة المسجلة</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">{selectedSubForReading.currentReading.toLocaleString()} ك.و</span>
                </div>
              </div>

              {/* Reading Input Form */}
              <form onSubmit={handleSaveMapReading} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>القراءة الحالية الجديدة:</span>
                    <span className="text-[10px] text-amber-400">يجب أن تكون ≥ {selectedSubForReading.currentReading}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      autoFocus
                      placeholder="أدخل القراءة الحالية على العداد..."
                      value={readingInputVal}
                      onChange={(e) => setReadingInputVal(e.target.value)}
                      className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-lg font-mono font-bold text-amber-400 outline-none transition-all placeholder:text-slate-600 placeholder:text-xs"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">ك.و.س</span>
                  </div>
                </div>

                {/* Live Bill Calculations */}
                {parseFloat(readingInputVal) >= selectedSubForReading.currentReading && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">الاستهلاك الميداني الصافي:</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {(parseFloat(readingInputVal) - selectedSubForReading.currentReading).toLocaleString()} ك.و.س
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-emerald-500/20 pt-2">
                      <span className="text-slate-300">إجمالي الفاتورة التقديرية:</span>
                      <span className="font-mono font-black text-amber-400 text-base">
                        {(() => {
                          const consumption = parseFloat(readingInputVal) - selectedSubForReading.currentReading;
                          const tType = selectedSubForReading.tariffType || 'residential';
                          const rate = settings?.tariffs ? ((settings.tariffs as any)[tType] ?? settings.tariffs.residential ?? 0) : 0;
                          const fixedFee = settings?.fixedFee ?? 0;
                          const serviceFee = settings?.serviceFee ?? 0;
                          const taxPercent = settings?.taxPercent ?? 0;
                          const cost = consumption * rate;
                          const tax = (cost * taxPercent) / 100;
                          const total = cost + fixedFee + serviceFee + tax;
                          return total.toLocaleString() + ' ' + (settings?.currency || 'ريال');
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>حفظ القراءة وإصدار الفاتورة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubForReading(null)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compass Calibration Modal */}
      <AnimatePresence>
        {showCompassModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 overflow-hidden"
            >
              {/* Ambient Background Glows */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>معايرة دقة البوصلة الاتجاهية</span>
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                        شعاع 90°
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">تعديل زاوية انحراف الحساسات وإزالة التداخل المغناطيسي</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompassModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Compass Preview Dial Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  {/* Outer Dial Circle */}
                  <div className="absolute inset-0 rounded-full border-2 border-slate-700/80 bg-slate-900/90 shadow-inner flex items-center justify-center">
                    <span className="absolute top-1 text-[10px] font-black text-amber-400">N</span>
                    <span className="absolute bottom-1 text-[10px] font-bold text-slate-500">S</span>
                    <span className="absolute right-1 text-[10px] font-bold text-slate-500">E</span>
                    <span className="absolute left-1 text-[10px] font-bold text-slate-500">W</span>
                  </div>

                  {/* Animated 90-Degree Beam Fan in Compass Dial */}
                  <div
                    style={{
                      transform: `rotate(${userHeading}deg)`,
                      transition: 'transform 0.3s cubic-bezier(0.1,0.7,0.1,1)'
                    }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <path
                        d="M 50 50 L 21.7 21.7 A 40 40 0 0 1 78.3 21.7 Z"
                        fill="rgba(56,189,248,0.35)"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                      <line x1="50" y1="50" x2="50" y2="10" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Center Dot */}
                  <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-950 z-10 shadow-lg"></div>
                </div>

                <div className="flex-1 space-y-2 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold">الاتجاه المباشر الحالي:</span>
                    <span className="text-lg font-black text-amber-400 font-mono dir-ltr">{userHeading}°</span>
                  </div>
                  <div className="text-xs font-bold text-sky-300 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl">
                    {getArabicDirectionName(userHeading)}
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span>قراءة الحساس الخام:</span>
                      <span className="font-mono text-slate-300">{rawCompassHeading !== null ? `${rawCompassHeading}°` : 'غير متاح'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إزاحة المعايرة اليدوية:</span>
                      <span className={`font-mono font-bold ${compassOffset !== 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {compassOffset > 0 ? `+${compassOffset}` : compassOffset}°
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Figure-8 Motion Sensor Calibration Instruction */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <RotateCcw className="w-4 h-4 animate-spin-slow text-amber-400 shrink-0" />
                  <span>الخطوة 1: المعايرة الحركية للهاتف (حركة رقم 8)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  لإعادة ضبط البوصلة الحساسة في جهازك، قم بمسك الهاتف وتحريكه في الهواء برسم مجسم شكل اللانهائية <strong>(8)</strong> عدة مرات متتالية لإزاحة الشحنات المغناطيسية الساكنة.
                </p>
                
                {/* Figure-8 Animation Canvas / SVG */}
                <div className="flex items-center justify-center py-2 bg-slate-950/50 rounded-xl border border-slate-800">
                  <svg width="140" height="40" viewBox="0 0 140 40" className="overflow-visible">
                    <path
                      d="M 35 20 C 15 5, 15 35, 35 20 C 55 5, 55 35, 35 20 Z M 105 20 C 85 5, 85 35, 105 20 C 125 5, 125 35, 105 20 Z"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                    <circle cx="35" cy="20" r="4" fill="#38bdf8" className="animate-ping" />
                    <circle cx="105" cy="20" r="4" fill="#38bdf8" />
                  </svg>
                </div>
              </div>

              {/* Section 2: Manual Angular Offset Fine-Tuning Slider */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>الخطوة 2: ضبط الإزاحة والتعديل اليدوي للزاوية</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 font-bold">
                    {compassOffset > 0 ? `+${compassOffset}` : compassOffset}°
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  إذا لاحظت أن شعاع البوصلة منحرف عن الاتجاه الحقيقي للشارع، استخدم الشريط أدناه لضبط الانحراف بالضبط.
                </p>

                {/* Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={compassOffset}
                    onChange={(e) => setCompassOffset(parseInt(e.target.value) || 0)}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>-180°</span>
                    <span>-90°</span>
                    <span>0°</span>
                    <span>+90°</span>
                    <span>+180°</span>
                  </div>
                </div>

                {/* Quick Step Buttons */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCompassOffset(prev => Math.max(-180, prev - 10))}
                    className="py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    -10°
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompassOffset(prev => Math.max(-180, prev - 1))}
                    className="py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    -1°
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompassOffset(0)}
                    className="py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-[10px] font-bold border border-amber-500/40 transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="تصفير الإزاحة"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>0°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompassOffset(prev => Math.min(180, prev + 1))}
                    className="py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    +1°
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompassOffset(prev => Math.min(180, prev + 10))}
                    className="py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    +10°
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompassModal(false)}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>حفظ واعتماد التعديل</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompassOffset(0);
                    setShowCompassModal(false);
                  }}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 transition-all cursor-pointer"
                >
                  إعادة الضبط المصنعي
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Road Drawing Control Bar */}
      <AnimatePresence>
        {isRoadDrawingMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-[700] bg-slate-950/98 backdrop-blur-2xl border-2 border-amber-500/80 px-3 py-2 rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-[92%] sm:w-auto text-right flex flex-col gap-1.5 text-white pointer-events-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Route className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-400 flex items-center gap-1">
                    <span>تخطيط الأزقة والشوارع الفرعية</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">وضع الرسم</span>
                  </h4>
                  <p className="text-[9px] text-slate-300">انقر على الأزقة والممرات الفرعية على الخريطة لرسم مسارها</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsRoadDrawingMode(false);
                  setCurrentDrawingPoints([]);
                }}
                className="p-1 rounded-full bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-all border border-slate-800 cursor-pointer"
                title="إلغاء التخطيط"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stats & Actions */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">
                  النقاط: <strong className="text-amber-400">{currentDrawingPoints.length}</strong>
                </span>
                {currentDrawingPoints.length >= 2 && (
                  <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-emerald-400 font-bold">
                    {Math.round(currentDrawingPoints.reduce((acc, pt, idx) => {
                      if (idx === 0) return 0;
                      return acc + L.latLng(currentDrawingPoints[idx - 1]).distanceTo(L.latLng(pt));
                    }, 0))} متر
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {currentDrawingPoints.length > 0 && (
                  <button
                    onClick={() => setCurrentDrawingPoints(prev => prev.slice(0, -1))}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                    title="تراجع عن آخر نقطة تم انقر عليها"
                  >
                    تراجع ↩
                  </button>
                )}

                <button
                  onClick={() => {
                    setNewRoadName(`زقاق فرعي ${customRoads.length + 1}`);
                    setIsRoadSaveModalOpen(true);
                  }}
                  disabled={currentDrawingPoints.length < 2}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all shadow-md cursor-pointer ${
                    currentDrawingPoints.length >= 2
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3 h-3" />
                  <span>حفظ الشارع 💾</span>
                </button>

                <button
                  onClick={() => setIsRoadsListModalOpen(true)}
                  className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/30 text-[10px] font-bold transition-all cursor-pointer"
                  title="عرض قائمة الأزقة المخططة مسبقاً"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Custom Road Modal */}
      <AnimatePresence>
        {isRoadSaveModalOpen && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-slate-950 border-2 border-amber-500/60 p-4 sm:p-5 rounded-3xl shadow-2xl max-w-sm w-full text-white space-y-4 text-right"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Route className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">حفظ وتسمية الشارع / الزقاق المخطط</h3>
                    <p className="text-[10px] text-slate-400">سيتم اعتماد هذا الشارع في حساب المسارات للملاحة</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRoadSaveModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Road Name Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم الشارع أو الزقاق:</label>
                  <input
                    type="text"
                    value={newRoadName}
                    onChange={(e) => setNewRoadName(e.target.value)}
                    placeholder="مثال: زقاق بيت الباشا، طريق ترابي 1..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['زقاق فرعي 1', 'طريق ترابي 1', 'شارع خلفي', 'ممر بين المنازل', 'زقاق المحول'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewRoadName(preset)}
                        className="text-[9px] bg-slate-900 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 px-2 py-0.5 rounded-lg border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Road Type Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">تصنيف الشارع / الطريق:</label>
                  <select
                    value={newRoadType}
                    onChange={(e) => setNewRoadType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="alley">زقاق ضيق / ممر بين المنازل</option>
                    <option value="dirt_path">طريق فرعي ترابي</option>
                    <option value="side_street">شارع فرعي أسفلتي</option>
                    <option value="shortcut">اختصار ممر دراجة نارية</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">ملاحظات توجيهية (اختياري):</label>
                  <textarea
                    value={newRoadNotes}
                    onChange={(e) => setNewRoadNotes(e.target.value)}
                    placeholder="مثال: ممر ضيق جداً مناسب للدراجات فقط..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 h-16 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveCurrentRoad}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتفعيل في الملاحة 🎯</span>
                </button>
                <button
                  onClick={() => setIsRoadSaveModalOpen(false)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Roads List Modal */}
      <AnimatePresence>
        {isRoadsListModalOpen && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-slate-950 border-2 border-sky-500/60 p-4 sm:p-5 rounded-3xl shadow-2xl max-w-md w-full text-white space-y-3 text-right max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <ListOrdered className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">الشوارع والأزقة المخططة مسبقاً</h3>
                    <p className="text-[10px] text-slate-400">إجمالي الأزقة المعتمَدة في التوجيه: {customRoads.length}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRoadsListModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {customRoads.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                    <Route className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                    <p>لا توجد شوارع أو أزقة فرعية مخططَة حتى الآن.</p>
                    <button
                      onClick={() => {
                        setIsRoadsListModalOpen(false);
                        setIsRoadDrawingMode(true);
                      }}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                    >
                      + البدء بتخطيط أول زقاق الآن
                    </button>
                  </div>
                ) : (
                  customRoads.map((road) => {
                    let distMeters = 0;
                    for (let i = 0; i < road.path.length - 1; i++) {
                      distMeters += L.latLng(road.path[i]).distanceTo(L.latLng(road.path[i + 1]));
                    }

                    return (
                      <div key={road.id} className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate">{road.name}</h4>
                            <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 shrink-0 font-bold">
                              {road.type === 'alley' ? 'زقاق ضيق' : road.type === 'dirt_path' ? 'طريق ترابي' : road.type === 'side_street' ? 'شارع فرعي' : 'اختصار'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            الطول: <strong className="text-emerald-400 font-mono">{Math.round(distMeters)} م</strong> | النقاط: {road.path.length}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              if (mapInstanceRef.current && road.path.length > 0) {
                                const bounds = L.latLngBounds(road.path);
                                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
                                setIsRoadsListModalOpen(false);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 transition-all border border-sky-500/30 cursor-pointer"
                            title="تركيز الخريطة على هذا الطريق"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => deleteCustomRoad(road.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white transition-all border border-rose-500/30 cursor-pointer"
                            title="حذف هذا الطريق"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 shrink-0 flex gap-2">
                <button
                  onClick={() => {
                    setIsRoadsListModalOpen(false);
                    setIsRoadDrawingMode(true);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  + تخطيط شارع / زقاق جديد
                </button>
                <button
                  onClick={() => setIsRoadsListModalOpen(false)}
                  className="px-3 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Alley Scanner Scanning Banner */}
      <AnimatePresence>
        {isScanningAIAlleys && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[800] bg-purple-950/98 backdrop-blur-2xl border-2 border-purple-500/80 px-4 py-3 rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-[92%] sm:w-auto text-right flex items-center gap-3 text-white pointer-events-auto"
            dir="rtl"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300 shrink-0">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                <span>مسح كاشف الممرات بالأقمار الصناعية</span>
                <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded border border-purple-400/40">AI Vision</span>
              </h4>
              <p className="text-[10px] text-purple-300 mt-0.5 animate-pulse">جاري تحليل الصور الجوية واكتشاف الممرات بين المباني والفلل...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Detected Alleys Modal */}
      <AnimatePresence>
        {isAiAlleysModalOpen && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-slate-950 border-2 border-purple-500/80 p-4 sm:p-5 rounded-3xl shadow-2xl max-w-lg w-full text-white space-y-3 text-right max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>نتائج كشف الممرات بالذكاء الاصطناعي</span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-mono">
                        {aiDetectedAlleys.length} ممر مكتشف
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400">تحليل الصور الجوية الفضائية للممرات الترابية بين الفلل</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiAlleysModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Upload image for analysis option */}
              <div className="p-2.5 bg-slate-900/80 border border-purple-500/30 rounded-2xl flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 text-xs text-purple-200">
                  <Share2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-[11px] font-medium">تحليل صورة خريطة جوية مرفقة (Google Maps Screenshot)</span>
                </div>
                <label className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold cursor-pointer transition-all border border-purple-400 flex items-center gap-1.5 shadow-md shadow-purple-600/30">
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>رفع صورة الخريطة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadAndScan}
                    className="hidden"
                  />
                </label>
              </div>

              {aiScanErrorMessage && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{aiScanErrorMessage}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {aiDetectedAlleys.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
                    <p>لم يتم العثور على أزقة جديدة في هذا النطاق، جرب تحريك الخريطة وإعادة المسح.</p>
                  </div>
                ) : (
                  aiDetectedAlleys.map((alley) => {
                    let distMeters = 0;
                    for (let i = 0; i < alley.path.length - 1; i++) {
                      distMeters += L.latLng(alley.path[i]).distanceTo(L.latLng(alley.path[i + 1]));
                    }

                    return (
                      <div key={alley.id} className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                            <h4 className="text-xs font-extrabold text-purple-200">{alley.name}</h4>
                          </div>
                          <span className="text-[9px] bg-purple-500/30 text-purple-200 font-extrabold px-2 py-0.5 rounded-lg border border-purple-400/40">
                            ✨ {alley.confidence}% ثقة AI
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 leading-relaxed">
                          {alley.description}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <div className="text-[10px] text-slate-400 font-mono">
                            المسافة: <strong className="text-emerald-400">{Math.round(distMeters)} م</strong> | النقاط: {alley.path.length}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (mapInstanceRef.current && alley.path.length > 0) {
                                  const bounds = L.latLngBounds(alley.path);
                                  mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 text-[10px] font-bold transition-all border border-sky-500/30 cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>معاينة</span>
                            </button>

                            <button
                              onClick={() => adoptAiAlley(alley)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold transition-all border border-purple-400 shadow-md shadow-purple-600/30 cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>اعتماد الممر ➕</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 shrink-0 flex gap-2">
                {aiDetectedAlleys.length > 0 && (
                  <button
                    onClick={adoptAllAiAlleys}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>اعتماد جميع الأزقة المكتشفة ({aiDetectedAlleys.length}) 🚀</span>
                  </button>
                )}
                <button
                  onClick={() => setIsAiAlleysModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-xs transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GPS Live Recording Active Banner */}
      <AnimatePresence>
        {isGpsRecording && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[800] bg-slate-950/98 backdrop-blur-2xl border-2 border-emerald-500/80 px-4 py-3 rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-[92%] sm:w-auto text-right flex items-center gap-3 text-white pointer-events-auto"
            dir="rtl"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
              <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>جاري تسجيل المسار الحي أثناء القيادة (GPS)...</span>
              </h4>
              <p className="text-[10px] text-slate-300 mt-0.5 font-mono">
                المسافة: <strong className="text-emerald-400 font-black">{Math.round(gpsRecordDistanceMeters)} م</strong> | النقاط: {gpsRecordedPoints.length}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleStopAndSaveGpsBreadcrumbs}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold transition-all border border-emerald-400 shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ الشارع 💾</span>
              </button>
              <button
                onClick={handleCancelGpsRecording}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 cursor-pointer"
                title="إلغاء التسجيل"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS Save Recorded Road Modal */}
      <AnimatePresence>
        {isGpsSaveModalOpen && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-slate-950 border-2 border-emerald-500/80 p-5 rounded-3xl shadow-2xl max-w-md w-full text-white space-y-4 text-right"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">حفظ المسار الحي المسجل بالـ GPS</h3>
                    <p className="text-[10px] text-slate-400">تحويل النقاط الميدانية المسجلة إلى شارع رسمي للملاحة</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGpsSaveModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-200 text-[11px] flex justify-between items-center font-mono">
                  <span>المسافة المسجلة: <strong className="text-emerald-400 text-xs">{Math.round(gpsRecordDistanceMeters)} متر</strong></span>
                  <span>عدد النقاط: <strong className="text-emerald-400 text-xs">{gpsRecordedPoints.length} نقطة</strong></span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">اسم الشارع أو الزقاق:</label>
                  <input
                    type="text"
                    value={gpsRoadName}
                    onChange={e => setGpsRoadName(e.target.value)}
                    placeholder="مثال: زقاق الفلل الخلفي..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">نوع الطريق / الزقاق:</label>
                  <select
                    value={gpsRoadType}
                    onChange={e => setGpsRoadType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none font-medium"
                  >
                    <option value="dirt_path">طريق / ممر ترابي (Dirt Track)</option>
                    <option value="alley">زقاق ضيق بين الفلل (Narrow Alley)</option>
                    <option value="shortcut">اختصار فرعي للماشين والسيارات (Shortcut)</option>
                    <option value="side_street">شارع فرعي جانبي (Side Street)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">ملاحظات وصفية (اختياري):</label>
                  <textarea
                    value={gpsRoadNotes}
                    onChange={e => setGpsRoadNotes(e.target.value)}
                    placeholder="أي معلومات هامة للمحصلين الميدانيين..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none font-medium resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex gap-2">
                <button
                  onClick={handleConfirmSaveGpsRoad}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد وحفظ الشارع 💾</span>
                </button>
                <button
                  onClick={() => setIsGpsSaveModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SubscribersMap: React.FC<SubscribersMapProps> = (props) => {
  return (
    <div className="w-full h-full">
      <LeafletSubscribersMap {...props} />
    </div>
  );
};

export default SubscribersMap;
