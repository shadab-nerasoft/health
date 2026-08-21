'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Add,
  Calendar,
  CloseCircle,
  Category,
  Moon,
  Sun1,
  Drop,
  Heart,
  Activity,
  Lamp,
  Trash,
  VolumeHigh,
  VolumeCross,
  Edit2,
} from 'iconsax-react'
import {
  useAlarmStore,
  AlarmItem,
  AlarmCategory,
} from '@/lib/wellness/alarm-store'
import { easeSmooth } from './motion'

interface AlarmModalProps {
  isOpen: boolean
  onClose: () => void
}

const WEEK_DAYS = [
  { num: 1, label: 'Mon' },
  { num: 2, label: 'Tue' },
  { num: 3, label: 'Wed' },
  { num: 4, label: 'Thu' },
  { num: 5, label: 'Fri' },
  { num: 6, label: 'Sat' },
  { num: 0, label: 'Sun' },
]

function AnalogClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return <div className="h-44 w-44 rounded-full bg-white/5 animate-pulse" />

  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours() % 12

  const secDeg = (seconds / 60) * 360
  const minDeg = ((minutes + seconds / 60) / 60) * 360
  const hourDeg = ((hours + minutes / 60) / 12) * 360

  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-[#16151f] shadow-inner">
      {/* Clock ticks */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <div
          key={deg}
          className="absolute h-full w-[2px]"
          style={{ transform: `rotate(${deg}deg)` }}
        >
          <div
            className={`mx-auto ${
              deg % 90 === 0 ? 'h-2.5 w-[3px] bg-purple-400/80' : 'h-1.5 w-[1.5px] bg-white/20'
            }`}
          />
        </div>
      ))}

      {/* Hour Hand */}
      <div
        className="absolute bottom-1/2 left-1/2 h-10 w-1.5 -translate-x-1/2 origin-bottom rounded-full bg-purple-300 shadow-sm"
        style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }}
      />

      {/* Minute Hand */}
      <div
        className="absolute bottom-1/2 left-1/2 h-14 w-1 -translate-x-1/2 origin-bottom rounded-full bg-purple-400 shadow-sm"
        style={{ transform: `translateX(-50%) rotate(${minDeg}deg)` }}
      />

      {/* Second Hand */}
      <div
        className="absolute bottom-1/2 left-1/2 h-16 w-[1.5px] -translate-x-1/2 origin-bottom rounded-full bg-violet-400"
        style={{ transform: `translateX(-50%) rotate(${secDeg}deg)` }}
      />

      {/* Center Pivot Pin */}
      <div className="z-10 h-3.5 w-3.5 rounded-full bg-purple-300 ring-4 ring-purple-500/30" />
    </div>
  )
}

