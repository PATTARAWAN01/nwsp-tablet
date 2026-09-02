import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService, getCategoryLabel } from '../services/inspectionService';
import Papa from 'papaparse';
import { 
  ShieldCheck, 
  Lock, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Key, 
  Calendar, 
  Tablet, 
  Search, 
  CheckCircle2, 
  FileSpreadsheet,
  Save,
  KeyRound,
  RotateCcw,
  History,
  UserCheck,
  AlertCircle,
  XCircle,
  RefreshCw,
  FileX,
  AlertTriangle,
  UserCheck2,
  UserPlus,
  ArrowLeftRight,
  FolderSync,
  Layers
} from 'lucide-react';
import { DEFAULT_ROOM_PINS } from '../services/sampleData';

export default function AdminManagement() {
  const { isAdmin, loginAdmin, logoutAdmin, config, updateGlobalSettings } = useAuth();
  
  const [passwordInput, setPasswordInput] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [adminSubTab, setAdminSubTab] = useState('devices');

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("ทั้งหมด");
  const [filterType, setFilterType] = useState("ทั้งหมด");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'student',
    prefix: 'นาย',
    box_no: '',
    box_kb_no: '',
    serial_no: '',
    first_name: '',
    last_name: '',
    grade: 'ม.4',
    room: '1',
    academic_year: config.current_academic_year
  });

  const [csvFile, setCsvFile] = useState(null);
  const [csvParsed, setCsvParsed] = useState([]);
  const [csvTargetYear, setCsvTargetYear] = useState(config.current_academic_year);
  const [importStatus, setImportStatus] = useState(null);

  const [newYearInput, setNewYearInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");
  const [roomPinsState, setRoomPinsState] = useState(DEFAULT_ROOM_PINS);

  // Manage Inspections Sub-tab State
  const [inspectionsMap, setInspectionsMap] = useState({});
  const [manageSelectedRound, setManageSelectedRound] = useState(config.current_round);
  const [manageSelectedGrade, setManageSelectedGrade] = useState("ทั้งหมด");
  const [manageSelectedRoom, setManageSelectedRoom] = useState("ทั้งหมด");
  const [manageSearchQuery, setManageSearchQuery] = useState("");

  // Audit Logs Sub-tab State
  const [auditLogs, setAuditLogs] = useState([]);
  const [logRoomFilter, setLogRoomFilter] = useState("ทั้งหมด");
  const [logRoundFilter, setLogRoundFilter] = useState("ทั้งหมด");

  // Move & Re-order Room Modal States
  const [showMoveRoomModal, setShowMoveRoomModal] = useState(false);
  const [moveRoomTab, setMoveRoomTab] = useState('single'); // 'single', 'reorder'
  const [selectedMoveDevIds, setSelectedMoveDevIds] = useState([]);
  const [targetMoveGrade, setTargetMoveGrade] = useState("ม.4");
  const [targetMoveRoom, setTargetMoveRoom] = useState("1");
  const [autoReorderBoxOption, setAutoReorderBoxOption] = useState(true);

  // Signature Block Customization Settings
  const [signaturesList, setSignaturesList] = useState(config.report_signatures || [
    { id: 'sig_1', title: 'ผู้รับรองรายงาน / หัวหน้าโครงการ', name: 'นายสุริยันต์ วงษ์คำสี' }
  ]);

  // Popup Modal Alert
  const [modalPopup, setModalPopup] = useState(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const devList = await deviceService.getAllDevices();
      setDevices(devList);

      const insMap = await inspectionService.getInspections(config.current_academic_year, manageSelectedRound);
      setInspectionsMap(insMap);

      const logsList = await inspectionService.getLogs({});
      setAuditLogs(logsList);

      if (config.report_signatures) {
        setSignaturesList(config.report_signatures);
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, config.current_academic_year, manageSelectedRound]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginErr("");
    const res = loginAdmin(passwordInput);
    if (!res.success) {
      setLoginErr(res.message);
    } else {
      setPasswordInput("");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      type: 'student',
      prefix: 'นาย',
      box_no: '',
      box_kb_no: '',
      serial_no: '',
      first_name: '',
      last_name: '',
      grade: 'ม.4',
      room: '1',
      academic_year: config.current_academic_year
    });
  };

  const handleEdit = (device) => {
    setEditingId(device.id);
    setFormData({
      type: device.type || 'student',
      prefix: device.prefix || 'นาย',
      box_no: device.box_no || '',
      box_kb_no: device.box_kb_no || '',
      serial_no: device.serial_no || '',
      first_name: device.first_name || '',
      last_name: device.last_name || '',
      grade: device.grade || 'ม.4',
      room: device.room || '1',
      academic_year: device.academic_year || config.current_academic_year
    });
    setShowFormModal(true);
  };

  const handleDeviceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await deviceService.updateDevice(editingId, formData);
        setModalPopup({
          type: 'success',
          title: 'อัปเดตข้อมูลสำเร็จ!',
          message: `แก้ไขข้อมูลอุปกรณ์ ${formData.serial_no} เรียบร้อยแล้ว`
        });
      } else {
        await deviceService.addDevice(formData);
        setModalPopup({
          type: 'success',
          title: 'เพิ่มอุปกรณ์ใหม่สำเร็จ!',
          message: `บันทึกข้อมูล ${formData.prefix} ${formData.first_name} ${formData.last_name} เรียบร้อยแล้ว`
        });
      }
      setShowFormModal(false);
      resetForm();
      await loadAdminData();
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลอุปกรณ์ของ "${name}" ?`)) return;
    
    setLoading(true);
    try {
      await deviceService.deleteDevice(id);
      setModalPopup({
        type: 'success',
        title: 'ลบข้อมูลสำเร็จ!',
        message: `ลบข้อมูลอุปกรณ์เรียบร้อยแล้ว`
      });
      await loadAdminData();
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการลบ!',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Execute Move & Re-order Room Submit
  const handleExecuteMoveRoom = async (e) => {
    if (e) e.preventDefault();

    if (moveRoomTab === 'single') {
      if (selectedMoveDevIds.length === 0) {
        setModalPopup({
          type: 'warning',
          title: 'ยังไม่ได้เลือกอุปกรณ์!',
          message: 'กรุณาเลือกอุปกรณ์ที่ต้องการย้ายห้องก่อนกดยืนยัน'
        });
        return;
      }

      setLoading(true);
      try {
        await deviceService.bulkMoveAndReorderDevices({
          deviceIds: selectedMoveDevIds,
          targetGrade: targetMoveGrade,
          targetRoom: targetMoveRoom,
          autoReorderBox: autoReorderBoxOption
        });

        await inspectionService.addLog({
          academicYear: config.current_academic_year,
          round: config.current_round,
          roomKey: targetMoveGrade === 'ครู' ? 'ครู' : `${targetMoveGrade}/${targetMoveRoom}`,
          teacherName: 'Admin',
          action: 'ย้ายอุปกรณ์และจัดเรียงห้องใหม่',
          deviceCount: selectedMoveDevIds.length,
          details: `ย้ายอุปกรณ์จำนวน ${selectedMoveDevIds.length} ชุด ไปยังห้อง ${targetMoveGrade}/${targetMoveRoom}${autoReorderBoxOption ? ' (พร้อมจัดเรียงเลข BOX ใหม่)' : ''}`
        });

        setModalPopup({
          type: 'success',
          title: 'ย้ายและจัดเรียงห้องสำเร็จ! 🎉',
          message: `ย้ายอุปกรณ์จำนวน ${selectedMoveDevIds.length} ชุด ไปยังห้อง ${targetMoveGrade}/${targetMoveRoom} เรียบร้อยแล้ว`
        });

        setShowMoveRoomModal(false);
        setSelectedMoveDevIds([]);
        await loadAdminData();
      } catch (err) {
        setModalPopup({
          type: 'error',
          title: 'เกิดข้อผิดพลาด!',
          message: err.message
        });
      } finally {
        setLoading(false);
      }
    } else if (moveRoomTab === 'reorder') {
      // Re-order room devices & BOX numbers
      const roomDevs = devices.filter(d => 
        targetMoveGrade === 'ครู' ? d.type === 'teacher' : (d.grade === targetMoveGrade && String(d.room) === String(targetMoveRoom))
      );

      if (roomDevs.length === 0) {
        setModalPopup({
          type: 'warning',
          title: 'ไม่พบอุปกรณ์ในห้องนี้!',
          message: `ไม่พบอุปกรณ์ในห้อง ${targetMoveGrade}/${targetMoveRoom} เพื่อทำการจัดเรียงใหม่`
        });
        return;
      }

      setLoading(true);
      try {
        const roomDevIds = roomDevs.map(d => d.id);
        await deviceService.bulkMoveAndReorderDevices({
          deviceIds: roomDevIds,
          targetGrade: targetMoveGrade,
          targetRoom: targetMoveRoom,
          autoReorderBox: true
        });

        await inspectionService.addLog({
          academicYear: config.current_academic_year,
          round: config.current_round,
          roomKey: targetMoveGrade === 'ครู' ? 'ครู' : `${targetMoveGrade}/${targetMoveRoom}`,
          teacherName: 'Admin',
          action: 'จัดเรียงลำดับเลข BOX ประจำห้องอัตโนมัติ',
          deviceCount: roomDevs.length,
          details: `จัดเรียงอุปกรณ์และเรียงลำดับเลข BOX ใหม่จำนวน ${roomDevs.length} ชุด ในห้อง ${targetMoveGrade}/${targetMoveRoom}`
        });

        setModalPopup({
          type: 'success',
          title: 'จัดเรียงลำดับห้องสำเร็จ! 🎉',
          message: `จัดเรียงอุปกรณ์และเลข BOX ของห้อง ${targetMoveGrade}/${targetMoveRoom} ใหม่จำนวน ${roomDevs.length} ชุด เรียบร้อยแล้ว`
        });

        setShowMoveRoomModal(false);
        await loadAdminData();
      } catch (err) {
        setModalPopup({
          type: 'error',
          title: 'เกิดข้อผิดพลาด!',
          message: err.message
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteInspectionRecord = async (serial_no, ownerName) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผลการตรวจเช็คของ "${ownerName}" (Serial: ${serial_no}) ประจำรอบที่ ${manageSelectedRound} ?`)) return;

    setLoading(true);
    try {
      await inspectionService.deleteInspection(config.current_academic_year, manageSelectedRound, serial_no);
      setModalPopup({
        type: 'success',
        title: 'ลบผลการตรวจเช็คสำเร็จ!',
        message: `ลบผลการตรวจเช็ค Serial ${serial_no} ประจำรอบที่ ${manageSelectedRound} เรียบร้อยแล้ว`
      });
      await loadAdminData();
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLogEntry = async (logId, actionName) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการทำรายการนี้?`)) return;

    setLoading(true);
    try {
      await inspectionService.deleteLog(logId);
      setModalPopup({
        type: 'success',
        title: 'ลบประวัติสำเร็จ!',
        message: 'ลบประวัติการทำรายการเรียบร้อยแล้ว'
      });
      await loadAdminData();
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm("⚠️ เตือนร้ายแรง: คุณแน่ใจหรือไม่ว่าต้องการ 'ลบข้อมูลอุปกรณ์ทั้งหมด' ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้!")) return;

    setLoading(true);
    try {
      await deviceService.clearAllSystemData();
      setModalPopup({
        type: 'success',
        title: 'ล้างข้อมูลระบบสำเร็จ!',
        message: 'ลบข้อมูลอุปกรณ์และประวัติการตรวจเช็คทั้งหมดเรียบร้อยแล้ว'
      });
      await loadAdminData();
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // CSV Import Handlers
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvParsed(results.data);
        }
      });
    }
  };

  const handleExecuteImport = async () => {
    if (csvParsed.length === 0) {
      setModalPopup({
        type: 'warning',
        title: 'ไม่พบข้อมูลในไฟล์ CSV!',
        message: 'กรุณาเลือกไฟล์ CSV ที่มีข้อมูลที่ถูกต้องก่อนกดนำเข้า'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await deviceService.importDevicesCSV(csvParsed, csvTargetYear);
      setImportStatus({
        type: 'success',
        details: `นำเข้าข้อมูลอุปกรณ์ใหม่ ${res.addedCount} ชุด, อัปเดต ${res.updatedCount} ชุด`
      });

      setModalPopup({
        type: 'success',
        title: 'นำเข้าข้อมูล CSV สำเร็จ! 🎉',
        message: `เพิ่มข้อมูลใหม่ ${res.addedCount} ชุด, อัปเดต ${res.updatedCount} ชุด`
      });

      setCsvFile(null);
      setCsvParsed([]);
      await loadAdminData();
    } catch (err) {
      setImportStatus({
        type: 'error',
        details: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Signature Blocks Handlers
  const handleAddSignature = () => {
    setSignaturesList(prev => [
      ...prev,
      { id: `sig_${Date.now()}`, title: 'ผู้รับรองรายงาน', name: '' }
    ]);
  };

  const handleRemoveSignature = (idToRemove) => {
    setSignaturesList(prev => prev.filter(item => item.id !== idToRemove));
  };

  const handleSignatureChange = (id, field, value) => {
    setSignaturesList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveSignatures = async () => {
    setLoading(true);
    try {
      await updateGlobalSettings({
        report_signatures: signaturesList
      });

      setModalPopup({
        type: 'success',
        title: 'บันทึกรายชื่อผู้ลงชื่อสำเร็จ! 🎉',
        message: 'อัปเดตข้อมูลผู้ลงชื่อท้ายรายงานผลการตรวจเช็คเรียบร้อยแล้ว'
      });
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter Devices
  const filteredDevices = devices.filter(dev => {
    if (filterGrade !== "ทั้งหมด") {
      if (filterGrade === "ครู" && dev.type !== 'teacher') return false;
      if (filterGrade !== "ครู" && dev.grade !== filterGrade) return false;
    }
    if (filterType !== "ทั้งหมด" && dev.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        dev.serial_no.toLowerCase().includes(q) ||
        (dev.prefix && dev.prefix.toLowerCase().includes(q)) ||
        dev.first_name.toLowerCase().includes(q) ||
        dev.last_name.toLowerCase().includes(q) ||
        (dev.box_no && dev.box_no.toLowerCase().includes(q)) ||
        (dev.box_kb_no && dev.box_kb_no.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter Inspection Manage Items
  const filteredInspectionManageList = devices.map(dev => {
    const rec = inspectionsMap[dev.serial_no];
    return { device: dev, record: rec };
  }).filter(item => {
    if (!item.record) return false;
    if (manageSelectedGrade !== "ทั้งหมด" && item.device.grade !== manageSelectedGrade) return false;
    if (manageSelectedRoom !== "ทั้งหมด" && String(item.device.room) !== String(manageSelectedRoom)) return false;
    if (manageSearchQuery) {
      const q = manageSearchQuery.toLowerCase();
      return (
        item.device.serial_no.toLowerCase().includes(q) ||
        (item.device.prefix && item.device.prefix.toLowerCase().includes(q)) ||
        item.device.first_name.toLowerCase().includes(q) ||
        item.device.last_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter Audit Logs
  const filteredLogs = auditLogs.filter(log => {
    if (logRoomFilter !== "ทั้งหมด" && log.room_key !== logRoomFilter) return false;
    if (logRoundFilter !== "ทั้งหมด" && Number(log.round) !== Number(logRoundFilter)) return false;
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="modern-glass-card rounded-3xl p-8 border border-white/80 shadow-xl max-w-md mx-auto space-y-6 animate-fade-in my-12 font-sarabun">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-extrabold font-prompt text-slate-900">
            เข้าสู่ระบบหลังบ้าน (Admin)
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            โรงเรียนหนองวัวซอพิทยาคม • จัดการข้อมูลและสิทธิ์
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="กรอกรหัสผ่าน Admin..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                required
              />
            </div>
          </div>

          {loginErr && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
              {loginErr}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-amber-400/30 flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>เข้าสู่ระบบหลังบ้าน</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sarabun">
      
      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ผู้ดูแลระบบ (Admin) • ระบบหลังบ้าน</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            จัดการข้อมูล Tablet และสิทธิ์การใช้งาน
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            โรงเรียนหนองวัวซอพิทยาคม • ม.4 - ม.6 (ห้อง 1 - 4) และ ครูผู้สอน (ปี {config.current_academic_year})
          </p>
        </div>

        <button
          onClick={logoutAdmin}
          className="self-start md:self-auto px-4 py-2.5 bg-white/10 hover:bg-rose-600 text-white border border-white/20 rounded-2xl text-xs font-extrabold transition-colors shadow-xs flex items-center space-x-2"
        >
          <Lock className="w-4 h-4" />
          <span>ออกจากระบบหลังบ้าน</span>
        </button>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminSubTab('devices')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'devices'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tablet className="w-4 h-4" />
          <span>รายการอุปกรณ์ ({devices.length})</span>
        </button>

        <button
          onClick={() => setAdminSubTab('manage-inspections')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'manage-inspections'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileX className="w-4 h-4" />
          <span>ลบ/แก้ไขผลการตรวจเช็ค</span>
        </button>

        <button
          onClick={() => setAdminSubTab('csv')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'csv'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>นำเข้าข้อมูล (CSV)</span>
        </button>

        <button
          onClick={() => { setAdminSubTab('logs'); loadAdminData(); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'logs'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติการเข้าใช้งานระบบ ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setAdminSubTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'settings'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>ตั้งค่าปีการศึกษา & ผู้ลงชื่อท้ายรายงาน</span>
        </button>

        <button
          onClick={() => setAdminSubTab('pins')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'pins'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>ตั้งค่า PIN ประจำห้องครู (13 ห้อง)</span>
        </button>
      </div>

      {/* --- SUB TAB 1: DEVICE LIST & SINGLE ADD --- */}
      {adminSubTab === 'devices' && (
        <div className="space-y-4">
          
          <div className="modern-glass p-4 rounded-3xl border border-white/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้น Serial No., ชื่อ, เลข BOX..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none"
              >
                <option value="ทั้งหมด">ประเภท: ทั้งหมด</option>
                <option value="student">นักเรียน</option>
                <option value="teacher">ครูผู้สอน</option>
              </select>

              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none"
              >
                <option value="ทั้งหมด">ระดับชั้น: ทั้งหมด (ม.4-ม.6)</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
                <option value="ครู">ครู</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => {
                  setSelectedMoveDevIds([]);
                  setMoveRoomTab('single');
                  setShowMoveRoomModal(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>🔀 ย้าย/จัดเรียงห้องใหม่</span>
              </button>

              <button
                onClick={handleClearAllData}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-2xl text-xs transition-colors flex items-center space-x-1.5"
                title="ลบข้อมูลตัวอย่างทั้งหมด"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>ลบข้อมูลทั้งหมด</span>
              </button>

              <button
                onClick={() => { resetForm(); setShowFormModal(true); }}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-amber-400/20 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มอุปกรณ์ทีละชุด</span>
              </button>
            </div>

          </div>

          <div className="modern-glass rounded-3xl border border-white/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-800 uppercase text-xs border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-5 py-4">1. ประเภท</th>
                    <th className="px-5 py-4 text-blue-700 font-extrabold text-xs">2. Serial No.</th>
                    <th className="px-5 py-4 text-slate-900 font-extrabold text-xs">3. ชื่อ - นามสกุล</th>
                    <th className="px-5 py-4">4. ระดับชั้น / ห้อง</th>
                    <th className="px-5 py-4">5. เลข BOX</th>
                    <th className="px-5 py-4">6. เลข BOX KB</th>
                    <th className="px-5 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                        ไม่พบข้อมูลอุปกรณ์ในระบบ (สามารถกด "นำเข้าข้อมูล (CSV)" หรือ "เพิ่มอุปกรณ์ทีละชุด" ได้)
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            dev.type === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-extrabold text-blue-700 text-base">
                          {dev.serial_no}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900 font-prompt text-base">
                          {dev.prefix || ''} {dev.first_name} {dev.last_name}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-slate-800">
                          {dev.type === 'teacher' ? 'ครูผู้สอน' : `${dev.grade}/${dev.room}`}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{dev.box_no}</td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{dev.box_kb_no}</td>

                        <td className="px-5 py-4 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedMoveDevIds([dev.id]);
                              setTargetMoveGrade(dev.type === 'teacher' ? 'ครู' : dev.grade);
                              setTargetMoveRoom(dev.type === 'teacher' ? '1' : dev.room);
                              setMoveRoomTab('single');
                              setShowMoveRoomModal(true);
                            }}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs transition-colors"
                            title="ย้าย/จัดเรียงห้องใหม่"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(dev)}
                            className="p-2 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-xl text-xs transition-colors"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dev.id, `${dev.prefix || ''} ${dev.first_name} ${dev.last_name}`)}
                            className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 rounded-xl text-xs transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB TAB 2: MANAGE & DELETE INSPECTION RECORDS --- */}
      {adminSubTab === 'manage-inspections' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
              <h3 className="text-lg font-bold font-prompt text-slate-900">
                ลบและแก้ไขผลการตรวจเช็คอุปกรณ์ (Manage Inspection Records)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ในกรณีที่ครูตรวจเช็คผิด หรือต้องการยกเลิกผลการตรวจเฉพาะชุด แอดมินสามารถลบผลการตรวจออกเพื่อให้ครูตรวจใหม่ได้
              </p>
            </div>

            {/* Filter Controls for Inspection Records */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600">รอบที่:</span>
                <select
                  value={manageSelectedRound}
                  onChange={(e) => setManageSelectedRound(Number(e.target.value))}
                  className="bg-transparent font-extrabold text-blue-900 text-xs focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map(r => (
                    <option key={r} value={r}>รอบที่ {r}</option>
                  ))}
                </select>
              </div>

              <select
                value={manageSelectedGrade}
                onChange={(e) => setManageSelectedGrade(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none cursor-pointer"
              >
                <option value="ทั้งหมด">ชั้น: ทั้งหมด</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
                <option value="ครู">ครู</option>
              </select>

              <select
                value={manageSelectedRoom}
                onChange={(e) => setManageSelectedRoom(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none cursor-pointer"
              >
                <option value="ทั้งหมด">ห้อง: ทั้งหมด</option>
                <option value="1">ห้อง 1</option>
                <option value="2">ห้อง 2</option>
                <option value="3">ห้อง 3</option>
                <option value="4">ห้อง 4</option>
              </select>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้น Serial, ชื่อ..."
                  value={manageSearchQuery}
                  onChange={(e) => setManageSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-800 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5 text-blue-900 font-extrabold">Serial No.</th>
                  <th className="p-3.5 text-slate-900 font-extrabold">ชื่อ - นามสกุล</th>
                  <th className="p-3.5">ชั้น/ห้อง</th>
                  <th className="p-3.5">สถานะผลการตรวจ</th>
                  <th className="p-3.5">ผู้ตรวจเช็ค</th>
                  <th className="p-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/60">
                {filteredInspectionManageList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                      ไม่พบประวัติผลการตรวจเช็คตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredInspectionManageList.map((item, idx) => {
                    const dev = item.device;
                    const rec = item.record;
                    const items = rec ? (rec.items || {}) : {};

                    const damagedItems = Object.keys(items).filter(k => items[k] && items[k].status === 'damaged');
                    const lostItems = Object.keys(items).filter(k => items[k] && items[k].status === 'lost');
                    const isAllNormal = damagedItems.length === 0 && lostItems.length === 0;

                    return (
                      <tr key={dev.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="p-3.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-extrabold text-blue-900">{dev.serial_no}</td>
                        <td className="p-3.5 font-bold text-slate-900 font-prompt">
                          {dev.prefix || ''} {dev.first_name} {dev.last_name}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {dev.type === 'teacher' ? 'ครู' : `${dev.grade}/${dev.room}`}
                        </td>
                        <td className="p-3.5">
                          {lostItems.length > 0 ? (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold border border-purple-200">
                              สูญหาย {lostItems.length} รายการ
                            </span>
                          ) : damagedItems.length > 0 ? (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold border border-rose-200">
                              ชำรุด {damagedItems.length} รายการ
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold border border-emerald-200">
                              ปกติทุกรายการ
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {rec.inspector || 'ครูประจำชั้น'}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleDeleteInspectionRecord(dev.serial_no, `${dev.prefix || ''} ${dev.first_name} ${dev.last_name}`)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-200 flex items-center space-x-1 ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบผลการตรวจ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUB TAB 3: CSV IMPORT --- */}
      {adminSubTab === 'csv' && (
        <div className="modern-glass rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-extrabold font-prompt text-slate-900">
              นำเข้าข้อมูลอุปกรณ์ด้วยไฟล์ CSV (Bulk Upload)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              รองรับไฟล์ CSV ที่ส่งออกจาก Excel สามารถอัปโหลดและอัปเดตข้อมูลนักเรียน/ครู/เลข Serial/เลข BOX ได้ยกชุด
            </p>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-3xl text-center space-y-4 bg-slate-50/50 transition-colors">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                {csvFile ? `เลือกไฟล์แล้ว: ${csvFile.name}` : "ลากไฟล์ CSV มาวางที่นี่ หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                คอลัมน์ที่รองรับ: type, prefix, first_name, last_name, grade, room, box_no, box_kb_no, serial_no
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <label className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-extrabold rounded-2xl text-xs border border-slate-300 cursor-pointer shadow-xs">
                <span>เลือกไฟล์จากเครื่อง...</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
              </label>

              {csvParsed.length > 0 && (
                <button
                  onClick={handleExecuteImport}
                  disabled={loading}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-amber-400/30 flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>กดยืนยันการนำเข้า ({csvParsed.length} แถว)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 4: AUDIT LOGS --- */}
      {adminSubTab === 'logs' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-prompt">
                ประวัติการเข้าใช้งานและทำรายการในระบบ (Audit Trail Logs)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                บันทึกประวัติการล็อกอินและการกดบันทึกผลการตรวจเช็คของครูประจำชั้นและแอดมินย้อนหลัง
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={logRoomFilter}
                onChange={(e) => setLogRoomFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold"
              >
                <option value="ทั้งหมด">ห้อง: ทั้งหมด</option>
                <option value="ม.4/1">ม.4/1</option>
                <option value="ม.4/2">ม.4/2</option>
                <option value="ม.4/3">ม.4/3</option>
                <option value="ม.4/4">ม.4/4</option>
                <option value="ม.5/1">ม.5/1</option>
                <option value="ม.5/2">ม.5/2</option>
                <option value="ม.5/3">ม.5/3</option>
                <option value="ม.5/4">ม.5/4</option>
                <option value="ม.6/1">ม.6/1</option>
                <option value="ม.6/2">ม.6/2</option>
                <option value="ม.6/3">ม.6/3</option>
                <option value="ม.6/4">ม.6/4</option>
                <option value="ครู">ครู</option>
                <option value="Admin">Admin</option>
              </select>

              <select
                value={logRoundFilter}
                onChange={(e) => setLogRoundFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold"
              >
                <option value="ทั้งหมด">รอบ: ทั้งหมด</option>
                <option value="1">รอบ 1</option>
                <option value="2">รอบ 2</option>
                <option value="3">รอบ 3</option>
                <option value="4">รอบ 4</option>
                <option value="5">รอบ 5</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">วัน-เวลา</th>
                  <th className="p-3 text-blue-900">ห้อง/โหมด</th>
                  <th className="p-3 text-slate-900 font-extrabold">ชื่อ-นามสกุล ผู้ทำรายการ</th>
                  <th className="p-3">การทำรายการ</th>
                  <th className="p-3">รายละเอียดเพิ่มเติม</th>
                  <th className="p-3 text-center">จำนวนชุด</th>
                  <th className="p-3 text-right">ลบประวัติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400 font-medium">
                      ไม่พบประวัติการทำรายการตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isAdminLog = log.room_key === 'Admin' || log.teacher_name?.includes('Admin');

                    return (
                      <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="p-3 font-extrabold text-blue-900 font-prompt whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            isAdminLog ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            {log.room_key === 'Admin' ? 'Admin' : `ห้อง ${log.room_key}`}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 font-prompt text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border ${
                            isAdminLog ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-blue-50 text-blue-900 border-blue-200'
                          }`}>
                            <UserCheck className={`w-3.5 h-3.5 ${isAdminLog ? 'text-amber-600' : 'text-blue-600'} mr-1`} />
                            {log.teacher_name}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{log.action}</td>
                        <td className="p-3 text-slate-600 font-medium">{log.details || '-'}</td>
                        <td className="p-3 text-center font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          {log.device_count > 0 ? `${log.device_count} ชุด` : '-'}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteLogEntry(log.id, log.action)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-xl text-xs transition-colors"
                            title="ลบประวัติ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUB TAB 5: SYSTEM SETTINGS & SIGNATURE FOOTER --- */}
      {adminSubTab === 'settings' && (
        <div className="space-y-6">
          
          <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
            <h3 className="text-lg font-bold font-prompt text-slate-900">
              ตั้งค่าปีการศึกษาปัจจุบันและรอบการตรวจเช็ค
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">ปีการศึกษาปัจจุบัน:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newYearInput || config.current_academic_year}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    className="p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 w-full"
                  />
                  <button
                    onClick={async () => {
                      if (!newYearInput) return;
                      await updateGlobalSettings({ current_academic_year: newYearInput });
                      setModalPopup({ type: 'success', title: 'อัปเดตปีการศึกษาสำเร็จ!', message: `ตั้งค่าเป็นปี ${newYearInput} เรียบร้อยแล้ว` });
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl whitespace-nowrap"
                  >
                    บันทึกปี
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">รอบการตรวจเช็คปัจจุบัน (1 - 5):</label>
                <select
                  value={config.current_round}
                  onChange={async (e) => {
                    const r = Number(e.target.value);
                    await updateGlobalSettings({ current_round: r });
                    setModalPopup({ type: 'success', title: 'อัปเดตรอบการตรวจเช็คสำเร็จ!', message: `ตั้งค่าเป็นรอบที่ ${r} เรียบร้อยแล้ว` });
                  }}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-blue-900"
                >
                  {[1, 2, 3, 4, 5].map(r => (
                    <option key={r} value={r}>รอบการตรวจเช็คที่ {r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configurable Signature Blocks Form */}
          <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-prompt text-slate-900">
                  ปรับแก้ตำแหน่งและชื่อผู้ลงชื่อท้ายรายงานการตรวจเช็ค
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  สามารถเพิ่ม แก้ไข หรือลบช่องลงชื่อสำหรับพิมพ์รายงานการตรวจเช็คได้อิสระ
                </p>
              </div>

              <button
                onClick={handleAddSignature}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-extrabold transition-all border border-blue-200 flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มผู้ลงชื่อ</span>
              </button>
            </div>

            <div className="space-y-3">
              {signaturesList.map((sig, idx) => (
                <div key={sig.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0 font-mono">
                    {idx + 1}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">ตำแหน่ง / ตำแหน่งผู้ลงชื่อ:</label>
                      <input
                        type="text"
                        placeholder="เช่น หัวหน้าโครงการ / ผู้รับรองรายงาน"
                        value={sig.title}
                        onChange={(e) => handleSignatureChange(sig.id, 'title', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">ชื่อ-นามสกุล ผู้รับรอง:</label>
                      <input
                        type="text"
                        placeholder="เช่น นายสุริยันต์ วงษ์คำสี (เว้นว่างไว้เพื่อพิมพ์สด)"
                        value={sig.name}
                        onChange={(e) => handleSignatureChange(sig.id, 'name', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSignature(sig.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors shrink-0"
                    title="ลบช่องลงชื่อนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveSignatures}
              disabled={loading}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-amber-400/30 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการเปลี่ยนแปลงการลงชื่อ</span>
            </button>
          </div>

        </div>
      )}

      {/* --- SUB TAB 6: ROOM PINS SETTINGS --- */}
      {adminSubTab === 'pins' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
          <h3 className="text-lg font-bold font-prompt text-slate-900">
            ตั้งค่า PIN ประจำห้องสำหรับครูผู้ตรวจเช็ค (13 ห้อง)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            {Object.keys(roomPinsState).map(rKey => (
              <div key={rKey} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-extrabold text-blue-900 font-prompt">ห้อง {rKey}:</span>
                <input
                  type="text"
                  maxLength={6}
                  value={roomPinsState[rKey]}
                  onChange={(e) => setRoomPinsState({ ...roomPinsState, [rKey]: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-center text-sm font-extrabold tracking-widest text-slate-900"
                />
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              await updateGlobalSettings({ pins: roomPinsState });
              setModalPopup({ type: 'success', title: 'อัปเดตรหัส PIN สำเร็จ!', message: 'บันทึกรหัส PIN ประจำห้องทั้ง 13 ห้องเรียบร้อยแล้ว' });
            }}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-amber-400/30 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกรหัส PIN ทั้งหมด</span>
          </button>
        </div>
      )}

      {/* MODAL 1: MOVE & RE-ORDER ROOM SYSTEM */}
      {showMoveRoomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border-2 border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold font-prompt text-slate-900">
                    🔀 ย้ายและจัดเรียงห้องใหม่ (Move & Re-order Room)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    ย้ายอุปกรณ์ไปยังห้องใหม่ และจัดเรียงลำดับเลข BOX ให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMoveRoomModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* Sub-tab options */}
            <div className="flex items-center space-x-2 p-1 bg-slate-100 rounded-2xl text-xs">
              <button
                onClick={() => setMoveRoomTab('single')}
                className={`flex-1 py-2 rounded-xl font-extrabold transition-all ${
                  moveRoomTab === 'single' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                1. ย้ายห้องอุปกรณ์
              </button>
              <button
                onClick={() => setMoveRoomTab('reorder')}
                className={`flex-1 py-2 rounded-xl font-extrabold transition-all ${
                  moveRoomTab === 'reorder' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                2. จัดเรียงลำดับห้องอัตโนมัติ
              </button>
            </div>

            <form onSubmit={handleExecuteMoveRoom} className="space-y-4 text-xs font-sarabun">
              
              {moveRoomTab === 'single' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">อุปกรณ์ที่เลือกย้ายห้อง ({selectedMoveDevIds.length} ชุด):</label>
                    {selectedMoveDevIds.length > 0 ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl font-bold text-blue-900">
                        {devices.filter(d => selectedMoveDevIds.includes(d.id)).map(d => (
                          <div key={d.id} className="flex justify-between items-center text-xs">
                            <span>{d.prefix || ''} {d.first_name} {d.last_name} ({d.serial_no})</span>
                            <span className="font-mono text-slate-600">ปัจจุบัน: {d.type === 'teacher' ? 'ครู' : `${d.grade}/${d.room}`}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setSelectedMoveDevIds([e.target.value]);
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="">-- เลือกอุปกรณ์ที่ต้องการย้ายห้อง --</option>
                        {devices.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.serial_no} • {d.prefix || ''} {d.first_name} {d.last_name} ({d.type === 'teacher' ? 'ครู' : `${d.grade}/${d.room}`})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ไปยังระดับชั้นใหม่:</label>
                      <select
                        value={targetMoveGrade}
                        onChange={(e) => setTargetMoveGrade(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="ม.4">ม.4</option>
                        <option value="ม.5">ม.5</option>
                        <option value="ม.6">ม.6</option>
                        <option value="ครู">ครูผู้สอน</option>
                      </select>
                    </div>

                    {targetMoveGrade !== 'ครู' && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ไปยังห้องใหม่:</label>
                        <select
                          value={targetMoveRoom}
                          onChange={(e) => setTargetMoveRoom(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                        >
                          <option value="1">ห้อง 1</option>
                          <option value="2">ห้อง 2</option>
                          <option value="3">ห้อง 3</option>
                          <option value="4">ห้อง 4</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center space-x-2 p-3 bg-amber-50 rounded-2xl border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReorderBoxOption}
                      onChange={(e) => setAutoReorderBoxOption(e.target.checked)}
                      className="text-amber-600 focus:ring-amber-500 rounded"
                    />
                    <span className="font-bold text-amber-950 text-xs">
                      จัดเรียงลำดับเลข BOX (TAB-XXXXXX / KB-XXXXXX) ใหม่ให้อัตโนมัติตามห้องใหม่
                    </span>
                  </label>
                </>
              )}

              {moveRoomTab === 'reorder' && (
                <>
                  <p className="text-xs text-slate-600 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    เลือกห้องที่ต้องการจัดเรียง ระบบจะทำการเรียงลำดับชื่อผู้ครอบครองตามตัวอักษร และกำหนดเลข BOX (TAB & KB) ใหม่ให้อย่างเรียบร้อย
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ระดับชั้น:</label>
                      <select
                        value={targetMoveGrade}
                        onChange={(e) => setTargetMoveGrade(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                      >
                        <option value="ม.4">ม.4</option>
                        <option value="ม.5">ม.5</option>
                        <option value="ม.6">ม.6</option>
                        <option value="ครู">ครูผู้สอน</option>
                      </select>
                    </div>

                    {targetMoveGrade !== 'ครู' && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ห้อง:</label>
                        <select
                          value={targetMoveRoom}
                          onChange={(e) => setTargetMoveRoom(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                        >
                          <option value="1">ห้อง 1</option>
                          <option value="2">ห้อง 2</option>
                          <option value="3">ห้อง 3</option>
                          <option value="4">ห้อง 4</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoveRoomModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>{loading ? 'กำลังดำเนินการ...' : 'กดยืนยันการจัดเรียงห้องใหม่'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SINGLE DEVICE */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border-2 border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold font-prompt text-slate-900">
                {editingId ? "แก้ไขข้อมูลอุปกรณ์" : "เพิ่มข้อมูลอุปกรณ์ทีละชุด"}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeviceSubmit} className="space-y-4 text-xs font-sarabun">
              <div>
                <label className="block font-bold text-slate-700 mb-1">1. ประเภทผู้ถือครอง:</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="devType"
                      checked={formData.type === 'student'}
                      onChange={() => setFormData({ ...formData, type: 'student', grade: 'ม.4', room: '1' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">นักเรียน</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="devType"
                      checked={formData.type === 'teacher'}
                      onChange={() => setFormData({ ...formData, type: 'teacher', grade: 'ครู', room: '-' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">ครูผู้สอน</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-blue-700 mb-1">2. Serial No.:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น R52T100001X"
                  value={formData.serial_no}
                  onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                  className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-mono font-extrabold text-blue-900 text-sm uppercase"
                />
              </div>

              {/* Title Prefix Dropdown & First / Last Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.1 คำนำหน้า:</label>
                  <select
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="นาง">นาง</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.2 ชื่อ:</label>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อผู้ครอบครอง"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.3 นามสกุล:</label>
                  <input
                    type="text"
                    required
                    placeholder="นามสกุล"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {formData.type === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4.1 ระดับชั้น:</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="ม.4">ม.4</option>
                      <option value="ม.5">ม.5</option>
                      <option value="ม.6">ม.6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4.2 ห้อง:</label>
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="1">ห้อง 1</option>
                      <option value="2">ห้อง 2</option>
                      <option value="3">ห้อง 3</option>
                      <option value="4">ห้อง 4</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">5. เลข BOX:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น TAB-069401"
                    value={formData.box_no}
                    onChange={(e) => setFormData({ ...formData, box_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">6. เลข BOX KB:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น KB-069401"
                    value={formData.box_kb_no}
                    onChange={(e) => setFormData({ ...formData, box_kb_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold shadow-md shadow-amber-400/30"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP NOTIFICATION MODAL */}
      {modalPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border-2 border-slate-200 shadow-2xl font-sarabun">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border shadow-xs ${
              modalPopup.type === 'success' 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                : modalPopup.type === 'warning'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}>
              {modalPopup.type === 'success' && <CheckCircle2 className="w-9 h-9" />}
              {modalPopup.type === 'warning' && <AlertCircle className="w-9 h-9" />}
              {modalPopup.type === 'error' && <XCircle className="w-9 h-9" />}
            </div>

            <div>
              <h3 className="text-xl font-extrabold font-prompt text-slate-900">
                {modalPopup.title}
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                {modalPopup.message}
              </p>
            </div>

            <button
              onClick={() => setModalPopup(null)}
              className={`w-full py-3 rounded-2xl font-extrabold text-sm transition-all shadow-md ${
                modalPopup.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : modalPopup.type === 'warning'
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
