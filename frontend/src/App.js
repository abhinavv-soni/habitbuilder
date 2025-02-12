import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  FireIcon, 
  PlusIcon, 
  XMarkIcon,
  CalendarIcon,
  TrophyIcon,
  ClockIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import './App.css';

// Custom hook for local storage
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Frequency configurations
const FREQUENCIES = {
  daily: {
    label: 'Daily',
    days: 1
  },
  'alternate-days': {
    label: 'Alternate Days',
    days: 2
  },
  'twice-weekly': {
    label: 'Twice Weekly',
    days: 3.5
  },
  weekly: {
    label: 'Weekly',
    days: 7
  },
  'bi-weekly': {
    label: 'Bi-weekly',
    days: 14
  },
  monthly: {
    label: 'Monthly',
    days: 30
  }
};

// Calendar component
function HeatMap({ completionDates, frequency }) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 27); // Show 4 weeks

  const calendarDays = [];
  const currentDate = new Date(startDate);

  // Fill in any leading empty days
  const startDayOfWeek = startDate.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Fill in the calendar days
  while (currentDate <= today) {
    calendarDays.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const isDateCompleted = (date) => {
    return completionDates.includes(date);
  };

  const monthYear = startDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="w-full max-w-md mx-auto bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-soft">
      <div className="text-lg font-semibold text-gray-800 mb-4 text-center font-display">
        {monthYear}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map(day => (
          <div key={day} className="text-sm text-gray-500 text-center font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((date, index) => (
          <motion.div
            key={date || index}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, delay: index * 0.01 }}
            className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium shadow-sm ${
              date
                ? isDateCompleted(date)
                  ? 'bg-gradient-to-br from-success-400 to-success-500 text-white shadow-success-500/20'
                  : 'bg-white text-gray-700 hover:bg-gray-50 transition-colors'
                : 'bg-transparent'
            }`}
            title={date ? `${date}: ${isDateCompleted(date) ? 'Completed' : 'Not completed'}` : ''}
          >
            {date ? new Date(date).getDate() : ''}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Analytics({ habits }) {
  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      totalHabits: habits.length,
      completedToday: habits.filter(h => h.completion_dates.includes(today)).length,
      longestStreak: 0,
      mostConsistentHabit: null,
      frequencyStats: {}
    };

    // Initialize frequency stats
    Object.keys(FREQUENCIES).forEach(freq => {
      stats.frequencyStats[freq] = {
        count: 0,
        actual: 0,
        expected: 0,
        completionRate: 0
      };
    });

    // Calculate frequency stats and find most consistent habit
    habits.forEach(habit => {
      const freqStats = stats.frequencyStats[habit.frequency];
      freqStats.count++;

      // Calculate completion rate
      const days = FREQUENCIES[habit.frequency].days;
      const expectedCompletions = Math.floor(28 / days); // For 4 weeks
      const actualCompletions = habit.completion_dates.length;

      freqStats.actual += actualCompletions;
      freqStats.expected += expectedCompletions;

      // Update most consistent habit
      const completionRate = (actualCompletions / expectedCompletions) * 100;
      if (!stats.mostConsistentHabit || completionRate > stats.mostConsistentHabit.rate) {
        stats.mostConsistentHabit = {
          name: habit.name,
          frequency: habit.frequency,
          rate: completionRate
        };
      }

      // Calculate longest streak
      let currentStreak = 0;
      let maxStreak = 0;
      const sortedDates = [...habit.completion_dates].sort();
      
      sortedDates.forEach((date, index) => {
        if (index === 0) {
          currentStreak = 1;
        } else {
          const prevDate = new Date(sortedDates[index - 1]);
          const currDate = new Date(date);
          const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= FREQUENCIES[habit.frequency].days) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        }
        maxStreak = Math.max(maxStreak, currentStreak);
      });

      stats.longestStreak = Math.max(stats.longestStreak, maxStreak);
    });

    // Calculate completion rates for each frequency
    Object.keys(stats.frequencyStats).forEach(freq => {
      const freqStats = stats.frequencyStats[freq];
      freqStats.completionRate = freqStats.expected > 0 
        ? (freqStats.actual / freqStats.expected) * 100 
        : 0;
    });

    return stats;
  };

  const stats = calculateStats();

  return (
    <div className="space-y-8">
      <div className="analytics-grid">
        <motion.div
          className="analytics-card card-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-3 text-primary-500">
            <ChartBarIcon className="h-7 w-7" />
            <h3 className="text-lg font-semibold text-gray-800">Total Habits</h3>
          </div>
          <p className="analytics-value text-primary-500">{stats.totalHabits}</p>
          <p className="text-sm text-gray-500 mt-2">Active habits being tracked</p>
        </motion.div>

        <motion.div
          className="analytics-card card-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center space-x-3 text-success-500">
            <CheckCircleIcon className="h-7 w-7" />
            <h3 className="text-lg font-semibold text-gray-800">Completed Today</h3>
          </div>
          <p className="analytics-value text-success-500">{stats.completedToday}</p>
          <p className="text-sm text-gray-500 mt-2">Habits completed today</p>
        </motion.div>

        <motion.div
          className="analytics-card card-gradient"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center space-x-3 text-accent-500">
            <FireIcon className="h-7 w-7" />
            <h3 className="text-lg font-semibold text-gray-800">Longest Streak</h3>
          </div>
          <p className="analytics-value text-accent-500">{stats.longestStreak} days</p>
          <p className="text-sm text-gray-500 mt-2">Your best consistency record</p>
        </motion.div>
      </div>

      {/* Frequency Analysis */}
      <motion.div 
        className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-soft p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h3 className="text-2xl font-semibold text-gray-800 mb-6 font-display">Frequency Analysis</h3>
        <div className="space-y-6">
          {Object.entries(stats.frequencyStats).map(([freq, data], index) => (
            <motion.div 
              key={freq} 
              className="bg-white rounded-xl p-6 shadow-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-5 w-5 text-primary-500" />
                  <span className="font-medium text-gray-800">{FREQUENCIES[freq].label}</span>
                </div>
                <span className="text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-full font-medium">
                  {data.count} habits
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                <motion.div 
                  className="progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${data.completionRate}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span className="font-medium">Completed: {data.actual}/{data.expected}</span>
                <span className="font-medium">{Math.round(data.completionRate)}% completion rate</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Most Consistent Habit */}
      {stats.mostConsistentHabit && (
        <motion.div
          className="bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl shadow-soft p-8 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <TrophyIcon className="h-8 w-8 text-yellow-300" />
            <h3 className="text-2xl font-semibold font-display">Most Consistent Habit</h3>
          </div>
          <div className="text-xl font-medium mb-2">{stats.mostConsistentHabit.name}</div>
          <div className="text-white/80 flex items-center space-x-2">
            <ClockIcon className="h-5 w-5" />
            <span>{FREQUENCIES[stats.mostConsistentHabit.frequency].label} habit</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function App() {
  const [habits, setHabits] = useLocalStorage('habits', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [activeTab, setActiveTab] = useState('habits');
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    completion_dates: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingHabit) {
      setHabits(habits.map(h => 
        h.id === editingHabit.id 
          ? { ...newHabit, id: h.id, completion_dates: h.completion_dates }
          : h
      ));
    } else {
      setHabits([...habits, { ...newHabit, id: Date.now() }]);
    }
    setIsModalOpen(false);
    setEditingHabit(null);
    setNewHabit({
      name: '',
      description: '',
      frequency: 'daily',
      completion_dates: []
    });
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setNewHabit({
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      completion_dates: habit.completion_dates
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const handleComplete = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setHabits(habits.map(habit => {
      if (habit.id === id) {
        const completionDates = new Set(habit.completion_dates);
        if (completionDates.has(today)) {
          completionDates.delete(today);
        } else {
          completionDates.add(today);
        }
        return { ...habit, completion_dates: Array.from(completionDates) };
      }
      return habit;
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="container mx-auto px-4 py-8">
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-display mb-2">
              <span className="text-gradient">Habit Tracker</span>
            </h1>
            <p className="text-gray-600 text-lg max-w-md">
              Build better habits, achieve your goals, and transform your life.
            </p>
          </div>
          <div className="flex space-x-4 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab('habits')}
              className={`nav-tab flex items-center space-x-2 ${activeTab === 'habits' ? 'nav-tab-active' : ''}`}
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Habits</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`nav-tab flex items-center space-x-2 ${activeTab === 'analytics' ? 'nav-tab-active' : ''}`}
            >
              <ArrowTrendingUpIcon className="h-4 w-4" />
              <span>Analytics</span>
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Analytics habits={habits} />
            </motion.div>
          ) : (
            <motion.div
              key="habits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-end mb-8">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Create New Habit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {habits.map(habit => (
                  <motion.div
                    key={habit.id}
                    className="habit-card card-gradient"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2 font-display">{habit.name}</h3>
                        <p className="text-gray-600">{habit.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <motion.button
                          onClick={() => handleEdit(habit)}
                          className="text-gray-400 hover:text-primary-500 transition-colors p-2 hover:bg-primary-50 rounded-lg"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDelete(habit.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </motion.button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex items-center space-x-2 text-gray-600 bg-gray-100/50 px-3 py-1.5 rounded-full text-sm font-medium">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{FREQUENCIES[habit.frequency].label}</span>
                        </span>
                        <motion.button
                          onClick={() => handleComplete(habit.id)}
                          className="text-success-500 hover:text-success-600 transition-colors"
                          title="Mark as completed"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <CheckCircleIcon className="h-8 w-8" />
                        </motion.button>
                      </div>
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

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 font-display mb-2">
                      {editingHabit ? 'Edit Habit' : 'Create New Habit'}
                    </h2>
                    <p className="text-gray-600">
                      {editingHabit ? 'Update your habit details' : 'Start your journey to better habits'}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingHabit(null);
                      setNewHabit({
                        name: '',
                        description: '',
                        frequency: 'daily',
                        completion_dates: []
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </motion.button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Habit Name
                    </label>
                    <input
                      type="text"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Morning Meditation"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      className="input-field"
                      placeholder="What's your motivation for this habit?"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={newHabit.frequency}
                      onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                      className="input-field"
                    >
                      {Object.entries(FREQUENCIES).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <motion.button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingHabit(null);
                        setNewHabit({
                          name: '',
                          description: '',
                          frequency: 'daily',
                          completion_dates: []
                        });
                      }}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button 
                      type="submit" 
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {editingHabit ? 'Save Changes' : 'Create Habit'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;