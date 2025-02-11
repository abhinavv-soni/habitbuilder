import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartBarIcon, CheckCircleIcon, FireIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import './App.css';

function HeatMap({ completionDates }) {
  const today = new Date();
  const days = Array.from({ length: 365 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  return (
    <div className="grid grid-cols-7 gap-1 overflow-x-auto p-4">
      {days.map((date) => {
        const isCompleted = completionDates.includes(date);
        return (
          <motion.div
            key={date}
            className={`heatmap-cell ${isCompleted ? 'heatmap-cell-completed' : 'heatmap-cell-empty'}`}
            whileHover={{ scale: 1.2 }}
            title={`${date}: ${isCompleted ? 'Completed' : 'Not completed'}`}
          />
        );
      })}
    </div>
  );
}

function Analytics({ habits }) {
  const calculateStats = () => {
    const totalHabits = habits.length;
    const completedToday = habits.filter(habit => 
      habit.completion_dates?.includes(new Date().toISOString().split('T')[0])
    ).length;
    
    const streaks = habits.map(habit => {
      if (!habit.completion_dates) return 0;
      const dates = habit.completion_dates.sort();
      let currentStreak = 0;
      let maxStreak = 0;
      
      for (let i = 0; i < dates.length; i++) {
        if (i === 0 || new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime() === 86400000) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        maxStreak = Math.max(maxStreak, currentStreak);
      }
      return maxStreak;
    });

    const longestStreak = Math.max(...streaks, 0);

    return {
      totalHabits,
      completedToday,
      longestStreak,
    };
  };

  const stats = calculateStats();

  return (
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
  );
}

function App() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    notification: false
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [activeTab, setActiveTab] = useState('habits');

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const response = await fetch('http://localhost:55125/habits');
      const data = await response.json();
      setHabits(data);
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingHabit
        ? `http://localhost:55125/habits/${editingHabit._id}`
        : 'http://localhost:55125/habits';
      
      const method = editingHabit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newHabit),
      });
      
      if (response.ok) {
        setNewHabit({
          name: '',
          description: '',
          frequency: 'daily',
          notification: false
        });
        setIsModalOpen(false);
        setEditingHabit(null);
        fetchHabits();
      }
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:55125/habits/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchHabits();
      }
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setNewHabit({
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      notification: habit.notification
    });
    setIsModalOpen(true);
  };

  const handleComplete = async (id) => {
    try {
      const response = await fetch(`http://localhost:55125/habits/${id}/complete`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchHabits();
      }
    } catch (error) {
      console.error('Error completing habit:', error);
    }
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
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Activity Overview</h2>
                <div className="overflow-x-auto">
                  <HeatMap completionDates={habits.flatMap(h => h.completion_dates || [])} />
                </div>
              </div>
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
                    key={habit._id}
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
                          onClick={() => handleDelete(habit._id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{habit.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span className="capitalize">Frequency: {habit.frequency}</span>
                      <button
                        onClick={() => handleComplete(habit._id)}
                        className="btn-primary py-1.5"
                      >
                        Complete
                      </button>
                    </div>
                    <div className="mt-4">
                      <HeatMap completionDates={habit.completion_dates || []} />
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
                      data-testid="habit-name-input"
                      aria-label="Habit name"
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
                      data-testid="habit-description-input"
                      aria-label="Habit description"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={newHabit.frequency}
                      onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                      className="input-field"
                      data-testid="habit-frequency-select"
                      aria-label="Habit frequency"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={newHabit.notification}
                      onChange={(e) => setNewHabit({ ...newHabit, notification: e.target.checked })}
                      className="checkbox-field"
                    />
                    <label htmlFor="notifications" className="ml-3 text-sm text-gray-700">
                      Enable notifications
                    </label>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingHabit(null);
                        setNewHabit({
                          name: '',
                          description: '',
                          frequency: 'daily',
                          notification: false
                        });
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