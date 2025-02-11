import React, { useState, useEffect } from 'react';
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
          <div
            key={date}
            className={`w-4 h-4 rounded-sm ${
              isCompleted
                ? 'bg-green-500'
                : 'bg-gray-200'
            }`}
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Habits</h3>
        <p className="text-3xl font-bold text-blue-500">{stats.totalHabits}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Completed Today</h3>
        <p className="text-3xl font-bold text-green-500">{stats.completedToday}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Longest Streak</h3>
        <p className="text-3xl font-bold text-purple-500">{stats.longestStreak} days</p>
      </div>
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
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Habit Tracker</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('habits')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'habits'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Habits
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <div>
            <Analytics habits={habits} />
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Activity Overview</h2>
              <div className="overflow-x-auto">
                <HeatMap completionDates={habits.flatMap(h => h.completion_dates || [])} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add New Habit
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {habits.map((habit) => (
                <div
                  key={habit._id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{habit.name}</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(habit)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(habit._id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{habit.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Frequency: {habit.frequency}</span>
                    <button
                      onClick={() => handleComplete(habit._id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
                    >
                      Complete
                    </button>
                  </div>
                  <div className="mt-4">
                    <HeatMap completionDates={habit.completion_dates || []} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                {editingHabit ? 'Edit Habit' : 'Add New Habit'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Frequency</label>
                  <select
                    value={newHabit.frequency}
                    onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newHabit.notification}
                      onChange={(e) => setNewHabit({ ...newHabit, notification: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Enable notifications</span>
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
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {editingHabit ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;