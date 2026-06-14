import React, { useState } from "react";
import { 
  Heart, 
  Activity, 
  MessageSquare, 
  User, 
  Plus, 
  PlusCircle, 
  Search, 
  MapPin, 
  Phone, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  FileText, 
  Bell, 
  Brain, 
  Smile, 
  ShieldAlert, 
  Check, 
  Maximize2, 
  Target, 
  Clock, 
  Award,
  Zap,
  Mic,
  Home,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  Battery,
  Wifi,
  Signal,
  ArrowRight
} from "lucide-react";

const FlowArrow = () => (
  <div className="flex items-center justify-center text-slate-500 self-center mx-1 z-10 shrink-0">
    <ArrowRight className="w-5 h-5 text-slate-500 stroke-[3.5]" />
  </div>
);

// Helper components for the device frame
const StatusBar = () => (
  <div className="flex justify-between items-center px-4 py-1.5 text-xs text-slate-700 font-semibold select-none bg-transparent">
    <span>9:41</span>
    <div className="flex items-center gap-1.5">
      <Signal className="w-3.5 h-3.5" />
      <Wifi className="w-3.5 h-3.5" />
      <Battery className="w-4 h-4" />
    </div>
  </div>
);

const BottomNav = ({ active = 0, themeColor = "bg-violet-600" }) => {
  const tabs = [
    { icon: Home, label: "Home" },
    { icon: Calendar, label: "Meds" },
    { icon: Plus, label: "Add", isCenter: true },
    { icon: Activity, label: "Activity" },
    { icon: User, label: "Profile" }
  ];
  return (
    <div className="border-t border-slate-100 bg-white/90 backdrop-blur-md px-3 py-2 flex justify-between items-center relative z-10">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        if (tab.isCenter) {
          return (
            <div key={idx} className="flex justify-center -mt-6">
              <button className={`w-11 h-11 rounded-full text-white shadow-md shadow-violet-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${themeColor}`}>
                <Icon className="w-5.5 h-5.5" />
              </button>
            </div>
          );
        }
        const isActive = active === idx;
        return (
          <button key={idx} className="flex flex-col items-center flex-1 py-1">
            <Icon className={`w-5 h-5 ${isActive ? "text-violet-600 font-bold" : "text-slate-400"}`} />
            <span className={`text-[10px] mt-0.5 ${isActive ? "text-violet-600 font-medium" : "text-slate-400"}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const DeviceFrame = ({ children, title, step, activeTab = 0, themeColor = "bg-violet-600" }) => (
  <div className="flex flex-col items-center">
    {/* Step Title Header */}
    <div className="mb-2.5 text-center">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold mr-1.5 shadow-sm">
        {step}
      </span>
      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</span>
    </div>
    
    {/* Phone Frame */}
    <div className="w-[280px] h-[550px] rounded-[36px] bg-slate-900 p-2.5 shadow-xl border border-slate-800 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-slate-700">
      {/* Inner Screen */}
      <div className="flex-1 rounded-[28px] bg-slate-50 overflow-hidden flex flex-col relative border border-slate-950/5">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-b-xl z-20 flex justify-center items-center">
          <div className="w-10 h-1 bg-slate-800 rounded-full" />
        </div>
        
        {/* Content Area */}
        <StatusBar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative pt-1.5">
          {children}
        </div>
        <BottomNav active={activeTab} themeColor={themeColor} />
      </div>
    </div>
  </div>
);

// Individual Screen Mockups

// 1. Welcome / Login
const WelcomeLoginScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-6 rounded-b-[24px] shadow-sm relative">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-white/80 font-medium">Good Afternoon</p>
          <h3 className="text-lg font-bold">Guest</h3>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
          <span className="text-lg">🐻</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle cx="24" cy="24" r="20" className="stroke-white/10" strokeWidth="4" fill="none" />
            <circle cx="24" cy="24" r="20" className="stroke-white" strokeWidth="4" fill="none" strokeDasharray="125" strokeDashoffset="125" />
          </svg>
          <span className="absolute text-[10px] font-bold">0%</span>
        </div>
        <div>
          <p className="text-xs font-semibold">0/6 Tasks today</p>
          <span className="inline-block bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-0.5">High Risk</span>
        </div>
      </div>
    </div>

    {/* Metrics Grid */}
    <div className="grid grid-cols-3 gap-2 px-3 -mt-3 relative z-10">
      {[
        { val: "3", label: "Medicines", color: "text-emerald-600 bg-emerald-50" },
        { val: "3", label: "Recovery", color: "text-blue-600 bg-blue-50" },
        { val: "0", label: "Alerts", color: "text-rose-600 bg-rose-50" }
      ].map((item, idx) => (
        <div key={idx} className={`p-2.5 rounded-xl text-center shadow-sm border border-slate-100 ${item.color}`}>
          <p className="text-base font-extrabold">{item.val}</p>
          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">{item.label}</p>
        </div>
      ))}
    </div>

    {/* Weekly Chart */}
    <div className="p-3">
      <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xs">
        <p className="text-xs font-bold text-slate-800 mb-2">This Week</p>
        <div className="flex justify-between items-end h-14 px-1">
          {[
            { day: "M", val: 30 },
            { day: "T", val: 50 },
            { day: "W", val: 20 },
            { day: "T", val: 80 },
            { day: "F", val: 40 },
            { day: "S", val: 0 },
            { day: "S", val: 0 }
          ].map((bar, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1 gap-1">
              <div className="w-2.5 bg-slate-100 rounded-full h-10 relative overflow-hidden">
                <div 
                  className="bg-violet-600 absolute bottom-0 left-0 right-0 rounded-full" 
                  style={{ height: `${bar.val}%` }} 
                />
              </div>
              <span className="text-[9px] text-slate-400 font-semibold">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Reminders List */}
    <div className="px-3 flex-1 flex flex-col justify-end pb-3">
      <p className="text-xs font-bold text-slate-800 mb-1.5">Reminders</p>
      <div className="bg-white border border-slate-100 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Metformin 500mg</p>
            <p className="text-[10px] text-slate-400">06:00 AM · Missed</p>
          </div>
        </div>
        <button className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-lg">
          Take
        </button>
      </div>
    </div>
  </div>
);

// 2. My Medicines
const MyMedicinesScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold">My Medicines</h3>
          <p className="text-xs text-white/80 mt-0.5">0 of 6 taken today</p>
        </div>
        <button className="bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          Take Now
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mt-4 bg-white/10 p-0.5 rounded-lg border border-white/5">
        {["Today", "All Meds", "Refills"].map((t, i) => (
          <button key={i} className={`flex-1 py-1 text-xs font-semibold rounded-md ${i === 0 ? "bg-white text-violet-700 shadow-xs" : "text-white"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>

    {/* Meds List */}
    <div className="p-3.5 space-y-3 flex-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Morning</span>
        <button className="text-[10px] text-violet-600 font-bold">Edit</button>
      </div>

      {/* Missed Card */}
      <div className="bg-white border border-rose-100 rounded-2xl p-3 flex items-start justify-between shadow-xs border-l-4 border-l-rose-500">
        <div className="flex gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center font-bold text-rose-600 text-sm">
            M
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Metformin</h4>
            <p className="text-[10px] font-semibold text-slate-400">500mg</p>
            <p className="text-[10px] text-rose-500 font-semibold mt-1">🕒 06:00 AM · Missed</p>
          </div>
        </div>
        <span className="text-[9px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full uppercase">Missed</span>
      </div>

      {/* Taken Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-start justify-between shadow-xs border-l-4 border-l-emerald-500">
        <div className="flex gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center font-bold text-emerald-600 text-sm">
            L
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Lisinopril</h4>
            <p className="text-[10px] font-semibold text-slate-400">10mg</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">🕒 08:00 AM · Taken</p>
          </div>
        </div>
        <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full uppercase">Taken</span>
      </div>
    </div>
  </div>
);

// 3. Caregiver Dashboard (Care Control Center)
const CaregiverDashboardScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-800 to-indigo-900 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-base font-bold leading-tight">Care Control Center</h3>
          <p className="text-xs text-indigo-200">Welcome, Urvashi</p>
        </div>
        <button className="bg-indigo-600/60 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-indigo-500/30 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New Plan
        </button>
      </div>

      {/* Metric Bar */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl p-2.5 border border-white/5 grid grid-cols-4 gap-1 text-center">
        {[
          { label: "Total", val: 3, col: "text-white" },
          { label: "High Risk", val: 1, col: "text-rose-400" },
          { label: "Attention", val: 1, col: "text-amber-400" },
          { label: "Stable", val: 1, col: "text-emerald-400" }
        ].map((item, idx) => (
          <div key={idx} className={idx < 3 ? "border-r border-white/10" : ""}>
            <p className="text-xs text-white/50 text-[9px] uppercase font-bold tracking-wider">{item.label}</p>
            <p className={`text-base font-black ${item.col}`}>{item.val}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Smart Alerts */}
    <div className="p-3 space-y-3 flex-1 overflow-y-auto">
      <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 shadow-xs">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Smart Alerts</span>
          </div>
          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">2</span>
        </div>
        <div className="space-y-1.5 text-[10.5px] text-rose-950 font-medium pl-1">
          <p className="flex items-center gap-1">⚠️ Mary Smith missed 2 doses today</p>
          <p className="flex items-center gap-1">🚨 Mary Smith reported high-risk symptoms</p>
        </div>
      </div>

      {/* Priority Patient List */}
      <div>
        <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          👥 Priority Patient List
        </p>

        {/* Mary Smith Card */}
        <div className="bg-white border border-rose-100 rounded-2xl p-3 shadow-xs mb-3 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">
                MS
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Mary Smith</h4>
                <p className="text-[9px] font-medium text-slate-400">Post-op Knee Replacement</p>
              </div>
            </div>
            <span className="bg-rose-100 text-rose-700 text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase">
              High Risk
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 mt-2.5 text-[9px] text-slate-500 font-semibold bg-slate-50 p-1.5 rounded-lg">
            <div className="text-center">💊 0/3 doses</div>
            <div className="text-center border-x border-slate-200">🕒 05:30 am</div>
            <div className="text-center text-rose-600">📈 0% adherence</div>
          </div>

          <div className="mt-2 text-[10px] text-rose-800 font-semibold pl-1 space-y-0.5">
            <p>• Missed 2 doses today</p>
            <p>• High-risk symptoms reported</p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {["Remind", "Call", "Message", "Details"].map((act, i) => (
              <button 
                key={i} 
                className={`py-1 text-[9px] font-bold rounded-lg border text-center ${
                  act === "Details" 
                    ? "bg-violet-50 border-violet-100 text-violet-700 col-span-1" 
                    : "bg-white border-slate-100 text-slate-700"
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Riya Patel Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                RP
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Riya Patel</h4>
                <p className="text-[9px] font-medium text-slate-400">Viral Pneumonia Recovery</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-700 text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase">
              Attention
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 mt-2.5 text-[9px] text-slate-500 font-semibold bg-slate-50 p-1.5 rounded-lg">
            <div className="text-center">💊 1/1 doses</div>
            <div className="text-center border-x border-slate-200">🕒 01:32 am</div>
            <div className="text-center text-emerald-600">📈 100% adherence</div>
          </div>

          <div className="mt-2 text-[10px] text-amber-800 font-semibold pl-1 space-y-0.5">
            <p>• Moderate symptoms reported</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {["Remind", "Call", "Message"].map((act, i) => (
              <button 
                key={i} 
                className="py-1 text-[9px] font-bold rounded-lg border text-center bg-white border-slate-100 text-slate-700"
              >
                {act}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 4. Symptoms Tracker
const SymptomsTrackerScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold">Symptoms</h3>
          <p className="text-xs text-white/80 mt-0.5">Track · Trend · Recovery</p>
        </div>
        <button className="bg-white/20 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Log Today
        </button>
      </div>
    </div>

    {/* Trend Chart */}
    <div className="p-3.5 space-y-3.5 flex-1">
      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-bold text-slate-800">Symptom Trend</p>
          <span className="text-[9px] bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-full">Last 7 days</span>
        </div>
        {/* Simple line graph representation */}
        <div className="h-24 relative mt-2 flex items-end">
          <svg className="w-full h-full overflow-visible">
            <path 
              d="M 10 70 L 45 60 L 85 45 L 125 50 L 165 30 L 205 25 L 240 10" 
              fill="none" 
              stroke="#8B5CF6" 
              strokeWidth="3.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Grid dots */}
            {[
              {x:10, y:70}, {x:45, y:60}, {x:85, y:45}, {x:125, y:50}, {x:165, y:30}, {x:205, y:25}, {x:240, y:10}
            ].map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="4.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
          </svg>
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-2.5 px-1.5">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
      </div>

      {/* Log Detail Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs">
        <div className="flex justify-between items-center mb-2.5">
          <div>
            <p className="text-[10px] text-slate-400 font-bold">Apr 10, 01:06 PM</p>
          </div>
          <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">
            Medium
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-violet-50/50 p-2 rounded-xl text-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Severity</p>
            <p className="text-base font-extrabold text-violet-700">5/10</p>
          </div>
          <div className="bg-violet-50/50 p-2 rounded-xl text-center flex flex-col justify-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Symptoms</p>
            <p className="text-[10px] font-bold text-slate-800 mt-0.5">Headache, Dizziness</p>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 font-medium mt-3 italic pl-1">
          "Past Feeling: Nausea/Dizziness after lunch"
        </p>
      </div>
    </div>
  </div>
);

// 5. My Progress
const MyProgressScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold">My Progress</h3>
          <p className="text-xs text-white/80 mt-0.5">4 of 5 achievements</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg border border-white/10">
          🔥
        </div>
      </div>
    </div>

    {/* Streak Card */}
    <div className="p-3.5 space-y-3.5 flex-1">
      <div className="bg-gradient-to-br from-amber-500 to-rose-500 text-white rounded-2xl p-4 shadow-md text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl translate-x-4 -translate-y-4" />
        <div className="flex justify-center mb-1">
          <span className="text-3xl filter drop-shadow-md animate-bounce">🔥</span>
        </div>
        <h4 className="text-base font-black tracking-tight">7 Day Streak</h4>
        <p className="text-[10px] text-amber-100 font-semibold mb-3">You're on fire! Keep going!</p>
        
        {/* Days circle row */}
        <div className="flex justify-between gap-1 mt-2 px-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold border border-white/25 shadow-xs">
                ✓
              </div>
              <span className="text-[9px] text-white/90 font-bold mt-1">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Level Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-sm">
          2
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-800">Getting Stronger</p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-1 relative overflow-hidden">
            <div className="bg-violet-600 h-2 rounded-full" style={{ width: "35%" }} />
          </div>
          <p className="text-[9px] text-slate-400 font-semibold mt-1">35% · 25 pts to next level</p>
        </div>
      </div>

      {/* Calendar Grid Summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs">
        <p className="text-xs font-bold text-slate-800 mb-2">Adherence Calendar</p>
        <div className="flex justify-between gap-1 text-[9px] font-bold text-slate-400 mt-1 mb-2 px-1">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Perfect</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Good</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Partial</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Missed</span>
        </div>
        <div className="grid grid-cols-7 gap-1 mt-1 text-center font-semibold text-[9px] text-slate-700">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <div key={i} className="text-slate-400 py-1">{day}</div>
          ))}
          {Array.from({ length: 14 }).map((_, i) => {
            const dayNum = i + 7;
            let dotCol = "bg-emerald-500 text-white";
            if (dayNum === 10) dotCol = "bg-rose-500 text-white";
            if (dayNum === 8 || dayNum === 13) dotCol = "bg-amber-500 text-white";
            return (
              <div key={i} className={`p-1.5 rounded-lg font-bold flex flex-col items-center justify-center ${dotCol}`}>
                <span>{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

// 6. Prescription Scanner
const PrescriptionScannerScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-900 text-white p-3">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-bold text-indigo-300">PRESCRIPTION SCANNER</span>
      <Maximize2 className="w-4 h-4 text-slate-400" />
    </div>

    {/* Simulated Camera Scanner box */}
    <div className="flex-1 bg-slate-950 border border-indigo-500/30 rounded-2xl p-3 relative flex flex-col overflow-hidden">
      {/* Target Corner brackets */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
      
      {/* Scanning laser line animation */}
      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent top-1/3 shadow-sm shadow-indigo-400/50" />

      {/* Scanned Paper Document */}
      <div className="flex-1 bg-white text-slate-800 p-3 rounded-lg shadow-inner font-mono text-[8px] flex flex-col leading-tight select-none">
        {/* Clinic Info */}
        <div className="border-b border-slate-200 pb-1 flex justify-between items-start">
          <div>
            <h5 className="font-bold text-[9px] text-slate-950">Dr. Rahul Sharma</h5>
            <p className="text-[7px]">MBBS, MD - General Medicine</p>
          </div>
          <div className="text-right text-[7px]">
            <p>City Care Clinic</p>
            <p>sharma.clinic@gmail.com</p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 gap-1 py-1.5 border-b border-slate-200 text-[7px] font-semibold">
          <div>Patient: Rajat Kumar</div>
          <div>Date: 24/05/2026</div>
          <div>Age/Sex: 26 Y / M</div>
          <div>Weight: 77 Kg</div>
        </div>

        {/* Diagnosis */}
        <div className="py-1">
          <span className="font-bold">Diagnosis:</span> Post-op Recovery, Mild Fever
        </div>

        {/* Medicines Table */}
        <div className="flex-1 mt-1 border-t border-slate-200 pt-1">
          <div className="grid grid-cols-12 font-bold bg-slate-50 p-1 border-b border-slate-200">
            <span className="col-span-1">No</span>
            <span className="col-span-5">Medicine</span>
            <span className="col-span-3">Freq</span>
            <span className="col-span-3">Dur</span>
          </div>
          <div className="space-y-1 mt-1">
            {[
              { n: "1", m: "Tab Paracetamol", f: "1-0-1", d: "5 days" },
              { n: "2", m: "Tab Amoxicillin", f: "1-1-1", d: "5 days" },
              { n: "3", m: "Syr Cough Relief", f: "0-0-1", d: "3 days" }
            ].map((med, idx) => (
              <div key={idx} className="grid grid-cols-12 p-0.5 border-b border-slate-100 text-slate-600">
                <span className="col-span-1">{med.n}</span>
                <span className="col-span-5 font-bold text-slate-800">{med.m}</span>
                <span className="col-span-3">{med.f}</span>
                <span className="col-span-3">{med.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info / Signature */}
        <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[7px] font-semibold mt-auto">
          <div>
            <p className="text-rose-600 font-bold">🚨 EMERGENCY ADVICE:</p>
            <p className="text-[6.5px] text-slate-500">High Fever, Breathing Difficulty</p>
          </div>
          <div className="text-center">
            <span className="italic font-serif">Dr. R. Sharma</span>
            <p className="text-[6.5px] border-t border-slate-300">Signature & Seal</p>
          </div>
        </div>
      </div>

      {/* Bottom control scan indicator */}
      <div className="mt-2 text-center text-[9px] text-indigo-300 font-bold bg-indigo-950/50 py-1 rounded-md border border-indigo-900/40">
        📄 Processing OCR Document...
      </div>
    </div>
  </div>
);

// 7. Reminders
const RemindersScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold">Reminders</h3>
          <p className="text-xs text-white/80 mt-0.5">Never miss a recovery dose</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mt-4 bg-white/10 p-0.5 rounded-lg border border-white/5">
        {["Today", "Upcoming"].map((t, i) => (
          <button key={i} className={`flex-1 py-1 text-xs font-semibold rounded-md ${i === 0 ? "bg-white text-violet-700 shadow-xs" : "text-white"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>

    {/* Reminders list */}
    <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
      {[
        { time: "8:00 AM", name: "Metformin", details: "Take before breakfast", icon: Bell, bg: "bg-violet-50 text-violet-600" },
        { time: "12:00 PM", name: "Lisinopril", details: "Take after lunch", icon: Bell, bg: "bg-emerald-50 text-emerald-600" },
        { time: "6:00 PM", name: "Warfarin", details: "Take before dinner", icon: Bell, bg: "bg-rose-50 text-rose-600" }
      ].map((rem, idx) => (
        <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${rem.bg}`}>
              <rem.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{rem.time} · {rem.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{rem.details}</p>
            </div>
          </div>
          <button className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
            ✓
          </button>
        </div>
      ))}
    </div>
  </div>
);

// 8. Activity Tracker
const ActivityTrackerScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm relative">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold">Activity</h3>
          <p className="text-xs text-white/80 mt-0.5">Track your recovery movement</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mt-4 bg-white/10 p-0.5 rounded-lg border border-white/5">
        {["Daily", "Weekly", "Monthly"].map((t, i) => (
          <button key={i} className={`flex-1 py-1 text-xs font-semibold rounded-md ${i === 0 ? "bg-white text-violet-700 shadow-xs" : "text-white"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>

    {/* Circle Progress */}
    <div className="p-3.5 space-y-4 flex-1">
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-col items-center">
        <div className="relative w-28 h-28 flex flex-col items-center justify-center">
          {/* SVG Progress Circle */}
          <svg className="w-28 h-28 transform -rotate-90">
            <circle cx="56" cy="56" r="48" className="stroke-slate-100" strokeWidth="8" fill="none" />
            <circle cx="56" cy="56" r="48" className="stroke-violet-600" strokeWidth="8" fill="none" strokeDasharray="301" strokeDashoffset="90" strokeLinecap="round" />
          </svg>
          <div className="absolute text-center">
            <p className="text-base font-black text-slate-800">4,250</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Steps</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 font-bold mt-3">Goal: 6,000 steps</p>
      </div>

      {/* Stats list */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Distance", val: "2.9 Km", color: "bg-blue-50 text-blue-600" },
          { label: "Calories", val: "180 Kcal", color: "bg-rose-50 text-rose-600" },
          { label: "Active Time", val: "45 Mins", color: "bg-amber-50 text-amber-600" }
        ].map((stat, idx) => (
          <div key={idx} className={`p-2.5 rounded-xl text-center border border-slate-100/50 shadow-xs ${stat.color}`}>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{stat.label}</p>
            <p className="text-xs font-black mt-0.5">{stat.val}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 9. Messages
const MessagesScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50">
    {/* Header */}
    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm relative">
      <h3 className="text-base font-bold">Messages</h3>
      <p className="text-xs text-white/80 mt-0.5">Connect with your care team</p>
    </div>

    {/* Chats List */}
    <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
      {[
        { name: "Dr. Smith", text: "Please drink more water video", time: "10:30 AM", unread: true, initials: "DS", bg: "bg-violet-100 text-violet-700" },
        { name: "Care Team", text: "Great job on your progress!", time: "Yesterday", unread: false, initials: "CT", bg: "bg-indigo-100 text-indigo-700" },
        { name: "Mary (Caregiver)", text: "Don't forget your meds! 💊", time: "Yesterday", unread: false, initials: "MC", bg: "bg-rose-100 text-rose-700" },
        { name: "Health Tips", text: "Drink water and rest well.", time: "2 days ago", unread: false, initials: "HT", bg: "bg-emerald-100 text-emerald-700" }
      ].map((chat, idx) => (
        <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${chat.bg}`}>
              {chat.initials}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{chat.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold leading-none">{chat.text}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-slate-400">{chat.time}</p>
            {chat.unread && (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-600 mt-1 shadow-sm" />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 10. Blood Network / Donor (replaces Alerts)
const BloodDonorScreen = () => (
  <div className="flex-1 flex flex-col bg-rose-50/40">
    {/* Header */}
    <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-pink-500 text-white px-4 pt-4 pb-5 rounded-b-[24px] shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-bold flex items-center gap-1">
          🩸 Blood Network
        </h3>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-white/80" />
          <MapPin className="w-4 h-4 text-white/80" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/5">
        {["Requests", "Donors", "My Profile"].map((t, i) => (
          <button key={i} className={`flex-1 py-1 text-xs font-semibold rounded-md ${i === 0 ? "bg-white text-rose-700 shadow-xs" : "text-white"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>

    {/* Content */}
    <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
      {/* Request Button */}
      <button className="w-full bg-rose-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-rose-200 flex items-center justify-center gap-1.5 transition-transform active:scale-95">
        <PlusCircle className="w-4.5 h-4.5" /> Request Blood
      </button>

      {/* Request Card 1 */}
      <div className="bg-white border border-rose-100 rounded-2xl p-3 shadow-xs border-l-4 border-l-rose-600">
        <div className="flex justify-between items-start">
          <div className="flex gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center font-black text-rose-600 text-sm">
              O+
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Rajesh Kumar</h4>
              <p className="text-[9px] font-medium text-slate-400">City Care Clinic · 1.5 km</p>
            </div>
          </div>
          <span className="bg-rose-100 text-rose-700 text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase">
            Critical
          </span>
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className="text-[10px] text-slate-600 font-bold">2 units needed</span>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors">
            <Phone className="w-3.5 h-3.5 fill-white" /> Call
          </button>
        </div>
      </div>

      {/* Request Card 2 */}
      <div className="bg-white border border-rose-100 rounded-2xl p-3 shadow-xs border-l-4 border-l-amber-500">
        <div className="flex justify-between items-start">
          <div className="flex gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center font-black text-rose-600 text-sm">
              A-
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Riya Patel</h4>
              <p className="text-[9px] font-medium text-slate-400">Max Hospital · 3.8 km</p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-700 text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase">
            Needed
          </span>
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className="text-[10px] text-slate-600 font-bold">1 unit needed</span>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors">
            <Phone className="w-3.5 h-3.5 fill-white" /> Call
          </button>
        </div>
      </div>
    </div>
  </div>
);

// 11. Family Dashboard / Wellness Circle (replaces Profile & Settings)
const FamilyDashboardScreen = () => (
  <div className="flex-1 flex flex-col bg-slate-50 relative">
    {/* Top Bar / Greeting */}
    <div className="px-4 pt-3 pb-2 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center border border-violet-200">
          <span className="text-base">👩🏻</span>
        </div>
        <div>
          <h4 className="text-[11px] font-bold text-slate-400 leading-none">Welcome back,</h4>
          <h3 className="text-xs font-extrabold text-slate-800 mt-1">मारिया!</h3>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-500 shadow-xs relative">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
        </div>
        <span className="text-xs">☀️</span>
      </div>
    </div>

    {/* Wellness Circle List */}
    <div className="px-4 py-2 bg-white border-y border-slate-100 shadow-2xs">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Wellness Circle</span>
        <button className="text-[9px] text-violet-600 font-extrabold flex items-center">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex justify-between items-center gap-2 py-0.5">
        {[
          { color: "bg-rose-400 text-white", name: "मारिया", label: "Self" },
          { color: "bg-teal-400 text-white", name: "ईथन", label: "Nephew" },
          { color: "bg-olive-400 bg-lime-600 text-white", name: "योना", label: "Cousin" },
          { color: "bg-sky-400 text-white", name: "आन्या", label: "Niece" }
        ].map((circ, idx) => (
          <div key={idx} className="flex flex-col items-center flex-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border border-white shadow-sm ${circ.color}`}>
              {circ.name.substring(0, 2)}
            </div>
            <span className="text-[9px] font-bold text-slate-800 mt-1 leading-none">{circ.name}</span>
            <span className="text-[7.5px] text-slate-400 mt-0.5 font-medium">{circ.label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Today's Checklist */}
    <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-600 text-white rounded-2xl p-3.5 shadow-sm border border-violet-800/10">
        <p className="text-[10px] text-violet-100 font-bold uppercase tracking-wider">Today's Wellness Checklist</p>
        <h3 className="text-base font-black mt-1">1 of 5 Completed</h3>
        <div className="w-full bg-white/20 rounded-full h-2 mt-2.5 relative overflow-hidden">
          <div className="bg-white h-2 rounded-full" style={{ width: "20%" }} />
        </div>
        <div className="grid grid-cols-3 gap-1 mt-3.5 text-center bg-black/10 rounded-xl p-2 border border-white/5">
          {[
            { label: "Pending", val: 3, col: "text-amber-300" },
            { label: "Completed", val: 1, col: "text-white" },
            { label: "Upcoming", val: 1, col: "text-indigo-200" }
          ].map((item, idx) => (
            <div key={idx} className={idx < 2 ? "border-r border-white/10" : ""}>
              <p className="text-[7.5px] text-white/50 font-bold uppercase">{item.label}</p>
              <p className={`text-xs font-black ${item.col} mt-0.5`}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "View Heart Metrics", sub: "Heart rate & BP", icon: Heart, bg: "bg-rose-50/70 border-rose-100/50 text-rose-600" },
            { label: "Schedule Lab Test", sub: "Blood & Urine", icon: Stethoscope, bg: "bg-blue-50/70 border-blue-100/50 text-blue-600" },
            { label: "Request Appointment", sub: "Doctor consultation", icon: Calendar, bg: "bg-violet-50/70 border-violet-100/50 text-violet-600" },
            { label: "Check Mental Well-being", sub: "Mood & anxiety", icon: Brain, bg: "bg-amber-50/70 border-amber-100/50 text-amber-600" }
          ].map((act, i) => (
            <div key={i} className={`p-2.5 rounded-xl border shadow-2xs flex flex-col justify-between h-20 ${act.bg}`}>
              <act.icon className="w-5 h-5 opacity-90" />
              <div>
                <p className="text-[9.5px] font-extrabold leading-tight">{act.label}</p>
                <p className="text-[7.5px] text-slate-400 font-semibold mt-0.5 leading-none">{act.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Actions & Events */}
      <div className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
            RS
          </div>
          <div>
            <h5 className="text-[10.5px] font-bold text-slate-800">Rajesh Sharma</h5>
            <p className="text-[8.5px] text-slate-400 font-semibold">Schedule Dental Cleaning</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-right">
          <span className="text-[8px] font-bold text-slate-400">10:30 AM</span>
          <Bell className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </div>

    {/* Floating Microphone button */}
    <button className="absolute bottom-16 right-4 w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg flex items-center justify-center border border-violet-500/20 transition-all hover:scale-105 active:scale-95">
      <Mic className="w-5 h-5" />
    </button>
  </div>
);

// 12. Outcome
const OutcomeScreen = () => (
  <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 p-4">
    <div className="w-full max-w-[240px] border-2 border-dashed border-emerald-400 rounded-2xl p-4 bg-white shadow-xs text-center flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center shadow-inner border border-emerald-100">
        <Target className="w-8 h-8 text-emerald-600" />
      </div>

      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Better Recovery</h4>
        <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto mt-1.5" />
      </div>

      <ul className="w-full text-left space-y-3.5 text-slate-700 text-xs font-semibold px-1 py-1">
        {[
          "Improved Adherence",
          "Timely Reminders",
          "Faster Recovery",
          "Better Outcomes"
        ].map((item, idx) => (
          <li key={idx} className="flex items-center gap-2 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-slate-800 font-extrabold">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// Main Workflow component that arranges everything into a sequence
export function Preview() {
  const [viewMode, setViewMode] = useState<"grid" | "individual">("grid");
  const [currentScreenIdx, setCurrentScreenIdx] = useState<number>(0);

  const screens = [
    { component: <WelcomeLoginScreen />, title: "Welcome / Login", step: "1", tab: 0, color: "bg-violet-600" },
    { component: <MyMedicinesScreen />, title: "My Medicines", step: "2", tab: 1, color: "bg-violet-600" },
    { component: <CaregiverDashboardScreen />, title: "Caregiver Dashboard", step: "3", tab: 4, color: "bg-indigo-900" },
    { component: <SymptomsTrackerScreen />, title: "Symptoms Tracker", step: "4", tab: 3, color: "bg-violet-600" },
    { component: <MyProgressScreen />, title: "My Progress", step: "5", tab: 3, color: "bg-violet-600" },
    { component: <PrescriptionScannerScreen />, title: "Prescription Scanner", step: "6", tab: 2, color: "bg-slate-900" },
    { component: <RemindersScreen />, title: "Reminders", step: "7", tab: 1, color: "bg-violet-600" },
    { component: <ActivityTrackerScreen />, title: "Activity Tracker", step: "8", tab: 3, color: "bg-violet-600" },
    { component: <MessagesScreen />, title: "Messages", step: "9", tab: 3, color: "bg-violet-600" },
    { component: <BloodDonorScreen />, title: "Blood Network", step: "10", tab: 0, color: "bg-rose-600" },
    { component: <FamilyDashboardScreen />, title: "Family Dashboard", step: "11", tab: 4, color: "bg-violet-600" },
    { component: <OutcomeScreen />, title: "Better Recovery Outcome", step: "12", tab: 3, color: "bg-emerald-500" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 flex flex-col items-center font-sans antialiased selection:bg-violet-500 selection:text-white">
      {/* Dashboard Title Header */}
      <div className="text-center max-w-2xl mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-violet-850 to-indigo-950 bg-clip-text text-transparent">
          Discharge-Buddy App Ecosystem
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">
          Comprehensive patient recovery flow, featuring local blood donor network integration, family circle tracking, and direct caregiver control panel updates.
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300 mb-10 gap-1.5">
        <button 
          onClick={() => setViewMode("grid")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === "grid" ? "bg-violet-600 text-white shadow" : "text-slate-600 hover:text-slate-950"}`}
        >
          Full Flow Grid (PPT Diagram)
        </button>
        <button 
          onClick={() => setViewMode("individual")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === "individual" ? "bg-violet-600 text-white shadow" : "text-slate-600 hover:text-slate-955"}`}
        >
          Individual Mobile Screens
        </button>
      </div>

      {viewMode === "grid" ? (
        /* 2x6 Grid of Screens with Connectors */
        <div className="w-full flex justify-center overflow-visible py-4 min-h-[920px]">
          <div className="scale-[0.66] origin-top shrink-0 -my-[180px] relative grid grid-cols-[280px_32px_280px_32px_280px_32px_280px_32px_280px_32px_280px] gap-y-12 items-start justify-center w-[1840px] px-4 py-8 bg-white rounded-[32px] border border-slate-200/80 shadow-2xl overflow-hidden">
            {/* Row 1 */}
            <DeviceFrame title={screens[0].title} step={screens[0].step} activeTab={screens[0].tab} themeColor={screens[0].color}>{screens[0].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[1].title} step={screens[1].step} activeTab={screens[1].tab} themeColor={screens[1].color}>{screens[1].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[2].title} step={screens[2].step} activeTab={screens[2].tab} themeColor={screens[2].color}>{screens[2].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[3].title} step={screens[3].step} activeTab={screens[3].tab} themeColor={screens[3].color}>{screens[3].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[4].title} step={screens[4].step} activeTab={screens[4].tab} themeColor={screens[4].color}>{screens[4].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[5].title} step={screens[5].step} activeTab={screens[5].tab} themeColor={screens[5].color}>{screens[5].component}</DeviceFrame>

            {/* SVG Connector between rows */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0" style={{ minHeight: '100%' }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8B5CF6" />
                </marker>
              </defs>
              {/* Draw a curved path from step 6 bottom to step 7 top */}
              <path 
                d="M 1684 595 C 1684 660, 156 610, 156 648" 
                fill="none" 
                stroke="#8B5CF6" 
                strokeWidth="3.5" 
                strokeDasharray="6 4"
                markerEnd="url(#arrow)"
              />
            </svg>

            {/* Row 2 */}
            <DeviceFrame title={screens[6].title} step={screens[6].step} activeTab={screens[6].tab} themeColor={screens[6].color}>{screens[6].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[7].title} step={screens[7].step} activeTab={screens[7].tab} themeColor={screens[7].color}>{screens[7].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[8].title} step={screens[8].step} activeTab={screens[8].tab} themeColor={screens[8].color}>{screens[8].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[9].title} step={screens[9].step} activeTab={screens[9].tab} themeColor={screens[9].color}>{screens[9].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[10].title} step={screens[10].step} activeTab={screens[10].tab} themeColor={screens[10].color}>{screens[10].component}</DeviceFrame>
            <FlowArrow />
            <DeviceFrame title={screens[11].title} step={screens[11].step} activeTab={screens[11].tab} themeColor={screens[11].color}>{screens[11].component}</DeviceFrame>
          </div>
        </div>
      ) : (
        /* Individual Mobile Screens view */
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {/* Navigation Bar */}
          <div className="flex justify-between items-center w-full bg-white border border-slate-200 p-3 rounded-2xl shadow-md gap-4">
            <button
              onClick={() => setCurrentScreenIdx((prev) => (prev > 0 ? prev - 1 : screens.length - 1))}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl transition-all border border-slate-200"
            >
              ← Prev
            </button>
            <select
              value={currentScreenIdx}
              onChange={(e) => setCurrentScreenIdx(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none flex-1 text-center"
            >
              {screens.map((scr, idx) => (
                <option key={idx} value={idx}>
                  Step {scr.step}: {scr.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setCurrentScreenIdx((prev) => (prev < screens.length - 1 ? prev + 1 : 0))}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl transition-all border border-slate-200"
            >
              Next →
            </button>
          </div>

          {/* Focused Device Frame */}
          <div className="bg-slate-100/50 p-8 rounded-[48px] border border-slate-200/50 shadow-lg flex justify-center">
            <DeviceFrame 
              title={screens[currentScreenIdx].title} 
              step={screens[currentScreenIdx].step} 
              activeTab={screens[currentScreenIdx].tab} 
              themeColor={screens[currentScreenIdx].color}
            >
              {screens[currentScreenIdx].component}
            </DeviceFrame>
          </div>
        </div>
      )}

      {/* Bottom Footer Info Panel */}
      <div className="mt-16 bg-white border border-slate-200 rounded-2xl p-5 max-w-xl text-center shadow-sm">
        <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-1.5">PPT Assets & Judging Flow</p>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          This mock diagram reflects the live database capabilities: location-based Haversine compatibility matching in <span className="text-rose-600 font-extrabold">Blood Network</span>, caregiver-patient linkages in <span className="text-indigo-600 font-extrabold">Care Control Center</span>, and circular household notifications in <span className="text-violet-600 font-extrabold">Family Circle Hub</span>.
        </p>
      </div>
    </div>
  );
}

export default Preview;
