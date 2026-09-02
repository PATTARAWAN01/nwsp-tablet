import { 
  generateSampleDevices, 
  INITIAL_ACADEMIC_YEAR, 
  INITIAL_INSPECTION_ROUND,
  DEFAULT_ROOM_PINS
} from './sampleData';

import { db, isFirebaseActive } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

const DEVICES_KEY = 'nwsp_tablet_devices';
const CONFIG_KEY = 'nwsp_tablet_config';
const PINS_KEY = 'nwsp_tablet_pins';
const SYSTEM_KEY = 'nwsp_tablet_system';
const INSPECTIONS_KEY = 'nwsp_tablet_inspections';
const LOGS_KEY = 'nwsp_tablet_logs';

export const DEFAULT_REPORT_SIGNATURES = [
  { id: 'sig_1', title: 'ผู้รับรองรายงาน / หัวหน้าโครงการ', name: 'นายสุริยันต์ วงษ์คำสี' }
];

const getLocalData = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocalData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Helper: Standardized Grade & Room Grouping Sorter
export const sortDevicesByGradeAndRoom = (devicesList) => {
  if (!Array.isArray(devicesList)) return [];

  const gradeOrder = { 'ม.4': 1, 'ม.5': 2, 'ม.6': 3, 'ครู': 4 };

  return [...devicesList].sort((a, b) => {
    // 1. Sort by type (students first, teachers last)
    const typeA = a.type === 'teacher' ? 2 : 1;
    const typeB = b.type === 'teacher' ? 2 : 1;
    if (typeA !== typeB) return typeA - typeB;

    // 2. Sort by grade (ม.4 -> ม.5 -> ม.6)
    const gA = gradeOrder[a.grade] || 99;
    const gB = gradeOrder[b.grade] || 99;
    if (gA !== gB) return gA - gB;

    // 3. Sort by room (1 -> 2 -> 3 -> 4)
    const rA = parseInt(a.room, 10) || 0;
    const rB = parseInt(b.room, 10) || 0;
    if (rA !== rB) return rA - rB;

    // 4. Sort within room by student first_name & last_name (Thai locale)
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`;
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`;
    return nameA.localeCompare(nameB, 'th');
  });
};

