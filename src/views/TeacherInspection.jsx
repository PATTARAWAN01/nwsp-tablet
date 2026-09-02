import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService } from '../services/inspectionService';
import { 
  CheckCircle2, 
  Save, 
  Lock, 
  KeyRound, 
  Search, 
  LogOut, 
  ShieldCheck,
  Tablet,
  PenTool,
  Keyboard,
  Zap,
  UserCheck,
  XCircle,
  AlertCircle,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

export default function TeacherInspection() {
  const { config, teacherSession, loginTeacherRoom, logoutTeacher } = useAuth();
  
  const [selectedGrade, setSelectedGrade] = useState(teacherSession ? teacherSession.grade : "ม.4");
  const [selectedRoom, setSelectedRoom] = useState(teacherSession ? teacherSession.room : "1");
  const [teacherNameInput, setTeacherNameInput] = useState(teacherSession ? teacherSession.teacherName : "");
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Storage for inspection checklist state per device serial_no
  // Format: { [serial_no]: { tablet: { status: 'normal'|'damaged'|'lost', note: '' }, ... } }
  const [inspectionsData, setInspectionsData] = useState({});

  // Popup Modal Alert
  const [modalPopup, setModalPopup] = useState(null);

  const roomKey = selectedGrade === "ครู" ? "ครู" : `${selectedGrade}/${selectedRoom}`;

  const loadDevicesAndInspections = async () => {
    setLoading(true);
    try {
      const devList = await deviceService.getDevices({
        academicYear: config.current_academic_year,
        grade: selectedGrade,
        room: selectedRoom
      });
      setDevices(devList);

      const existingIns = await inspectionService.getInspections(
        config.current_academic_year, 
        config.current_round
      );

      const initialData = {};
      devList.forEach(dev => {
        if (existingIns[dev.serial_no]) {
          initialData[dev.serial_no] = existingIns[dev.serial_no].items || {};
        } else {
          // Neutral initial state (status: null, note: '') requiring active selection
          initialData[dev.serial_no] = {
            tablet: { status: null, note: '' },
            spen: { status: null, note: '' },
            keyboard: { status: null, note: '' },
            cable_white: { status: null, note: '' },
            cable_black: { status: null, note: '' },
            adapter: { status: null, note: '' }
          };
        }
      });
      setInspectionsData(initialData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherSession) {
      loadDevicesAndInspections();
    }
  }, [teacherSession, selectedGrade, selectedRoom, config.current_academic_year, config.current_round]);

  const handleRoomLogin = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!teacherNameInput || teacherNameInput.trim() === "") {
      setAuthError("กรุณากรอกชื่อ-นามสกุล ครูผู้ตรวจเช็ค");
      return;
    }

    const res = await loginTeacherRoom(selectedGrade, selectedRoom, pinInput, teacherNameInput.trim());
    if (!res.success) {
      setAuthError(res.message);
    } else {
      setPinInput("");
    }
  };

  const handleItemStatusChange = (serialNo, itemKey, statusValue) => {
    setInspectionsData(prev => ({
      ...prev,
      [serialNo]: {
        ...prev[serialNo],
        [itemKey]: {
          ...(prev[serialNo]?.[itemKey] || {}),
          status: statusValue
        }
      }
    }));
  };

  const handleItemNoteChange = (serialNo, itemKey, noteValue) => {
    setInspectionsData(prev => ({
      ...prev,
      [serialNo]: {
        ...prev[serialNo],
        [itemKey]: {
          ...(prev[serialNo]?.[itemKey] || {}),
          note: noteValue
        }
      }
    }));
  };

  const handleMarkStudentAllNormal = (serialNo) => {
    setInspectionsData(prev => ({
      ...prev,
      [serialNo]: {
        tablet: { status: 'normal', note: '' },
        spen: { status: 'normal', note: '' },
        keyboard: { status: 'normal', note: '' },
        cable_white: { status: 'normal', note: '' },
        cable_black: { status: 'normal', note: '' },
        adapter: { status: 'normal', note: '' }
      }
    }));
  };

  const handleSaveInspections = async () => {
    const partiallyCheckedStudents = [];
    const recordsToSave = [];

    devices.forEach(dev => {
      const items = inspectionsData[dev.serial_no] || {};
      const selectedCount = Object.values(items).filter(it => it && it.status !== null).length;

      if (selectedCount === 6) {
        recordsToSave.push({
          device_id: dev.id,
          serial_no: dev.serial_no,
          items: items
        });
      } else if (selectedCount > 0 && selectedCount < 6) {
        partiallyCheckedStudents.push(`${dev.prefix || ''}${dev.first_name} ${dev.last_name}`);
      }
    });

    if (partiallyCheckedStudents.length > 0) {
      setModalPopup({
        type: 'warning',
        title: 'ตรวจเช็คอุปกรณ์ไม่ครบ 6 รายการ!',
        message: `มีอุปกรณ์ของนักเรียนที่เลือกยังไม่ครบทั้ง 6 รายการ: ${partiallyCheckedStudents.join(', ')} (กรุณาเลือก "ปกติ", "ชำรุด" หรือ "สูญหาย" ให้ครบทั้ง 6 รายการสำหรับเครื่องนั้นๆ หรือกด "ปกติทุกรายการ")`
      });
      return;
    }

    if (recordsToSave.length === 0) {
      setModalPopup({
        type: 'warning',
        title: 'ยังไม่มีข้อมูลที่จะบันทึก!',
        message: 'กรุณาทำการตรวจเช็คอุปกรณ์ให้ครบ 6 รายการอย่างน้อย 1 เครื่อง ก่อนกดบันทึกข้อมูล'
      });
      return;
    }

    setLoading(true);
    try {
      const inspectorName = teacherSession ? teacherSession.teacherName : "ครูประจำชั้น";

      await inspectionService.saveBatchInspection({
        academicYear: config.current_academic_year,
        round: config.current_round,
        roomKey: roomKey,
        recordsList: recordsToSave,
        inspector: inspectorName
      });

      setModalPopup({
        type: 'success',
        title: 'บันทึกผลการตรวจเช็คสำเร็จ! 🎉',
        message: `บันทึกข้อมูลอุปกรณ์จำนวน ${recordsToSave.length} เครื่อง ในรอบที่ ${config.current_round} เรียบร้อยแล้ว (โดย ${inspectorName})`
      });

      await loadDevicesAndInspections();
    } catch (e) {
      setModalPopup({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึก!',
        message: e.message
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.serial_no.toLowerCase().includes(q) ||
      (d.prefix && d.prefix.toLowerCase().includes(q)) ||
      d.first_name.toLowerCase().includes(q) ||
      d.last_name.toLowerCase().includes(q)
    );
  });

  const fullyCheckedCount = devices.filter(dev => {
    const items = inspectionsData[dev.serial_no] || {};
    return Object.values(items).filter(it => it && it.status !== null).length === 6;
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ระบบตรวจเช็คอุปกรณ์สำหรับครูที่ปรึกษา</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            บันทึกการตรวจเช็ค Tablet 6 รายการ
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            รอบการตรวจเช็คที่ {config.current_round} / 5 • ปีการศึกษา {config.current_academic_year}
          </p>
        </div>

        {teacherSession && (
          <button
            onClick={logoutTeacher}
            className="self-start md:self-auto px-4 py-2.5 bg-white/10 hover:bg-rose-600 text-white border border-white/20 rounded-2xl text-xs font-extrabold transition-colors shadow-xs flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากห้อง {teacherSession.grade}/{teacherSession.room}</span>
          </button>
        )}
      </div>

      {!teacherSession ? (
        
        /* PIN Login Card for Teachers */
        <div className="modern-glass-card rounded-3xl p-8 border border-white/80 shadow-xl max-w-md mx-auto space-y-6 animate-fade-in my-8">
          <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-900 flex items-center justify-center mx-auto border border-blue-200 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-extrabold font-prompt text-slate-900">
              เข้าสู่ระบบตรวจเช็คประจำห้อง
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              เลือกระดับชั้น/ห้อง และกรอกรหัส PIN ประจำห้องเพื่อเริ่มตรวจเช็ค
            </p>
          </div>

          <form onSubmit={handleRoomLogin} className="space-y-4 font-sarabun">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ระดับชั้น:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    if (e.target.value === 'ครู') setSelectedRoom('-');
                    else setSelectedRoom('1');
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ม.4">ม.4</option>
                  <option value="ม.5">ม.5</option>
                  <option value="ม.6">ม.6</option>
                  <option value="ครู">ครูผู้สอน</option>
                </select>
              </div>

              {selectedGrade !== 'ครู' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ห้อง:</label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="1">ห้อง 1</option>
                    <option value="2">ห้อง 2</option>
                    <option value="3">ห้อง 3</option>
                    <option value="4">ห้อง 4</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล ครูผู้ตรวจเช็ค:</label>
              <div className="relative">
                <UserCheck className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="เช่น นายสมชาย วิชาการ"
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">รหัส PIN ประจำห้อง:</label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="กรอกรหัส PIN..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-center text-xl font-mono font-extrabold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-5 h-5 text-amber-300" />
              <span>เข้าสู่หน้าตรวจเช็คห้อง {roomKey}</span>
            </button>
          </form>
        </div>
      ) : (

        /* Authorized Room Inspection Content */
        <div className="space-y-5">
          
          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-3xl border-2 border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="px-4 py-2 bg-blue-900 text-white font-extrabold font-prompt rounded-2xl text-sm shadow-xs">
                {roomKey} (ตรวจครบแล้ว {fullyCheckedCount}/{devices.length} เครื่อง)
              </span>

              <span className="px-3.5 py-1.5 bg-amber-100 text-amber-950 font-extrabold rounded-xl text-xs border border-amber-300">
                👤 ผู้ตรวจ: {teacherSession?.teacherName}
              </span>
              
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้น Serial No., ชื่อ-นามสกุล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <button
              onClick={handleSaveInspections}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-blue-600/30 flex items-center space-x-2"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'กำลังบันทึก...' : `บันทึกข้อมูลการตรวจ (${fullyCheckedCount} เครื่อง)`}</span>
            </button>

          </div>

          {/* List of Device Cards */}
          {filteredDevices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white/70 rounded-3xl border border-slate-200">
              ไม่พบข้อมูลอุปกรณ์ตามเงื่อนไขที่เลือกในห้องนี้
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDevices.map((dev, index) => {
                const devItems = inspectionsData[dev.serial_no] || {};
                
                const selectedCount = Object.values(devItems).filter(it => it && it.status !== null).length;
                const isAll6Selected = selectedCount === 6;

                const isAllNormal = isAll6Selected && Object.values(devItems).every(it => it && it.status === 'normal');

                return (
                  <div 
                    key={dev.id} 
                    className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 ${
                      isAll6Selected 
                        ? 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-200' 
                        : 'bg-white/90 border-slate-200 shadow-sm'
                    }`}
                  >
                    
                    {/* Device & Student Info Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      
                      <div className="flex items-start space-x-3.5">
                        <span className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-900 font-mono font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                          {index + 1}
                        </span>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                              dev.type === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              1. {dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน'}
                            </span>

                            <div className="flex items-center space-x-1.5 bg-blue-50 px-3 py-0.5 rounded-xl border border-blue-200">
                              <span className="text-[11px] text-blue-800 font-bold">2. Serial No:</span>
                              <span className="font-mono font-extrabold text-blue-900 text-base sm:text-lg tracking-wide">
                                {dev.serial_no}
                              </span>
                            </div>

                            {/* Per-Student Progress Badge */}
                            {isAll6Selected ? (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-extrabold border border-emerald-300">
                                ✓ ตรวจครบ 6/6
                              </span>
                            ) : selectedCount > 0 ? (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-extrabold border border-amber-300">
                                ⚠️ ตรวจยังไม่ครบ ({selectedCount}/6)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[11px] font-bold border border-slate-200">
                                ยังไม่ได้ตรวจ (0/6)
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-xl font-prompt pt-0.5">
                            3. {dev.prefix || ''} {dev.first_name} {dev.last_name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-semibold">
                            <span>4. ชั้น: <strong className="text-slate-900 font-extrabold">{dev.type === 'teacher' ? 'ครู' : `${dev.grade}/${dev.room}`}</strong></span>
                            <span>•</span>
                            <span>5. เลข BOX: <strong className="text-slate-900 font-mono font-extrabold">{dev.box_no}</strong></span>
                            <span>•</span>
                            <span>6. เลข BOX KB: <strong className="text-slate-900 font-mono font-extrabold">{dev.box_kb_no}</strong></span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMarkStudentAllNormal(dev.serial_no)}
                        className={`self-start md:self-center px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-1.5 border ${
                          isAllNormal
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                            : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border-emerald-300 shadow-xs'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ปกติทุกรายการ</span>
                      </button>
                    </div>

                    {/* 6 Checklist Items Grid with 3 Options: ปกติ / ชำรุด / สูญหาย */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                      {[
                        { key: 'tablet', label: '1. Tablet', icon: Tablet },
                        { key: 'spen', label: '2. ปากกา S Pen', icon: PenTool },
                        { key: 'keyboard', label: '3. คีย์บอร์ด', icon: Keyboard },
                        { key: 'cable_white', label: '4. สาย Tablet (ขาว)', icon: Zap },
                        { key: 'cable_black', label: '5. สาย KB (ดำ)', icon: Zap },
                        { key: 'adapter', label: '6. Adapter', icon: Zap }
                      ].map((item) => {
                        const Icon = item.icon;
                        const current = devItems[item.key] || { status: null, note: '' };
                        const isNormal = current.status === 'normal';
                        const isDamaged = current.status === 'damaged';
                        const isLost = current.status === 'lost';

                        return (
                          <div 
                            key={item.key} 
                            className={`p-3.5 rounded-2xl border text-xs transition-all ${
                              isLost
                                ? 'bg-purple-100/90 border-purple-300 shadow-xs'
                                : isDamaged 
                                ? 'bg-rose-100/90 border-rose-300 shadow-xs' 
                                : isNormal 
                                ? 'bg-emerald-50 border-emerald-300' 
                                : 'bg-slate-50/90 border-slate-200/90'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center space-x-2 font-bold text-slate-800">
                                <Icon className={`w-4 h-4 ${isLost ? 'text-purple-700' : isDamaged ? 'text-rose-600' : isNormal ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span>{item.label}</span>
                              </div>

                              {/* 3 Interactive Action Option Buttons: ปกติ / ชำรุด / สูญหาย */}
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(dev.serial_no, item.key, 'normal')}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1 border ${
                                    isNormal
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 scale-105'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white shadow-2xs'
                                  }`}
                                >
                                  <CheckCircle2 className={`w-3.5 h-3.5 ${isNormal ? 'text-white' : 'text-emerald-600'}`} />
                                  <span>ปกติ</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(dev.serial_no, item.key, 'damaged')}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1 border ${
                                    isDamaged
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300 scale-105'
                                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-600 hover:text-white shadow-2xs'
                                  }`}
                                >
                                  <AlertTriangle className={`w-3.5 h-3.5 ${isDamaged ? 'text-white' : 'text-rose-600'}`} />
                                  <span>ชำรุด</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(dev.serial_no, item.key, 'lost')}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1 border ${
                                    isLost
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300 scale-105'
                                      : 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-600 hover:text-white shadow-2xs'
                                  }`}
                                >
                                  <HelpCircle className={`w-3.5 h-3.5 ${isLost ? 'text-white' : 'text-purple-600'}`} />
                                  <span>สูญหาย</span>
                                </button>
                              </div>
                            </div>

                            {(isDamaged || isLost) && (
                              <input
                                type="text"
                                placeholder={isLost ? "ระบุรายละเอียดการสูญหาย (เช่น หายที่ห้องเรียน)..." : "ระบุอาการชำรุด..."}
                                value={current.note || ''}
                                onChange={(e) => handleItemNoteChange(dev.serial_no, item.key, e.target.value)}
                                className={`w-full mt-2 px-3 py-2 bg-white border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 shadow-inner ${
                                  isLost 
                                    ? 'border-purple-300 text-purple-950 focus:ring-purple-500 placeholder-purple-400' 
                                    : 'border-rose-300 text-rose-950 focus:ring-rose-500 placeholder-rose-400'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Bottom Save Bar */}
          <div className="sticky bottom-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between text-white z-30">
            <div className="text-xs sm:text-sm text-slate-200 font-bold">
              <span>บันทึกผลการตรวจ <strong>{roomKey}</strong> ประจำรอบที่ {config.current_round} ({teacherSession?.teacherName})</span>
            </div>
            <button
              onClick={handleSaveInspections}
              disabled={loading}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-400/30 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : `บันทึกข้อมูลการตรวจ (${fullyCheckedCount} เครื่อง)`}</span>
            </button>
          </div>

        </div>
      )}

      {/* POPUP NOTIFICATION MODAL */}
      {modalPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border-2 border-slate-200 shadow-2xl">
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