function DigitalClock() {
  const [timeStr, setTimeStr] = useState<{ hours: string; minutes: string }>({
    hours: '08',
    minutes: '40',
  })

  useEffect(() => {
    const update = () => {
      const d = new Date()
      setTimeStr({
        hours: String(d.getHours()).padStart(2, '0'),
        minutes: String(d.getMinutes()).padStart(2, '0'),
      })
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col text-right font-display leading-none">
      <span className="text-6xl font-extrabold text-purple-300 tracking-tight">
        {timeStr.hours}
      </span>
      <span className="text-6xl font-extrabold text-purple-400/70 tracking-tight">
        {timeStr.minutes}
      </span>
    </div>
  )
}

function CategoryIcon({ category }: { category: AlarmCategory }) {
  switch (category) {
    case 'sun':
      return <Sun1 size="22" color="#e9d5ff" variant="Linear" />
    case 'moon':
      return <Moon size="22" color="#e9d5ff" variant="Linear" />
    case 'water':
      return <Drop size="22" color="#e9d5ff" variant="Linear" />
    case 'heart':
      return <Heart size="22" color="#e9d5ff" variant="Linear" />
    case 'activity':
      return <Activity size="22" color="#e9d5ff" variant="Linear" />
    default:
      return <Lamp size="22" color="#e9d5ff" variant="Linear" />
  }
}

export function AlarmModal({ isOpen, onClose }: AlarmModalProps) {
  const { alarms, toggleAlarm, addAlarm, updateAlarm, deleteAlarm } = useAlarmStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null)

  // Alarm form state
  const [newTime, setNewTime] = useState('07:30')
  const [newLabel, setNewLabel] = useState('Morning Run')
  const [newCategory, setNewCategory] = useState<AlarmCategory>('sun')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [soundOn, setSoundOn] = useState(true)

  if (!isOpen) return null

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayIndex = (new Date().getDay() + 6) % 7 // 0 = Mon, ..., 6 = Sun

  const openAddDialog = () => {
    setEditingAlarm(null)
    setNewTime('07:30')
    setNewLabel('Morning Run')
    setNewCategory('sun')
    setSelectedDays([1, 2, 3, 4, 5])
    setSoundOn(true)
    setShowAddDialog(true)
  }

  const openEditDialog = (alarm: AlarmItem) => {
    setEditingAlarm(alarm)
    setNewTime(alarm.time)
    setNewLabel(alarm.label)
    setNewCategory(alarm.category)
    setSelectedDays(alarm.days || [0, 1, 2, 3, 4, 5, 6])
    setSoundOn(alarm.soundEnabled ?? true)
    setShowAddDialog(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTime || !newLabel) return

    if (editingAlarm) {
      updateAlarm(editingAlarm.id, {
        time: newTime,
        label: newLabel,
        category: newCategory,
        days: selectedDays,
        soundEnabled: soundOn,
      })
    } else {
      addAlarm({
        time: newTime,
        label: newLabel,
        category: newCategory,
        enabled: true,
        days: selectedDays,
        soundEnabled: soundOn,
      })
    }
    setShowAddDialog(false)
    setEditingAlarm(null)
  }

  const handleDeleteCurrent = () => {
    if (editingAlarm) {
      deleteAlarm(editingAlarm.id)
      setShowAddDialog(false)
      setEditingAlarm(null)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35, ease: easeSmooth }}
          className="relative w-full max-w-md h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl bg-[#111116] text-white shadow-2xl border border-white/10 flex flex-col overflow-hidden"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">Alarm</h2>
            <div className="flex items-center gap-2">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-300/20 text-purple-200 hover:bg-purple-300/30 transition-all active:scale-95"
                onClick={openAddDialog}
                title="Add Alarm"
              >
                <Category size="20" color="#d8b4fe" variant="Bold" />
              </button>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                onClick={onClose}
                aria-label="Close"
              >
                <CloseCircle size="20" color="#94a3b8" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {/* Clocks Row */}
            <div className="flex items-center justify-between bg-white/[0.03] p-5 rounded-3xl border border-white/5">
              <AnalogClock />
              <DigitalClock />
            </div>

            {/* Timeline / Days Bar */}
            <div className="flex items-center justify-between bg-white/[0.03] p-3 px-4 rounded-2xl border border-white/5">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-300/20 text-purple-200 hover:bg-purple-300/30 transition-all">
                <Calendar size="18" color="#d8b4fe" />
              </button>

              <div className="flex items-center gap-2.5 text-xs">
                {daysOfWeek.map((day, idx) => {
                  const isToday = idx === todayIndex
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className={`text-[11px] ${isToday ? 'text-purple-300 font-bold' : 'text-slate-500'}`}>
                        {10 + idx}
                      </span>
                      <span className={`font-medium ${isToday ? 'text-purple-200 font-bold' : 'text-slate-400'}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="h-1 w-1 rounded-full bg-purple-400" />
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={openAddDialog}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-300 text-slate-950 font-bold shadow-md shadow-purple-500/20 hover:bg-purple-200 active:scale-95 transition-all"
                title="Add New Alarm"
              >
                <Add size="22" color="#111116" variant="Linear" />
              </button>
            </div>

            {/* Alarm Cards Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              {alarms.map((alarm) => (
                <motion.div
                  key={alarm.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative flex flex-col justify-between p-4 min-h-[140px] rounded-3xl border transition-all cursor-pointer ${
                    alarm.enabled
                      ? 'bg-gradient-to-br from-purple-950/40 via-[#1c1b26] to-[#16151f] border-purple-500/30 shadow-lg shadow-purple-950/20'
                      : 'bg-[#16151f]/80 border-white/5 opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => openEditDialog(alarm)}
                >
                  {/* Top row badge & action icons */}
                  <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleAlarm(alarm.id)}
                      className={`flex h-7 px-3 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        alarm.enabled
                          ? 'bg-purple-300 text-slate-950 shadow-sm'
                          : 'border border-white/20 text-slate-400'
                      }`}
                    >
                      {alarm.enabled ? 'ON' : 'OFF'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditDialog(alarm)}
                        className="p-1 text-slate-400 hover:text-purple-300 transition-all"
                        title="Edit Alarm"
                      >
                        <Edit2 size="14" color="#d8b4fe" />
                      </button>
                      <button
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-all"
                        title="Delete Alarm"
                      >
                        <Trash size="14" color="#ef4444" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Text & Time */}
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-400 truncate">
                      {alarm.label}
                    </p>
                    <p className="text-2xl font-bold font-display text-white tracking-tight mt-0.5">
                      {alarm.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Add/Edit Alarm Form Modal Overlay */}
        <AnimatePresence>
          {showAddDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={() => {
                  setShowAddDialog(false)
                  setEditingAlarm(null)
                }}
              />

              <motion.form
                onSubmit={handleSave}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-sm rounded-3xl bg-[#181722] p-6 text-white border border-purple-500/20 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-lg font-bold text-white">
                    {editingAlarm ? 'Edit Alarm' : 'Create New Alarm'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDialog(false)
                      setEditingAlarm(null)
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <CloseCircle size="20" color="#94a3b8" />
                  </button>
                </div>

                {/* Time Picker */}
                <div>
                  <label className="block text-xs font-medium text-purple-300 mb-1">
                    Set Alarm Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-2xl font-bold text-center text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Label Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Alarm Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Morning Workout"
                    required
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Category Icon Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Category Icon
                  </label>
                  <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                    {(['sun', 'moon', 'water', 'heart', 'activity'] as AlarmCategory[]).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`p-2.5 rounded-xl transition-all ${
                            newCategory === cat
                              ? 'bg-purple-500/30 border border-purple-400/50 text-white'
                              : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          <CategoryIcon category={cat} />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Repeat Days Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Repeat Days
                  </label>
                  <div className="flex items-center justify-between gap-1 bg-white/5 p-2 rounded-xl border border-white/5">
                    {WEEK_DAYS.map((day) => {
                      const isSelected = selectedDays.includes(day.num)
                      return (
                        <button
                          key={day.num}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter((d) => d !== day.num))
                            } else {
                              setSelectedDays([...selectedDays, day.num])
                            }
                          }}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-purple-500 text-white shadow-sm'
                              : 'text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {day.label[0]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {soundOn ? (
                      <VolumeHigh size="18" color="#c084fc" />
                    ) : (
                      <VolumeCross size="18" color="#94a3b8" />
                    )}
                    <span>Sound Alarm Chime</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundOn(!soundOn)}
                    className={`h-6 w-11 rounded-full p-1 transition-colors ${
                      soundOn ? 'bg-purple-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-white transition-transform ${
                        soundOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {editingAlarm && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrent}
                      className="py-3 px-3 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm font-semibold flex items-center justify-center gap-1"
                      title="Delete Alarm"
                    >
                      <Trash size="16" color="#ef4444" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDialog(false)
                      setEditingAlarm(null)
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 text-sm font-semibold hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-400 shadow-lg shadow-purple-500/30"
                  >
                    {editingAlarm ? 'Update Alarm' : 'Save Alarm'}
                  </button>
                </div>
              </motion.form>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  )
}