export const deviceService = {
  
  // Initialize sample data into Firestore/LocalStorage on first run
  initDataIfEmpty: async () => {
    if (isFirebaseActive && db) {
      try {
        // Check central Firestore system initialization status doc
        const sysDocRef = doc(db, "settings", "system");
        const sysDocSnap = await getDoc(sysDocRef);
        const sysData = sysDocSnap.exists() ? sysDocSnap.data() : null;

        // 1. Config doc
        const configDoc = await getDoc(doc(db, "settings", "config"));
        if (!configDoc.exists()) {
          const defaultConfig = {
            academic_years: ["2569"],
            current_academic_year: INITIAL_ACADEMIC_YEAR,
            current_round: INITIAL_INSPECTION_ROUND,
            admin_password: "nwsp1234",
            report_signatures: DEFAULT_REPORT_SIGNATURES
          };
          await setDoc(doc(db, "settings", "config"), defaultConfig);
          setLocalData(CONFIG_KEY, defaultConfig);
        } else {
          setLocalData(CONFIG_KEY, configDoc.data());
        }

        // 2. Pins doc
        const pinsDoc = await getDoc(doc(db, "settings", "pins"));
        if (!pinsDoc.exists()) {
          await setDoc(doc(db, "settings", "pins"), DEFAULT_ROOM_PINS);
          setLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
        } else {
          setLocalData(PINS_KEY, pinsDoc.data());
        }

        // 3. Devices doc check
        if (!sysData) {
          const devSnap = await getDocs(collection(db, "devices"));
          if (devSnap.empty) {
            const samples = generateSampleDevices();
            const sortedSamples = sortDevicesByGradeAndRoom(samples);
            const batch = writeBatch(db);
            sortedSamples.forEach(d => {
              batch.set(doc(db, "devices", d.id), d);
            });
            await batch.commit();
            setLocalData(DEVICES_KEY, sortedSamples);
          }
          await setDoc(sysDocRef, { initialized: true, cleared: false });
          setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
        } else if (sysData.cleared === true) {
          setLocalData(DEVICES_KEY, []);
          setLocalData(INSPECTIONS_KEY, {});
          setLocalData(SYSTEM_KEY, sysData);
        } else {
          const devSnap = await getDocs(collection(db, "devices"));
          const mapList = [];
          devSnap.forEach(d => mapList.push(d.data()));
          setLocalData(DEVICES_KEY, sortDevicesByGradeAndRoom(mapList));
        }

      } catch (e) {
        console.error("Firestore initDataIfEmpty error:", e);
      }
    } else {
      // Fallback Local Storage initialization
      const localSys = getLocalData(SYSTEM_KEY, null);
      if (!localSys) {
        const samples = generateSampleDevices();
        const sortedSamples = sortDevicesByGradeAndRoom(samples);
        setLocalData(DEVICES_KEY, sortedSamples);
        setLocalData(CONFIG_KEY, {
          academic_years: ["2569"],
          current_academic_year: INITIAL_ACADEMIC_YEAR,
          current_round: INITIAL_INSPECTION_ROUND,
          admin_password: "nwsp1234",
          report_signatures: DEFAULT_REPORT_SIGNATURES
        });
        setLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
        setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
      }
    }
  },

  getConfig: async () => {
    await deviceService.initDataIfEmpty();
    if (isFirebaseActive && db) {
      try {
        const configDoc = await getDoc(doc(db, "settings", "config"));
        if (configDoc.exists()) {
          const cfg = configDoc.data();
          setLocalData(CONFIG_KEY, cfg);
          return cfg;
        }
      } catch (e) {
        console.error("getConfig error:", e);
      }
    }
    return getLocalData(CONFIG_KEY, {
      academic_years: ["2569"],
      current_academic_year: INITIAL_ACADEMIC_YEAR,
      current_round: INITIAL_INSPECTION_ROUND,
      admin_password: "nwsp1234",
      report_signatures: DEFAULT_REPORT_SIGNATURES
    });
  },

  updateConfig: async (newConfig) => {
    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, "settings", "config"), newConfig, { merge: true });
      } catch (e) {
        console.error("updateConfig error:", e);
      }
    }
    const current = getLocalData(CONFIG_KEY, {});
    const updated = { ...current, ...newConfig };
    setLocalData(CONFIG_KEY, updated);
    return updated;
  },

  verifyRoomPin: async (roomKey, pin) => {
    await deviceService.initDataIfEmpty();
    let pins = DEFAULT_ROOM_PINS;
    if (isFirebaseActive && db) {
      try {
        const pinsDoc = await getDoc(doc(db, "settings", "pins"));
        if (pinsDoc.exists()) {
          pins = pinsDoc.data();
          setLocalData(PINS_KEY, pins);
        }
      } catch (e) {
        console.error("verifyRoomPin error:", e);
      }
    } else {
      pins = getLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
    }
    const expectedPin = pins[roomKey] || '1234';
    return String(pin).trim() === String(expectedPin).trim();
  },

  getAllDevices: async () => {
    await deviceService.initDataIfEmpty();
    const raw = getLocalData(DEVICES_KEY, []);
    return sortDevicesByGradeAndRoom(raw);
  },

  getDevices: async ({ academicYear, grade, room, search }) => {
    let devices = await deviceService.getAllDevices();
    
    if (academicYear) {
      devices = devices.filter(d => (d.academic_year || INITIAL_ACADEMIC_YEAR) === academicYear);
    }
    if (grade && grade !== "ทั้งหมด") {
      if (grade === "ครู") {
        devices = devices.filter(d => d.type === 'teacher');
      } else {
        devices = devices.filter(d => d.grade === grade);
      }
    }
    if (room && room !== "ทั้งหมด") {
      devices = devices.filter(d => String(d.room) === String(room));
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      devices = devices.filter(d => 
        (d.serial_no && d.serial_no.toLowerCase().includes(q)) ||
        (d.prefix && d.prefix.toLowerCase().includes(q)) ||
        (d.first_name && d.first_name.toLowerCase().includes(q)) ||
        (d.last_name && d.last_name.toLowerCase().includes(q)) ||
        (d.box_no && d.box_no.toLowerCase().includes(q)) ||
        (d.box_kb_no && d.box_kb_no.toLowerCase().includes(q))
      );
    }

    return sortDevicesByGradeAndRoom(devices);
  },

  sortAndSaveAllDevicesByRoom: async () => {
    let devices = getLocalData(DEVICES_KEY, []);
    const sorted = sortDevicesByGradeAndRoom(devices);
    setLocalData(DEVICES_KEY, sorted);

    if (isFirebaseActive && db) {
      const batch = writeBatch(db);
      sorted.forEach(dev => {
        batch.set(doc(db, "devices", dev.id), dev);
      });
      await batch.commit();
    }

    return sorted;
  },

  addDevice: async (deviceData) => {
    const devices = await deviceService.getAllDevices();
    
    const exists = devices.some(d => d.serial_no.toUpperCase() === deviceData.serial_no.toUpperCase() && d.academic_year === deviceData.academic_year);
    if (exists) {
      throw new Error(`Serial No. ${deviceData.serial_no} มีอยู่ในระบบแล้วสำหรับปีการศึกษานี้`);
    }

    const newDevice = {
      id: `DEV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      prefix: deviceData.prefix || 'นาย',
      ...deviceData,
      serial_no: deviceData.serial_no.trim().toUpperCase(),
      created_at: new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "devices", newDevice.id), newDevice);
      await setDoc(doc(db, "settings", "system"), { initialized: true, cleared: false });
    }

    devices.push(newDevice);
    const sorted = sortDevicesByGradeAndRoom(devices);
    setLocalData(DEVICES_KEY, sorted);
    setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
    return newDevice;
  },

  updateDevice: async (id, deviceData) => {
    const devices = await deviceService.getAllDevices();
    const idx = devices.findIndex(d => d.id === id);
    if (idx === -1) throw new Error("ไม่พบข้อมูลอุปกรณ์ที่ต้องการแก้ไข");

    const updatedDev = {
      ...devices[idx],
      ...deviceData,
      updated_at: new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "devices", id), updatedDev);
    }

    devices[idx] = updatedDev;
    const sorted = sortDevicesByGradeAndRoom(devices);
    setLocalData(DEVICES_KEY, sorted);
    return updatedDev;
  },

  deleteDevice: async (id) => {
    if (isFirebaseActive && db) {
      await deleteDoc(doc(db, "devices", id));
    }
    let devices = getLocalData(DEVICES_KEY, []);
    devices = devices.filter(d => d.id !== id);
    const sorted = sortDevicesByGradeAndRoom(devices);
    setLocalData(DEVICES_KEY, sorted);
    return true;
  },

  // Bulk Move & Re-order devices and option to re-assign BOX sequence
  bulkMoveAndReorderDevices: async ({ deviceIds, targetGrade, targetRoom, autoReorderBox = false }) => {
    let devices = await deviceService.getAllDevices();
    const batch = (isFirebaseActive && db) ? writeBatch(db) : null;

    // 1. Move specified devices to new grade and room
    const targetSet = new Set(deviceIds);
    devices = devices.map(d => {
      if (targetSet.has(d.id)) {
        const updated = {
          ...d,
          type: targetGrade === 'ครู' ? 'teacher' : 'student',
          grade: targetGrade,
          room: targetGrade === 'ครู' ? '-' : String(targetRoom),
          updated_at: new Date().toISOString()
        };
        if (batch) {
          batch.set(doc(db, "devices", d.id), updated);
        }
        return updated;
      }
      return d;
    });

    // 2. If autoReorderBox is true, re-sequence BOX numbers for all devices in target Grade & Room
    if (autoReorderBox) {
      const roomDevs = devices.filter(d => 
        targetGrade === 'ครู' ? d.type === 'teacher' : (d.grade === targetGrade && String(d.room) === String(targetRoom))
      );

      // Sort alphabetically by first_name and last_name
      roomDevs.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '', 'th'));

      const gradeOffset = targetGrade === 'ม.4' ? 400 : targetGrade === 'ม.5' ? 500 : targetGrade === 'ม.6' ? 600 : 700;
      const roomNum = parseInt(targetRoom, 10) || 1;
      const baseNum = 69000 + (gradeOffset * 10) + (roomNum * 20);

      roomDevs.forEach((dev, idx) => {
        const seqStr = String(baseNum + idx + 1).padStart(6, '0');
        dev.box_no = `TAB-${seqStr}`;
        dev.box_kb_no = `KB-${seqStr}`;
        dev.updated_at = new Date().toISOString();

        if (batch) {
          batch.set(doc(db, "devices", dev.id), dev);
        }
      });
    }

    if (batch) {
      await batch.commit();
    }

    const sorted = sortDevicesByGradeAndRoom(devices);
    setLocalData(DEVICES_KEY, sorted);
    return sorted;
  },

  // Bulk Add / Upsert via CSV Import
  importDevicesCSV: async (parsedList, academicYear) => {
    let devices = getLocalData(DEVICES_KEY, []);
    let addedCount = 0;
    let updatedCount = 0;

    const batch = (isFirebaseActive && db) ? writeBatch(db) : null;

    parsedList.forEach((row, idx) => {
      const serial_no = (row.serial_no || row.serial || row['Serial No'] || row['Serial No.'] || row['SERIAL'])?.toString().trim().toUpperCase();
      if (!serial_no) return;

      const type = (row.type || row['ประเภท'] || 'student').toString().toLowerCase().includes('ครู') ? 'teacher' : 'student';
      const prefix = row.prefix || row['คำนำหน้า'] || (type === 'teacher' ? 'นาย' : 'นาย');
      const first_name = row.first_name || row['ชื่อ'] || row['ชื่อจริง'] || 'นักเรียน';
      const last_name = row.last_name || row['นามสกุล'] || '';
      const grade = row.grade || row['ระดับชั้น'] || row['ชั้น'] || 'ม.4';
      const room = (row.room || row['ห้อง'] || '1').toString();
      const box_no = row.box_no || row['เลข BOX'] || row['BOX'] || `TAB-${String(idx+1).padStart(6, '0')}`;
      const box_kb_no = row.box_kb_no || row['เลข BOX KB'] || row['BOX KB'] || `KB-${String(idx+1).padStart(6, '0')}`;

      const existingIdx = devices.findIndex(d => d.serial_no === serial_no && d.academic_year === academicYear);

      if (existingIdx !== -1) {
        // Update existing device
        devices[existingIdx] = {
          ...devices[existingIdx],
          type,
          prefix,
          first_name,
          last_name,
          grade,
          room,
          box_no,
          box_kb_no,
          academic_year: academicYear,
          updated_at: new Date().toISOString()
        };
        if (batch) {
          batch.set(doc(db, "devices", devices[existingIdx].id), devices[existingIdx]);
        }
        updatedCount++;
      } else {
        // Create new device
        const newDev = {
          id: `DEV-${Date.now()}-${idx}-${Math.floor(Math.random()*1000)}`,
          type,
          prefix,
          first_name,
          last_name,
          grade,
          room,
          box_no,
          box_kb_no,
          serial_no,
          academic_year: academicYear,
          created_at: new Date().toISOString()
        };
        devices.push(newDev);
        if (batch) {
          batch.set(doc(db, "devices", newDev.id), newDev);
        }
        addedCount++;
      }
    });

    if (batch) {
      await batch.commit();
      await setDoc(doc(db, "settings", "system"), { initialized: true, cleared: false });
    }

    const sorted = sortDevicesByGradeAndRoom(devices);
    setLocalData(DEVICES_KEY, sorted);
    setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });

    return { addedCount, updatedCount, totalCount: sorted.length };
  },

  // Clear all sample devices and inspections for system reset
  clearAllSystemData: async () => {
    if (isFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "devices"));
        const batch = writeBatch(db);
        snap.forEach(docSnap => batch.delete(docSnap.ref));
        
        const insSnap = await getDocs(collection(db, "inspections"));
        insSnap.forEach(docSnap => batch.delete(docSnap.ref));

        await batch.commit();
        await setDoc(doc(db, "settings", "system"), { initialized: true, cleared: true });
      } catch (e) {
        console.error("Firestore clearAllSystemData error:", e);
      }
    }

    setLocalData(DEVICES_KEY, []);
    setLocalData(INSPECTIONS_KEY, {});
    setLocalData(SYSTEM_KEY, { initialized: true, cleared: true });
    return true;
  }
};
