import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  FireIcon, 
  PlusIcon, 
  XMarkIcon,
  CalendarIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import './App.css';

// Custom hook for local storage
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
};

const FREQUENCIES = {
  daily: { label: 'Daily', days: 1 },
  'alternate-days': { label: 'Alternate Days', days: 2 },
  'twice-weekly': { label: 'Twice a Week', days: 3.5 },
  weekly: { label: 'Weekly', days: 7 },
  'bi-weekly': { label: 'Bi-weekly', days: 14 },
  monthly: { label: 'Monthly', days: 30 }
};

function HeatMap({ completionDates, frequency }) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(1);
  
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = startDate.getDay();
  
  const calendarDays = Array(firstDayOfWeek).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), i);
    calendarDays.push(date.toISOString().split('T')[0]);
  }

  const isDateCompleted = (date) => {
    if (!date) return false;
    
    const dateObj = new Date(date);
    const isCompleted = completionDates.includes(date);
    
    if (frequency === 'daily') return isCompleted;
    
    if (frequency === 'alternate-days') {
      // Check if any completion in 2-day window
      const twoDaysBefore = new Date(dateObj);
      twoDaysBefore.setDate(dateObj.getDate() - 1);
      return completionDates.some(d => 
        d === date || d === twoDaysBefore.toISOString().split('T')[0]
      );
    }
    
    if (frequency === 'twice-weekly') {
      // Check if we have 2 completions in the week
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const completionsThisWeek = completionDates.filter(d => {
        const date = new Date(d);
        return date >= weekStart && date <= weekEnd;
      });
      
      return completionsThisWeek.length >= 2;
    }
    
    if (frequency === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return completionDates.some(completedDate => {
        const completed = new Date(completedDate);
        return completed >= weekStart && completed <= weekEnd;
      });
    }
    
    if (frequency === 'bi-weekly') {
      const twoWeeksAgo = new Date(dateObj);
      twoWeeksAgo.setDate(dateObj.getDate() - 14);
      return completionDates.some(d => {
        const completedDate = new Date(d);
        return completedDate >= twoWeeksAgo && completedDate <= dateObj;
      });
    }
    
    if (frequency === 'monthly') {
      const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
      return completionDates.some(d => {
        const completedDate = new Date(d);
        return completedDate >= monthStart && completedDate <= monthEnd;
      });
    }
    
    return isCompleted;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const monthYear = new Date(today.getFullYear(), today.getMonth()).toLocaleString('default', { 
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-sm font-semibold text-gray-700 mb-2 text-center">
        {monthYear}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-xs text-gray-500 text-center font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <div
            key={date || index}
            className={`aspect-square flex items-center justify-center rounded-sm text-xs ${
              date
                ? isDateCompleted(date)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700'
                : 'bg-transparent'
            }`}
            title={date ? `${date}: ${isDateCompleted(date) ? 'Completed' : 'Not completed'}` : ''}
          >
            {date ? new Date(date).getDate() : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics({ habits }) {
  const calculateStats = () => {
    const today = new Date();
    const totalHabits = habits.length;
    const completedToday = habits.filter(habit => 
      habit.completion_dates?.includes(today.toISOString().split('T')[0])
    ).length;

    // Calculate completion rates for each frequency
    const frequencyStats = Object.keys(FREQUENCIES).reduce((acc, freq) => {
      const habitsOfFreq = habits.filter(h => h.frequency === freq);
      if (habitsOfFreq.length === 0) return acc;

      const expectedCompletions = Math.floor(30 / FREQUENCIES[freq].days);
      const actualCompletions = habitsOfFreq.reduce((sum, habit) => {
        const lastMonth = habit.completion_dates?.filter(date => {
          const completionDate = new Date(date);
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return completionDate >= monthAgo;
        }).length || 0;
        return sum + lastMonth;
      }, 0);

      const avgCompletions = habitsOfFreq.length > 0 
        ? actualCompletions / habitsOfFreq.length 
        : 0;

      return {
        ...acc,
        [freq]: {
          count: habitsOfFreq.length,
          completionRate: Math.min(100, (avgCompletions / expectedCompletions) * 100),
          expected: expectedCompletions,
          actual: Math.floor(avgCompletions)
        }
      };
    }, {});

    // Calculate streaks
    const streaks = habits.map(habit => {
      if (!habit.completion_dates) return 0;
      const dates = habit.completion_dates.sort();
      let currentStreak = 0;
      let maxStreak = 0;
      const frequency = FREQUENCIES[habit.frequency].days;

      for (let i = 0; i < dates.length; i++) {
        if (i === 0 || 
            (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) <= frequency * 86400000) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        maxStreak = Math.max(maxStreak, currentStreak);
      }
      return maxStreak;
    });

    const longestStreak = Math.max(...streaks, 0);

    // Most consistent habit
    const consistencyScores = habits.map(habit => {
      const expectedInterval = FREQUENCIES[habit.frequency].days * 86400000; // in milliseconds
      if (!habit.completion_dates || habit.completion_dates.length < 2) return 0;

      const dates = habit.completion_dates
        .map(d => new Date(d).getTime())
        .sort((a, b) => a - b);

      const intervals = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(Math.abs(dates[i] - dates[i-1]));
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc, interval) => 
        acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      return {
        habitId: habit.id,
        name: habit.name,
        consistency: 1 / (1 + Math.sqrt(variance) / expectedInterval)
      };
    });

    const mostConsistentHabit = consistencyScores.length > 0 
      ? habits.find(h => h.id === consistencyScores.sort((a, b) => b.consistency - a.consistency)[0].habitId)
      : null;

    return {
      totalHabits,
      completedToday,
      longestStreak,
      frequencyStats,
      mostConsistentHabit
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-8">
      <div className="analytics-grid">
        <motion.div
          className="analytics-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-3 text-primary-500">
            <ChartBarIcon className="h-6 w-6" />
            <h3 className="text-lg font-semibold text-gray-800">Total Habits</h3>
          </div>
          <p className="analytics-value text-primary-500">{stats.totalHabits}</p>
        </motion.div>

        <motion.div
          className="analytics-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center space-x-3 text-green-500">
            <CheckCircleIcon className="h-6 w-6" />
            <h3 className="text-lg font-semibold text-gray-800">Completed Today</h3>
          </div>
          <p className="analytics-value text-green-500">{stats.completedToday}</p>
        </motion.div>

        <motion.div
          className="analytics-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center space-x-3 text-accent-500">
            <FireIcon className="h-6 w-6" />
            <h3 className="text-lg font-semibold text-gray-800">Longest Streak</h3>
          </div>
          <p className="analytics-value text-accent-500">{stats.longestStreak} days</p>
        </motion.div>
      </div>

      {/* Frequency Analysis */}
      <div className="bg-white rounded-2xl shadow-soft p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Frequency Analysis</h3>
        <div className="space-y-4">
          {Object.entries(stats.frequencyStats).map(([freq, data]) => (
            <div key={freq} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">{FREQUENCIES[freq].label}</span>
                <span className="text-sm text-gray-500">{data.count} habits</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${data.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Completed: {data.actual}/{data.expected}</span>
                <span>{Math.round(data.completionRate)}% completion rate</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Consistent Habit */}
      {stats.mostConsistentHabit && (
        <motion.div
          className="bg-white rounded-2xl shadow-soft p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <TrophyIcon className="h-6 w-6 text-yellow-500" />
            <h3 className="text-xl font-semibold text-gray-800">Most Consistent Habit</h3>
          </div>
          <div className="text-lg text-gray-700">{stats.mostConsistentHabit.name}</div>
          <div className="text-sm text-gray-500">
            {FREQUENCIES[stats.mostConsistentHabit.frequency].label} habit
          </div>
        </motion.div>
      )}
    </div>
  );
}

function App() {
  const [habits, setHabits] = useLocalStorage('habits', []);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    completion_dates: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [activeTab, setActiveTab] = useState('habits');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingHabit) {
      setHabits(habits.map(habit => 
        habit.id === editingHabit.id 
          ? { ...newHabit, id: habit.id }
          : habit
      ));
    } else {
      setHabits([...habits, { 
        ...newHabit, 
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      }]);
    }
    
    setNewHabit({
      name: '',
      description: '',
      frequency: 'daily',
      completion_dates: []
    });
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const handleDelete = (id) => {
    setHabits(habits.filter(habit => habit.id !== id));
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setNewHabit({
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      completion_dates: habit.completion_dates || []
    });
    setIsModalOpen(true);
  };

  const handleComplete = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setHabits(habits.map(habit => {
      if (habit.id === id) {
        const completion_dates = habit.completion_dates || [];
        if (!completion_dates.includes(today)) {
          return {
            ...habit,
            completion_dates: [...completion_dates, today]
          };
        }
      }
      return habit;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 font-display">Habit Tracker</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('habits')}
              className={`nav-tab ${activeTab === 'habits' ? 'nav-tab-active' : ''}`}
            >
              Habits
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`nav-tab ${activeTab === 'analytics' ? 'nav-tab-active' : ''}`}
            >
              Analytics
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Analytics habits={habits} />
            </motion.div>
          ) : (
            <motion.div
              key="habits"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add New Habit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {habits.map((habit) => (
                  <motion.div
                    key={habit.id}
                    className="habit-card bg-white rounded-2xl shadow-soft p-6"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">{habit.name}</h2>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(habit)}
                          className="text-primary-500 hover:text-primary-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(habit.id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{habit.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span className="capitalize">
                        {FREQUENCIES[habit.frequency].label}
                      </span>
                      <button
                        onClick={() => handleComplete(habit.id)}
                        className="btn-primary py-1.5"
                      >
                        Complete
                      </button>
                    </div>
                    <div className="mt-4">
                      <HeatMap 
                        completionDates={habit.completion_dates || []} 
                        frequency={habit.frequency} 
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isModalOpen && (
            <div className="modal-backdrop">
              <motion.div
                className="modal-content"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingHabit ? 'Edit Habit' : 'Add New Habit'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingHabit(null);
                    }}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      className="input-field"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={newHabit.frequency}
                      onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                      className="input-field"
                    >
                      {Object.entries(FREQUENCIES).map(([value, { label }]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingHabit(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      {editingHabit ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;