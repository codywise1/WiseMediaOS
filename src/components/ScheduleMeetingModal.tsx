import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { clientService, projectService, meetingService, Client, Project, CreateMeeting, Meeting, MeetingType, UserRole } from '../lib/supabase';
import Modal from './Modal';
import { formatToISODate } from '../lib/dateFormat';

interface ScheduleMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    currentUser: { id: string; role: UserRole; name?: string } | null;
    initialDate?: Date;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
    const totalMinutes = index * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export default function ScheduleMeetingModal({
    isOpen,
    onClose,
    onSave,
    currentUser,
    initialDate
}: ScheduleMeetingModalProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        client_id: '',
        project_id: '',
        date: initialDate ? formatToISODate(initialDate) : '',
        time: '09:00', // Default to 9 AM
        duration: 60, // Default 1 hour
        type: 'video' as MeetingType,
        description: '',
        location: ''
    });

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'staff';

    useEffect(() => {
        if (isOpen && isAdmin) {
            loadData();
        }
    }, [isOpen, isAdmin]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [clientsData, projectsData] = await Promise.all([
                clientService.getAll(),
                projectService.getAll()
            ]);
            setClients(clientsData);
            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = formData.client_id
        ? projects.filter(p => p.client_id === formData.client_id)
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || !currentUser) return;

        try {
            setIsSubmitting(true);

            const meetingData: CreateMeeting = {
                title: formData.title,
                client_id: formData.client_id || undefined,
                project_id: formData.project_id || undefined,
                meeting_date: formData.date,
                meeting_time: formData.time,
                duration_minutes: Number(formData.duration),
                type: formData.type,
                status: 'scheduled',
                description: formData.description,
                location: formData.location,
                participants: [
                    {
                        user_id: currentUser.id,
                        name: currentUser.name || 'Host',
                        email: undefined, // Add user email if available
                        role: 'host'
                    }
                ],
                is_recording: false,
                created_by: currentUser.id
            };

            // Add client participant if selected
            if (formData.client_id) {
                const client = clients.find(c => c.id === formData.client_id);
                if (client) {
                    meetingData.participants.push({
                        user_id: client.id, // Using client ID as user ID for now
                        name: client.name,
                        email: client.email,
                        role: 'client'
                    });
                }
            }

            await meetingService.create(meetingData);
            onSave();
            onClose();
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Failed to schedule meeting');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Schedule New Meeting">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Title *</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Project Kickoff"
                        className="form-input w-full px-4 py-3 rounded-lg"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
                        <select
                            name="client_id"
                            value={formData.client_id}
                            onChange={handleChange}
                            className="form-input w-full px-4 py-3 rounded-lg"
                        >
                            <option value="">Select Client (Optional)</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
                        <select
                            name="project_id"
                            value={formData.project_id}
                            onChange={handleChange}
                            disabled={!formData.client_id}
                            className="form-input w-full px-4 py-3 rounded-lg disabled:opacity-50"
                        >
                            <option value="">Select Project (Optional)</option>
                            {filteredProjects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                        <DatePicker
                            selected={formData.date ? new Date(`${formData.date}T00:00:00`) : null}
                            onChange={(date: Date | null) => {
                                if (date) {
                                    setFormData(prev => ({ ...prev, date: formatToISODate(date) }));
                                }
                            }}
                            dateFormat="MMM d, yyyy"
                            placeholderText="Select date"
                            className="form-input w-full px-4 py-3 rounded-lg"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Time *</label>
                        <select
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            className="form-input w-full px-4 py-3 rounded-lg"
                            required
                        >
                            {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                        <select
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            className="form-input w-full px-4 py-3 rounded-lg"
                        >
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">1 hour</option>
                            <option value="90">1.5 hours</option>
                            <option value="120">2 hours</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="form-input w-full px-4 py-3 rounded-lg"
                        >
                            <option value="video">Video Call</option>
                            <option value="phone">Phone Call</option>
                            <option value="in-person">In Person</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Location/Link</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Zoom link or address"
                            className="form-input w-full px-4 py-3 rounded-lg"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Meeting agenda or notes..."
                        className="form-input w-full px-4 py-3 rounded-lg resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary px-6 shrink-glow-button"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary px-6 shrink-glow-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
