import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import api from './api';
import ScanPage from './ScanPage'; // Import ScanPage
import AnomalyPage from './AnomalyPage'; // Import AnomalyPage

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function App() {
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'scan', or 'anomaly'
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPipeline, setSelectedPipeline] = useState('all');
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        if (currentView === 'dashboard') {
            loadDashboardData();
        }
    }, [currentView]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const data = await api.getDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
        setLoading(false);
    };

    const renderContent = () => {
        if (currentView === 'scan') {
            return <ScanPage />;
        }
        if (currentView === 'anomaly') {
            return <AnomalyPage />;
        }

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-slate-400">Loading dashboard...</p>
                    </div>
                </div>
            );
        }

        const { summary, vulnerabilities, pipelineHistory } = dashboardData || {};

        return (
            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <ScoreCard
                        title="Security Score"
                        value={summary?.score || 0}
                        suffix="/100"
                        color={getScoreColor(summary?.score)}
                        icon="🎯"
                    />
                    <ScoreCard
                        title="High Severity"
                        value={summary?.high || 0}
                        color="text-red-400"
                        bgColor="bg-red-500/10"
                        icon="🔴"
                    />
                    <ScoreCard
                        title="Medium Severity"
                        value={summary?.medium || 0}
                        color="text-yellow-400"
                        bgColor="bg-yellow-500/10"
                        icon="🟡"
                    />
                    <ScoreCard
                        title="Low Severity"
                        value={summary?.low || 0}
                        color="text-green-400"
                        bgColor="bg-green-500/10"
                        icon="🟢"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Security Trend */}
                    <div className="lg:col-span-2 glass rounded-2xl p-6 card-hover">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>📈</span> Security Score Trend
                        </h2>
                        <div className="h-64">
                            <SecurityTrendChart data={pipelineHistory} />
                        </div>
                    </div>

                    {/* Vulnerability Distribution */}
                    <div className="glass rounded-2xl p-6 card-hover">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>📊</span> Severity Distribution
                        </h2>
                        <div className="h-64 flex items-center justify-center">
                            <SeverityDonutChart summary={summary} />
                        </div>
                    </div>
                </div>

                {/* Vulnerabilities & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Recent Vulnerabilities */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>⚠️</span> Recent Vulnerabilities
                        </h2>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {vulnerabilities?.vulnerabilities?.slice(0, 5).map((vuln, index) => (
                                <VulnerabilityCard key={index} vuln={vuln} />
                            ))}
                        </div>
                    </div>

                    {/* Alerts Timeline */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>🔔</span> Alerts Timeline
                        </h2>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            <AlertItem
                                time="2 min ago"
                                type="critical"
                                message="SQL Injection detected in api/users.js"
                            />
                            <AlertItem
                                time="15 min ago"
                                type="warning"
                                message="Anomaly detected in build-pipeline"
                            />
                            <AlertItem
                                time="1 hour ago"
                                type="info"
                                message="Security scan completed successfully"
                            />
                            <AlertItem
                                time="3 hours ago"
                                type="success"
                                message="Fix applied: Updated lodash dependency"
                            />
                            <AlertItem
                                time="5 hours ago"
                                type="warning"
                                message="Medium severity issue in staging"
                            />
                        </div>
                    </div>
                </div>

                {/* Fix History */}
                <div className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>🔧</span> Fix History
                    </h2>
                    <div className="h-48">
                        <FixHistoryChart />
                    </div>
                </div>
            </main>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="glass border-b border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                                <span className="text-xl">🛡️</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold gradient-text">SafeOps Dashboard</h1>
                                <p className="text-xs text-slate-400">CI/CD Security Monitor</p>
                            </div>
                        </div>

                        {/* Navigation / Filters */}
                        <div className="flex items-center gap-4">
                            {/* View Switcher */}
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => setCurrentView('dashboard')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'dashboard'
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => setCurrentView('scan')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'scan'
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Scan & Fix
                                </button>
                                <button
                                    onClick={() => setCurrentView('anomaly')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'anomaly'
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Anomaly Lab
                                </button>
                            </div>

                            {currentView === 'dashboard' && (
                                <>
                                    <div className="h-6 w-px bg-slate-700 mx-2"></div>
                                    <button
                                        onClick={loadDashboardData}
                                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <span>↻</span> Refresh
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {renderContent()}

            {/* Footer */}
            <footer className="border-t border-slate-800 py-4 mt-8">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                    SafeOps-LogMiner Dashboard • Last updated: {new Date().toLocaleString()}
                </div>
            </footer>
        </div>
    );
}

// Helper Components
function ScoreCard({ title, value, suffix = '', color = 'text-white', bgColor = 'bg-slate-800/50', icon }) {
    return (
        <div className={`glass rounded-2xl p-5 card-hover ${bgColor}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wide">{title}</span>
            </div>
            <div className={`text-3xl font-bold ${color}`}>
                {value}{suffix}
            </div>
        </div>
    );
}

function VulnerabilityCard({ vuln }) {
    const severityColors = {
        HIGH: 'border-red-500 bg-red-500/10',
        MEDIUM: 'border-yellow-500 bg-yellow-500/10',
        LOW: 'border-green-500 bg-green-500/10'
    };

    const severityBadge = {
        HIGH: 'bg-red-500',
        MEDIUM: 'bg-yellow-500',
        LOW: 'bg-green-500'
    };

    return (
        <div className={`p-3 rounded-lg border-l-4 ${severityColors[vuln.severity]} animate-slide-in`}>
            <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${severityBadge[vuln.severity]} text-white font-medium`}>
                    {vuln.severity}
                </span>
                <span className="text-xs text-slate-400">{vuln.rule_id}</span>
            </div>
            <p className="text-sm text-slate-200">{vuln.description}</p>
            <p className="text-xs text-slate-500 mt-1">{vuln.affected_resource}</p>
        </div>
    );
}

function AlertItem({ time, type, message }) {
    const typeStyles = {
        critical: 'border-red-500 text-red-400',
        warning: 'border-yellow-500 text-yellow-400',
        info: 'border-blue-500 text-blue-400',
        success: 'border-green-500 text-green-400'
    };

    const icons = {
        critical: '🚨',
        warning: '⚠️',
        info: 'ℹ️',
        success: '✅'
    };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border-l-2 ${typeStyles[type]}`}>
            <span>{icons[type]}</span>
            <div className="flex-1">
                <p className="text-sm text-slate-200">{message}</p>
                <p className="text-xs text-slate-500">{time}</p>
            </div>
        </div>
    );
}

// Chart Components
function SecurityTrendChart({ data }) {
    const chartData = {
        labels: data?.map(d => d.date) || ['Jan 14', 'Jan 15', 'Jan 16', 'Jan 17', 'Jan 18', 'Jan 19', 'Jan 20'],
        datasets: [
            {
                label: 'Security Score',
                data: data?.map(d => d.score) || [55, 60, 65, 68, 72, 78, 85],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return <Line data={chartData} options={options} />;
}

function SeverityDonutChart({ summary }) {
    const chartData = {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
            data: [summary?.high || 2, summary?.medium || 2, summary?.low || 1],
            backgroundColor: ['#ef4444', '#eab308', '#22c55e'],
            borderWidth: 0,
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#94a3b8' }
            }
        },
        cutout: '70%'
    };

    return <Doughnut data={chartData} options={options} />;
}

function FixHistoryChart() {
    const chartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Fixes Applied',
                data: [3, 5, 2, 8, 4, 1, 6],
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'New Issues',
                data: [4, 2, 6, 3, 5, 2, 3],
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 1,
                borderRadius: 4,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#94a3b8' }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return <Bar data={chartData} options={options} />;
}

// Helpers
function getScoreColor(score) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
}

export default App;
