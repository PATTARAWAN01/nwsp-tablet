import { db, isFirebaseActive } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';

const LOCAL_INSPECTIONS_KEY = 'nwsp_tablet_inspections';
const LOCAL_LOGS_KEY = 'nwsp_tablet_logs';

export function getCategoryLabel(categoryKey) {
  const labels = {
    tablet: '1. Tablet',
    spen: '2. ปากกา S Pen',
    keyboard: '3. คีย์บอร์ด',
    cable_white: '4. สาย Tablet (ขาว)',
    cable_black: '5. สาย KB (ดำ)',
    adapter: '6. Adapter'
  };
  return labels[categoryKey] || categoryKey;
}

const getLocalInspections = () => {
  try {
    const raw = localStorage.getItem(LOCAL_INSPECTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const setLocalInspections = (data) => {
  localStorage.setItem(LOCAL_INSPECTIONS_KEY, JSON.stringify(data));
};

const getLocalLogs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setLocalLogs = (data) => {
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(data));
};

// Check if store initialized
const initStoreIfEmpty = async () => {
  const localIns = getLocalInspections();
  if (Object.keys(localIns).length > 0) return;

  if (isFirebaseActive && db) {
    try {
      const snap = await getDocs(collection(db, "inspections"));
      const map = {};
      snap.forEach(docSnap => {
        map[docSnap.id] = docSnap.data();
      });
      if (Object.keys(map).length > 0) {
        setLocalInspections(map);
      }
    } catch (e) {
      console.error("Firestore initStoreIfEmpty error:", e);
    }
  }
};

export const inspectionService = {
  
  // Add log entry
  addLog: async ({ academicYear, round, roomKey, teacherName, action, deviceCount, details }) => {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const logItem = {
      id: logId,
      academic_year: academicYear || "2569",
      round: Number(round || 1),
      room_key: roomKey || "ไม่ระบุ",
      teacher_name: teacherName || "ผู้ใช้งาน",
      action: action || "ทำรายการ",
      device_count: Number(deviceCount || 0),
      details: details || "",
      timestamp: new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      setDoc(doc(db, "logs", logId), logItem).catch(e => console.error("Firestore addLog error:", e));
    }

    const logs = getLocalLogs();
    logs.unshift(logItem);
    setLocalLogs(logs.slice(0, 500)); // keep last 500 logs locally
    return logItem;
  },

  // Delete single log entry
  deleteLog: async (logId) => {
    if (isFirebaseActive && db) {
      deleteDoc(doc(db, "logs", logId)).catch(e => console.error("Firestore deleteLog error:", e));
    }
    const logs = getLocalLogs().filter(l => l.id !== logId);
    setLocalLogs(logs);
    return true;
  },

  // Get audit logs
  getLogs: async ({ academicYear, round, roomKey }) => {
    if (isFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "logs"));
        const list = [];
        snap.forEach(docSnap => list.push(docSnap.data()));
        list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLocalLogs(list);
      } catch (e) {
        console.error("Firestore getLogs error:", e);
      }
    }

    let logs = getLocalLogs();
    if (academicYear) {
      logs = logs.filter(l => (l.academic_year || "2569") === academicYear);
    }
    if (round) {
      logs = logs.filter(l => Number(l.round) === Number(round));
    }
    if (roomKey && roomKey !== "ทั้งหมด") {
      logs = logs.filter(l => l.room_key === roomKey);
    }
    return logs;
  },

  // Get unique teachers who logged into/inspected a given room
  getRoomInspectors: async (academicYear, round, roomKey) => {
    const logs = await inspectionService.getLogs({ academicYear, round, roomKey });
    const teacherSet = new Set();
    logs.forEach(l => {
      if (l.teacher_name && l.teacher_name.trim() !== '') {
        teacherSet.add(l.teacher_name.trim());
      }
    });
    return Array.from(teacherSet);
  },

  // Get all inspection records for a given year & round
  getInspections: async (academicYear, round) => {
    await initStoreIfEmpty();

    if (isFirebaseActive && db) {
      try {
        const q = query(
          collection(db, "inspections"),
          where("academic_year", "==", String(academicYear)),
          where("round", "==", Number(round))
        );
        const snap = await getDocs(q);
        const map = {};
        snap.forEach(docSnap => {
          const data = docSnap.data();
          map[data.serial_no] = data;
        });
        
        const localAll = getLocalInspections();
        Object.assign(localAll, map);
        setLocalInspections(localAll);

        return map;
      } catch (e) {
        console.error("Firestore getInspections error:", e);
      }
    }

    const localAll = getLocalInspections();
    const result = {};
    Object.values(localAll).forEach(rec => {
      if (rec.academic_year === String(academicYear) && Number(rec.round) === Number(round)) {
        result[rec.serial_no] = rec;
      }
    });
    return result;
  },

  // Delete single inspection record
  deleteInspection: async (academicYear, round, serial_no) => {
    const key = `${academicYear}-R${round}-${serial_no}`;

    if (isFirebaseActive && db) {
      deleteDoc(doc(db, "inspections", key)).catch(e => console.error("Firestore deleteInspection error:", e));
    }

    const all = getLocalInspections();
    delete all[key];
    setLocalInspections(all);
    return true;
  },

  // Batch save room inspection
  saveBatchInspection: async ({ academicYear, round, roomKey, recordsList, inspector }) => {
    const all = getLocalInspections();
    const batch = (isFirebaseActive && db) ? writeBatch(db) : null;
    
    recordsList.forEach(item => {
      const key = `${academicYear}-R${round}-${item.serial_no}`;
      const rec = {
        id: key,
        academic_year: academicYear,
        round: Number(round),
        serial_no: item.serial_no,
        device_id: item.device_id,
        inspector: inspector || "ครูที่ปรึกษา",
        inspected_at: new Date().toISOString(),
        items: item.items
      };

      all[key] = rec;
      if (batch) {
        batch.set(doc(db, "inspections", key), rec);
      }
    });

    setLocalInspections(all);

    if (batch) {
      await batch.commit();
    }

    // Record audit log
    await inspectionService.addLog({
      academicYear,
      round,
      roomKey: roomKey || "ไม่ระบุห้อง",
      teacherName: inspector || "ครูผู้ตรวจเช็ค",
      action: "บันทึกผลการตรวจเช็คอุปกรณ์ประจำห้อง",
      deviceCount: recordsList.length,
      details: `บันทึกข้อมูลอุปกรณ์จำนวน ${recordsList.length} เครื่อง`
    });

    return true;
  },

  // Compute dashboard summary stats for a single round (Normal vs Damaged vs Lost vs Unchecked)
  getDashboardStats: async (devicesList, academicYear, round) => {
    const inspections = await inspectionService.getInspections(academicYear, round);
    
    const totalDevices = devicesList.length;
    let checkedCount = 0;
    let normalCount = 0;
    let damagedCount = 0;
    let lostCount = 0;

    const damagedBreakdown = {
      tablet: 0,
      spen: 0,
      keyboard: 0,
      cable_white: 0,
      cable_black: 0,
      adapter: 0
    };

    const damagedDetailsList = [];

    devicesList.forEach(dev => {
      const ins = inspections[dev.serial_no];
      if (ins) {
        checkedCount++;
        const items = ins.items || {};
        let isDeviceDamaged = false;
        let isDeviceLost = false;

        const categories = ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'];
        categories.forEach(cat => {
          if (items[cat]) {
            const st = items[cat].status;
            if (st === 'damaged' || st === 'lost') {
              if (st === 'lost') isDeviceLost = true;
              if (st === 'damaged') isDeviceDamaged = true;

              damagedBreakdown[cat]++;
              damagedDetailsList.push({
                serial_no: dev.serial_no,
                box_no: dev.box_no,
                box_kb_no: dev.box_kb_no,
                owner: `${dev.prefix ? dev.prefix + ' ' : ''}${dev.first_name} ${dev.last_name}`,
                type: dev.type,
                grade_room: dev.type === 'teacher' ? 'ครู' : `${dev.grade}/${dev.room}`,
                item_name: getCategoryLabel(cat),
                status_type: st, // 'damaged' or 'lost'
                status_label: st === 'lost' ? 'สูญหาย' : 'ชำรุด',
                note: items[cat].note || (st === 'lost' ? 'สูญหาย' : 'ชำรุด'),
                inspected_at: ins.inspected_at
              });
            }
          }
        });

        if (isDeviceLost) {
          lostCount++;
        } else if (isDeviceDamaged) {
          damagedCount++;
        } else {
          normalCount++;
        }
      }
    });

    const uncheckedCount = totalDevices - checkedCount;
    const progressPercent = totalDevices > 0 ? Math.round((checkedCount / totalDevices) * 100) : 0;
    const normalPercent = checkedCount > 0 ? Math.round((normalCount / checkedCount) * 100) : 0;
    const damagedPercent = checkedCount > 0 ? Math.round((damagedCount / checkedCount) * 100) : 0;
    const lostPercent = checkedCount > 0 ? Math.round((lostCount / checkedCount) * 100) : 0;

    return {
      totalDevices,
      checkedCount,
      uncheckedCount,
      normalCount,
      damagedCount,
      lostCount,
      progressPercent,
      normalPercent,
      damagedPercent,
      lostPercent,
      damagedBreakdown,
      damagedDetailsList
    };
  },

  // Compute annual summary stats across all 5 rounds
  getAnnualDashboardStats: async (devicesList, academicYear) => {
    const roundsData = [];
    const annualDamagedBreakdown = {
      tablet: 0,
      spen: 0,
      keyboard: 0,
      cable_white: 0,
      cable_black: 0,
      adapter: 0
    };

    for (let r = 1; r <= 5; r++) {
      const st = await inspectionService.getDashboardStats(devicesList, academicYear, r);
      roundsData.push({
        round: r,
        name: `รอบที่ ${r}`,
        totalDevices: st.totalDevices,
        checkedCount: st.checkedCount,
        normalCount: st.normalCount,
        damagedCount: st.damagedCount,
        lostCount: st.lostCount,
        progressPercent: st.progressPercent
      });

      Object.keys(st.damagedBreakdown).forEach(cat => {
        annualDamagedBreakdown[cat] += st.damagedBreakdown[cat];
      });
    }

    return {
      roundsData,
      annualDamagedBreakdown
    };
  }
};
